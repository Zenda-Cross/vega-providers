import { ProviderContext, Stream } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";

type Source = {
  id: string;
  size: string;
};

function getStreamTapeUrl(html: string, iframeUrl: string): string {
  const match = html.match(
    /document\.getElementById\(['"]robotlink['"]\)\.innerHTML\s*=\s*['"]([^'"]+)['"]/,
  );
  if (!match?.[1]) return "";

  const link = match[1].replace(/&amp;/g, "&").replace(/\\\//g, "/");
  return new URL(link.startsWith("//") ? `https:${link}` : link, iframeUrl)
    .href;
}

function getEmbeddedLink(data: unknown): string {
  if (typeof data === "object" && data && "link" in data) {
    const link = (data as { link?: unknown }).link;
    return typeof link === "string" ? link : "";
  }
  if (typeof data !== "string") return "";

  try {
    return getEmbeddedLink(JSON.parse(data));
  } catch {
    return "";
  }
}

async function getEmbeddedLinkWithWaf(
  source: Source,
  pageUrl: string,
  providerContext: ProviderContext,
): Promise<string> {
  const { axios, commonHeaders, openWebView } = providerContext;
  const url = `${new URL(pageUrl).origin}/links/go/${source.id}?embed=true`;
  const headers = { ...commonHeaders, Referer: pageUrl };

  try {
    return getEmbeddedLink((await axios.get(url, { headers })).data);
  } catch (error: any) {
    if (error.response?.status !== 403 || !openWebView) throw error;

    const wafResult = await openWebView(url, {
      title: "Solve the captcha below and click done",
      description: "Required to open PrimeWire streaming links.",
      headers,
      waitForCookie: "cf_clearance",
      force: true,
    });
    const embeddedLink = getEmbeddedLink(wafResult.data);
    if (embeddedLink) return embeddedLink;

    return getEmbeddedLink(
      (
        await axios.get(url, {
          headers: {
            ...headers,
            "User-Agent": wafResult.userAgent || headers["User-Agent"],
            Cookie: wafResult.cookies,
          },
        })
      ).data,
    );
  }
}

function getSources(data: string, providerContext: ProviderContext): Source[] {
  const $ = providerContext.cheerio.load(data);
  const sources: Source[] = [];

  $("table.movie_version").each((_, element) => {
    const row = $(element);
    const host = row.find(".version-host").text().trim().toLowerCase();
    const id = row.find(".wp-menu-btn").attr("data-wp-menu");
    const size = row.find(".quality_tag").text().trim();
    if (host.includes("streamtape") && id) sources.push({ id, size });
  });

  return sources;
}

export const getStream = async function ({
  link,
  type,
  providerContext,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, commonHeaders } = providerContext;

  try {
    const baseUrl = await getBaseUrl("primewire");
    const pageUrl = new URL(link, `${baseUrl}/`).href;
    console.log("pwGetStream", type, pageUrl);
    const page = await axios.get(pageUrl, { headers: commonHeaders });
    const streams: Stream[] = [];

    for (const source of getSources(page.data, providerContext)) {
      try {
        const iframeUrl = await getEmbeddedLinkWithWaf(
          source,
          pageUrl,
          providerContext,
        );
        if (!iframeUrl) continue;

        const iframe = await axios.get(iframeUrl, {
          headers: { ...commonHeaders, Referer: pageUrl },
        });
        const streamUrl = getStreamTapeUrl(iframe.data, iframeUrl);
        if (!streamUrl) continue;

        streams.push({
          server: `StreamTape ${source.size}`.trim(),
          link: streamUrl,
          type: "mp4",
          headers: { Referer: iframeUrl },
        });
      } catch (error) {
        console.log(`PrimeWire StreamTape source ${source.id} failed`, error);
      }
    }

    return streams;
  } catch (error) {
    throwProviderError("PrimeWire", "stream", error);
  }
};
