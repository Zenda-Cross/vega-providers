import { hubcloudExtractor } from "../extractors/hubcloud";
import { ProviderContext, Stream } from "../types";

type DownloadPage = {
  data: string;
  url: string;
};

type StreamQuality = NonNullable<Stream["quality"]>;

const dotflixProxyAction = "4020c531ae02b8be9927fed961160ff20b3f81aafa";

function getStreamQuality(label: string): StreamQuality | undefined {
  const resolution = Number(label.match(/\b(\d{3,4})p\b/i)?.[1]);
  if (!resolution) return undefined;
  if (resolution >= 2160) return "2160";
  if (resolution >= 1080) return "1080";
  if (resolution >= 720) return "720";
  if (resolution >= 480) return "480";
  if (resolution >= 360) return "360";
  return undefined;
}

function addQuality(streams: Stream[], quality?: StreamQuality): Stream[] {
  const resolvedQuality =
    quality ||
    streams.reduce<StreamQuality | undefined>(
      (result, stream) =>
        result || getStreamQuality(decodeURIComponent(stream.link)),
      undefined,
    );
  return streams.map((stream) => ({
    ...stream,
    server: resolvedQuality
      ? `${stream.server} ${resolvedQuality}p`
      : stream.server,
    quality: resolvedQuality,
  }));
}

function getDotflixUrl(data: string): string {
  return (
    data.match(/https?:\/\/dotflix\.[^\s"'<>]+\/share\/[a-z\d]+/i)?.[0] || ""
  );
}

function getDotflixSharingCode(value: string): string {
  try {
    const url = new URL(value);
    if (!/^(?:www\.)?dotflix\./i.test(url.hostname)) return "";
    return url.pathname.match(/^\/share\/([a-z\d]+)/i)?.[1] || "";
  } catch {
    return "";
  }
}

function isHubcloudUrl(value: string): boolean {
  try {
    return /(?:^|\.)hubcloud\./i.test(new URL(value).hostname);
  } catch {
    return false;
  }
}

function getDotflixRouterState(sharingCode: string): string {
  return encodeURIComponent(
    JSON.stringify([
      "",
      {
        children: [
          "share",
          {
            children: [
              ["code", sharingCode, "d"],
              { children: ["__PAGE__", {}, null, null] },
              null,
              null,
            ],
          },
          null,
          null,
        ],
      },
      null,
      null,
      true,
    ]),
  );
}

function getServerActionDownloadUrl(data: unknown): string {
  if (typeof data !== "string") return "";
  for (const line of data.split(/\r?\n/)) {
    const value = line.slice(line.indexOf(":") + 1);
    try {
      const payload = JSON.parse(value);
      if (payload?.success && typeof payload.downloadUrl === "string") {
        return payload.downloadUrl;
      }
    } catch {
      continue;
    }
  }
  return "";
}

async function followDownloadLink(
  link: string,
  signal: AbortSignal,
  headers: Record<string, string>,
): Promise<DownloadPage> {
  let currentUrl = link;

  for (let index = 0; index < 5; index += 1) {
    const response = await fetch(currentUrl, {
      headers,
      signal,
      redirect: "manual",
    });
    const location = response.headers.get("location");
    if (location) {
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }
    if (!response.ok) {
      throw new Error(`EonMovies download redirect failed: ${response.status}`);
    }

    const data = await response.text();
    const responseUrl = response.url || currentUrl;
    return {
      data,
      url: getDotflixSharingCode(responseUrl)
        ? responseUrl
        : getDotflixUrl(data) || responseUrl,
    };
  }

  throw new Error("EonMovies download redirect chain exceeded the limit");
}

async function extractDotflixStream(
  link: string,
  signal: AbortSignal,
  headers: Record<string, string>,
  providerContext: ProviderContext,
): Promise<Stream[]> {
  const sharingCode = getDotflixSharingCode(link);
  if (!sharingCode) return [];

  const origin = new URL(link).origin;
  const requestHeaders = { ...headers, Origin: origin, Referer: link };
  const [directResult, proxyResult] = await Promise.allSettled([
    providerContext.axios.post(
      `${origin}/api/extract-download`,
      { sharingCode },
      {
        signal,
        headers: {
          ...requestHeaders,
          "Content-Type": "application/json",
        },
      },
    ),
    providerContext.axios.post(link, JSON.stringify([sharingCode]), {
      signal,
      headers: {
        ...requestHeaders,
        Accept: "text/x-component",
        "Content-Type": "text/plain;charset=UTF-8",
        "Next-Action": dotflixProxyAction,
        "Next-Router-State-Tree": getDotflixRouterState(sharingCode),
      },
    }),
  ]);

  const streams: Stream[] = [];
  if (directResult.status === "fulfilled") {
    const data = directResult.value.data;
    if (data?.success && typeof data.downloadUrl === "string") {
      streams.push({ server: "Dotflix", link: data.downloadUrl, type: "mkv" });
    }
  }
  if (proxyResult.status === "fulfilled") {
    const proxyUrl = getServerActionDownloadUrl(proxyResult.value.data);
    if (proxyUrl && !streams.some((stream) => stream.link === proxyUrl)) {
      streams.push({ server: "Dotflix Proxy", link: proxyUrl, type: "mkv" });
    }
  }
  if (!streams.length) {
    throw new Error("Dotflix did not return a direct or proxy download URL");
  }
  return streams;
}

async function extractDownloadStreams(
  link: string,
  signal: AbortSignal,
  headers: Record<string, string>,
  providerContext: ProviderContext,
  isDownload?: boolean,
): Promise<Stream[]> {
  if (getDotflixSharingCode(link)) {
    return extractDotflixStream(link, signal, headers, providerContext);
  }
  if (isHubcloudUrl(link)) {
    return hubcloudExtractor(
      link,
      signal,
      providerContext.axios,
      providerContext.cheerio,
      { ...headers },
      providerContext,
      isDownload,
      "eonMovies",
    );
  }
  return [];
}

export async function getStream({
  link,
  type,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  const headers = { ...providerContext.commonHeaders };
  const page = await followDownloadLink(link, signal, headers);
  if (getDotflixSharingCode(page.url) || isHubcloudUrl(page.url)) {
    const streams = await extractDownloadStreams(
      page.url,
      signal,
      headers,
      providerContext,
      isDownload,
      "eonMovies",
    );
    return addQuality(streams);
  }

  const $ = providerContext.cheerio.load(page.data);
  const downloadLinks = $(".dl-row a[href*='/dl/']")
    .map((_, element) => {
      const anchor = $(element);
      const row = anchor.closest(".dl-row");
      const label =
        row.attr("data-dlname") ||
        row.find(".dl-row-name").text().replace(/\s+/g, " ").trim();
      return {
        link: new URL(anchor.attr("href") || "", page.url).href,
        quality: getStreamQuality(label),
      };
    })
    .get();
  if (!downloadLinks.length) {
    throw new Error(
      `EonMovies did not redirect to Dotflix or HubCloud: ${page.url}`,
    );
  }

  const streams: Stream[] = [];
  const seen = new Set<string>();
  for (const downloadLink of downloadLinks) {
    const downloadPage = await followDownloadLink(
      downloadLink.link,
      signal,
      headers,
    );
    if (
      !getDotflixSharingCode(downloadPage.url) &&
      !isHubcloudUrl(downloadPage.url)
    ) {
      continue;
    }

    const extracted = await extractDownloadStreams(
      downloadPage.url,
      signal,
      headers,
      providerContext,
      isDownload,
      "eonMovies",
    );
    addQuality(extracted, downloadLink.quality).forEach((stream) => {
      if (!seen.has(stream.link)) {
        seen.add(stream.link);
        streams.push(stream);
      }
    });
  }

  return streams;
}
