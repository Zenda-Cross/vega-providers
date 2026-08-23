import { gofileExtractor } from "../extractors/gofile";
import { gdflixExtractor } from "../extractors/gdflix";
import { hubcloudExtractor } from "../extractors/hubcloud";
import { ProviderContext, Stream } from "../types";
import { getViewCrateLinks } from "./links";
import { getMkvDramaPage, getMkvDramaUrl, mkvDramaHeaders } from "./request";

function directStream(link: string, referer: string): Stream[] {
  const extension = new URL(link).pathname.split(".").pop()?.toLowerCase();
  if (!extension || !["mp4", "m3u8", "mpd"].includes(extension)) return [];
  return [
    {
      server: new URL(link).hostname,
      link,
      type: extension === "m3u8" ? "m3u8" : extension === "mpd" ? "mpd" : "mp4",
      headers: { Referer: referer },
    },
  ];
}

function pixelDrainStream(link: string): Stream[] {
  const url = new URL(link);
  const parts = url.pathname.split("/").filter(Boolean);
  const id =
    parts[0] === "u" || parts[0] === "l" ? parts[1] : parts[parts.length - 1];
  if (!id) return [];
  return [
    {
      server: "PixelDrain",
      link: `https://pixeldrain.com/api/file/${id}`,
      type: "mkv",
    },
  ];
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
  const baseUrl = await getMkvDramaUrl("/");
  let target = link;

  if (new URL(link, baseUrl).hostname.endsWith("mkvdrama.net")) {
    const page = await getMkvDramaPage(link, providerContext);
    target = (await getViewCrateLinks(page, providerContext))[0]?.link || "";
    if (!target) return [];
  }

  const direct = directStream(target, baseUrl);
  if (direct.length) return direct;

  const hostname = new URL(target).hostname.toLowerCase();
  const { axios, cheerio, commonHeaders } = providerContext;
  const headers = { ...commonHeaders, ...mkvDramaHeaders, Referer: baseUrl };
  if (/pixeldrain\./.test(hostname)) return pixelDrainStream(target);
  if (/gofile\.io/.test(hostname)) {
    const id = new URL(target).pathname.split("/").filter(Boolean).pop();
    if (!id) return [];
    const result = await gofileExtractor(id, axios, providerContext);
    if (!result?.link || !result?.token) return [];
    return [
      {
        server: "GoFile",
        link: result.link,
        type: "mkv",
        headers: {
          Referer: "https://gofile.io/",
          Cookie: `accountToken=${result.token}`,
        },
      },
    ];
  }
  if (/gdflix|gdlink|new1\.filesdl/.test(hostname)) {
    return gdflixExtractor(
      target,
      signal,
      axios,
      cheerio,
      headers,
      providerContext,
    );
  }
  if (/hubcloud|hubdrive|vcloud|cloud/.test(hostname)) {
    return hubcloudExtractor(
      target,
      signal,
      axios,
      cheerio,
      headers,
      providerContext,
      isDownload,
      "mkvDrama",
    );
  }

  return [
    {
      server: hostname,
      link: target,
      type: "mp4",
      headers: { Referer: baseUrl },
    },
  ];
}
