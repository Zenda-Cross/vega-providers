import { ProviderContext, Stream } from "../types";
import { hubcloudExtractor } from "../extractors/hubcloud";
import { throwProviderError } from "../providerErrors";

const PROVIDER_NAME = "ExtraFlix";
const MAX_DEPTH = 8;
const MEDIA_EXTENSION = /\.(m3u8|mp4|mkv|webm|avi|mov)$/i;

type PageLink = {
  href: string;
  quality?: string;
};

type ResolveState = {
  axios: ProviderContext["axios"];
  cheerio: ProviderContext["cheerio"];
  headers: Record<string, string>;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
  streams: Stream[];
  seenStreams: Set<string>;
  visitedPages: Set<string>;
  sawGatedHub: boolean;
};

function normalizeText(value: string | undefined | null): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function absoluteUrl(value: string | undefined, baseUrl?: string): string {
  if (!value) return "";
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return "";
  }
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return "";
  }
}

function qualityFromText(value: string | undefined | null): string | undefined {
  const match = normalizeText(value).match(/\b(2160|1440|1080|720|480|360)p\b/i);
  return match ? match[1] : undefined;
}

function qualityFromUrl(url: string): string | undefined {
  let decoded = url;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    decoded = url;
  }
  return qualityFromText(decoded);
}

function mediaExtension(url: string): string {
  const match = pathOf(url).match(MEDIA_EXTENSION);
  return match ? match[1].toLowerCase() : "";
}

function isDirectMedia(url: string): boolean {
  if (mediaExtension(url)) return true;

  const host = hostOf(url);
  const path = pathOf(url);
  return (
    host.endsWith(".r2.cloudflarestorage.com") ||
    host === "video-downloads.googleusercontent.com" ||
    (host.includes("pixeldrain") && path.includes("/api/file/"))
  );
}

function isArchivePage(url: string): boolean {
  return (
    hostOf(url).includes("linkshub") &&
    /\/archives\/\d+\/?$/i.test(pathOf(url))
  );
}

function isLinkshubView(url: string): boolean {
  return hostOf(url).includes("linkshub") && pathOf(url).includes("/view/");
}

function isHubcloudDrive(url: string): boolean {
  return hostOf(url).includes("hubcloud") && pathOf(url).includes("/drive/");
}

function isHubdrive(url: string): boolean {
  return (
    hostOf(url).includes("hubdrive") &&
    pathOf(url).includes("/file/") &&
    !pathOf(url).includes("/cdn-cgi/")
  );
}

function isGatedHubdrive(url: string): boolean {
  return (
    hostOf(url).includes("drivehub") &&
    pathOf(url).includes("/file/") &&
    !pathOf(url).includes("/cdn-cgi/")
  );
}

function isDownloadTarget(url: string): boolean {
  return (
    isHubdrive(url) ||
    isGatedHubdrive(url) ||
    isHubcloudDrive(url) ||
    isDirectMedia(url)
  );
}

function isFollowable(url: string): boolean {
  return isArchivePage(url) || isLinkshubView(url) || isDownloadTarget(url);
}

function directServerName(url: string): string {
  const host = hostOf(url);
  if (host.endsWith(".r2.cloudflarestorage.com")) return "CF Storage";
  if (host.includes("pixeldrain")) return "Pixeldrain";
  if (host === "video-downloads.googleusercontent.com") return "GDrive";
  return "Direct";
}

function addStream(state: ResolveState, stream: Stream): void {
  if (!stream?.link || !isHttpUrl(stream.link)) return;

  const key = `${stream.server}|${stream.link}`;
  if (state.seenStreams.has(key)) return;
  state.seenStreams.add(key);

  state.streams.push({
    ...stream,
    type: stream.type || mediaExtension(stream.link) || "video",
    quality: stream.quality || qualityFromUrl(stream.link),
  });
}

function collectPageLinks(
  state: ResolveState,
  $: any,
  pageUrl: string,
  pageQuality?: string,
): PageLink[] {
  const candidates: PageLink[] = [];
  const seen = new Set<string>();
  let pendingQuality: string | undefined;

  const add = (
    rawHref: string | undefined,
    quality?: string,
    allowPageLinks = false,
  ) => {
    const href = absoluteUrl(rawHref, pageUrl);
    if (!href || !isHttpUrl(href) || seen.has(href)) return;

    // Never follow archive or prev/next page navigation inside quality rows;
    // archive pages may still surface the per-episode view links their files use.
    const allowed = allowPageLinks
      ? isLinkshubView(href) || isDownloadTarget(href)
      : isDownloadTarget(href);
    if (!allowed) return;

    seen.add(href);
    candidates.push({ href, quality: quality || pageQuality });
  };

  // Quality rows pair a label paragraph with the download button that follows it.
  $(".entry-content p, .entry-content h3, .entry-content h4").each(
    (_: number, element: any) => {
      const row = $(element);
      const anchor = row.find("a[href]").first();
      if (anchor.length) {
        const label = normalizeText(row.clone().find("a").remove().end().text());
        add(
          anchor.attr("href"),
          qualityFromText(label) || pendingQuality,
          isArchivePage(pageUrl),
        );
        pendingQuality = undefined;
        return;
      }

      const parsed = qualityFromText(row.text());
      if (parsed) pendingQuality = parsed;
    },
  );

  // Episode archives also link to the previous/next shows; only keep their rows.
  if (isArchivePage(pageUrl)) return candidates;

  // Remaining links cover pages whose markup is not split into rows.
  $("a[href]").each((_: number, element: any) => {
    const anchor = $(element);
    const label = normalizeText(
      anchor.closest("p").prevAll("p, h3, h4").first().text() ||
        anchor.closest("p").clone().find("a").remove().end().text() ||
        anchor.text(),
    );
    add(anchor.attr("href"), qualityFromText(label));
  });

  return candidates;
}

async function resolveUrl(
  rawUrl: string,
  state: ResolveState,
  depth: number,
  qualityHint?: string,
): Promise<void> {
  const url = absoluteUrl(rawUrl);
  if (!url || !isHttpUrl(url) || depth > MAX_DEPTH) return;

  if (isDirectMedia(url)) {
    addStream(state, {
      server: directServerName(url),
      link: url,
      type: mediaExtension(url) || "video",
      quality: qualityHint || qualityFromUrl(url),
    });
    return;
  }

  if (isGatedHubdrive(url)) {
    // Access behind this host requires an interactive challenge; do not attempt it.
    state.sawGatedHub = true;
    return;
  }

  if (isHubcloudDrive(url)) {
    if (state.visitedPages.has(url)) return;
    state.visitedPages.add(url);

    const streams = await hubcloudExtractor(
      url,
      state.signal as AbortSignal,
      state.axios,
      state.cheerio,
      { ...state.headers },
      state.providerContext,
      state.isDownload,
      "extraflix",
    );

    for (const stream of streams || []) {
      addStream(state, {
        ...stream,
        quality:
          stream.quality || qualityHint || qualityFromUrl(String(stream.link)),
      });
    }
    return;
  }

  if (!isFollowable(url) || state.visitedPages.has(url)) return;
  state.visitedPages.add(url);

  const response = await state.axios.get(url, {
    headers: {
      ...state.headers,
      Referer: `${new URL(url).origin}/`,
    },
    signal: state.signal,
  });

  const $ = state.cheerio.load(response.data);
  const pageQuality =
    qualityHint ||
    qualityFromText($("title").first().text()) ||
    qualityFromText($("h1").first().text());

  for (const candidate of collectPageLinks(state, $, url, pageQuality)) {
    await resolveUrl(candidate.href, state, depth + 1, candidate.quality);
  }
}

export const getStream = async function ({
  link,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  try {
    const { axios, cheerio, commonHeaders } = providerContext;
    const state: ResolveState = {
      axios,
      cheerio,
      headers: { ...commonHeaders },
      signal,
      providerContext,
      isDownload,
      streams: [],
      seenStreams: new Set<string>(),
      visitedPages: new Set<string>(),
      sawGatedHub: false,
    };

    await resolveUrl(link, state, 0);

    if (!state.streams.length) {
      if (state.sawGatedHub) {
        throw new Error(
          "the only available server requires an interactive browser verification this provider does not bypass",
        );
      }
      throw new Error(`no playable streams found for ${link}`);
    }

    return state.streams;
  } catch (error) {
    throwProviderError(PROVIDER_NAME, "stream", error);
  }
};
