import { hubcloudExtractor } from "../extractors/hubcloud";
import { ProviderContext, Stream } from "../types";

type DownloadPage = {
  data: string;
  url: string;
};

type StreamQuality = NonNullable<Stream["quality"]>;

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

function getHubcloudUrl(data: string): string {
  const driveUrl = data.match(
    /https?:\/\/hubcloud\.[^\s"']+\/drive\/[a-z\d]+/i,
  )?.[0];
  if (driveUrl) return driveUrl;

  const driveId = data.match(/[?&]host=hubcloud&(?:amp;)?id=([a-z\d]+)/i)?.[1];
  return driveId ? `https://hubcloud.cx/drive/${driveId}` : "";
}

function isHubcloudUrl(value: string): boolean {
  try {
    return /hubcloud\./i.test(new URL(value).hostname);
  } catch {
    return false;
  }
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
      url: isHubcloudUrl(responseUrl)
        ? responseUrl
        : getHubcloudUrl(data) || responseUrl,
    };
  }

  throw new Error("EonMovies download redirect chain exceeded the limit");
}

async function extractHubcloudStreams(
  link: string,
  signal: AbortSignal,
  headers: Record<string, string>,
  providerContext: ProviderContext,
): Promise<Stream[]> {
  return hubcloudExtractor(
    link,
    signal,
    providerContext.axios,
    providerContext.cheerio,
    { ...headers },
  );
}

export async function getStream({
  link,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const headers = { ...providerContext.commonHeaders };
  const page = await followDownloadLink(link, signal, headers);
  if (isHubcloudUrl(page.url)) {
    const streams = await extractHubcloudStreams(
      page.url,
      signal,
      headers,
      providerContext,
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
    throw new Error(`EonMovies did not redirect to HubCloud: ${page.url}`);
  }

  const streams: Stream[] = [];
  const seen = new Set<string>();
  for (const downloadLink of downloadLinks) {
    const downloadPage = await followDownloadLink(
      downloadLink.link,
      signal,
      headers,
    );
    if (!isHubcloudUrl(downloadPage.url)) continue;

    const extracted = await extractHubcloudStreams(
      downloadPage.url,
      signal,
      headers,
      providerContext,
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
