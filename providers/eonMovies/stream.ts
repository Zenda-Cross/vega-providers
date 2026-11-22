import { hubcloudExtractor } from "../extractors/hubcloud";
import { ProviderContext, Stream } from "../types";

type DownloadPage = {
  data: string;
  url: string;
};

type StreamQuality = NonNullable<Stream["quality"]>;

let cachedProxyAction = "40be6d9fdcc81dd69cf943cccce3e8fcf190219950";
let cachedDriveAction = "40e5348909ff78510ee46337a237c1352fcc630ad2";

function getStreamQuality(label: string): StreamQuality | undefined {
  const resolution = label.match(/(?:^|[^0-9])(\d{3,4})p(?=$|[^a-z0-9])/i)?.[1];
  if (resolution) return String(Number(resolution));
  return /\b4k\b/i.test(label) ? "2160" : undefined;
}

function addQuality(streams: Stream[], quality?: StreamQuality): Stream[] {
  const resolvedQuality =
    quality ||
    streams.reduce<StreamQuality | undefined>(
      (result, stream) =>
        result || stream.quality || getStreamQuality(stream.link),
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
    data.match(
      /https?:\/\/(?:[a-z\d-]+\.)*(?:dotflix|dtflix)\.[a-z\d.]+\/share\/[a-z\d]+/i,
    )?.[0] || ""
  );
}

function getDotflixSharingCode(value: string): string {
  try {
    const url = new URL(value);
    if (!/(?:^|\.)(?:dotflix|dtflix)\./i.test(url.hostname)) return "";
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

function getServerActionDriveUrl(data: unknown): string {
  if (typeof data !== "string") return "";
  for (const line of data.split(/\r?\n/)) {
    const value = line.slice(line.indexOf(":") + 1);
    try {
      const payload = JSON.parse(value);
      if (payload?.success && typeof payload.driveUrl === "string") {
        return payload.driveUrl;
      }
    } catch {
      continue;
    }
  }
  return "";
}

async function callDotflixServerAction(
  link: string,
  actionId: string,
  sharingCode: string,
  signal: AbortSignal | undefined,
  requestHeaders: Record<string, string>,
  providerContext: ProviderContext,
) {
  return providerContext.axios.post(link, JSON.stringify([sharingCode]), {
    signal,
    headers: {
      ...requestHeaders,
      Accept: "text/x-component",
      "Content-Type": "text/plain;charset=UTF-8",
      "Next-Action": actionId,
      "Next-Router-State-Tree": getDotflixRouterState(sharingCode),
    },
  });
}

async function resolveDotflixWorkerUrl(
  driveUrl: string,
  signal: AbortSignal | undefined,
  providerContext: ProviderContext,
): Promise<string> {
  try {
    const res = await providerContext.axios.post(
      "https://dotflix.pobmovie0301.workers.dev/api/generate-link",
      { driveUrl },
      {
        signal,
        headers: { "Content-Type": "application/json" },
      },
    );
    if (res.data?.success && typeof res.data.workerUrl === "string") {
      return res.data.workerUrl;
    }
  } catch {}
  return "";
}

async function resolveDotflixActionsFromPage(
  link: string,
  signal: AbortSignal | undefined,
  headers: Record<string, string>,
  providerContext: ProviderContext,
): Promise<{
  proxyAction?: string;
  driveAction?: string;
  initialShareData?: any;
}> {
  try {
    const origin = new URL(link).origin;
    const res = await providerContext.axios.get(link, {
      signal,
      headers: { ...headers, Referer: link },
    });
    const html = typeof res.data === "string" ? res.data : "";
    if (!html) return {};

    let initialShareData: any = null;
    const shareDataMatch = html.match(/"initialShareData":\s*(\{[^}]+\})/);
    if (shareDataMatch) {
      try {
        initialShareData = JSON.parse(shareDataMatch[1]);
      } catch {}
    }

    const chunkMatches = [
      ...html.matchAll(/src="([^"]*\/static\/chunks\/[^"]+\.js)"/g),
    ].map((m) => m[1]);
    if (!chunkMatches.length) return { initialShareData };

    const chunkResponses = await Promise.allSettled(
      chunkMatches.map((src) => {
        const chunkUrl = src.startsWith("http") ? src : origin + src;
        return providerContext.axios.get(chunkUrl, {
          signal,
          headers: { ...headers, Referer: link },
        });
      }),
    );

    let proxyAction: string | undefined;
    let driveAction: string | undefined;
    const secondLevelChunks = new Set<string>();

    for (const r of chunkResponses) {
      if (r.status !== "fulfilled") continue;
      const text = typeof r.value.data === "string" ? r.value.data : "";
      if (!text) continue;

      if (!proxyAction) {
        const m = text.match(
          /createServerReference\)\("([a-f0-9]+)",[^)]*?"resolveProxyDownload"\)/,
        );
        if (m) proxyAction = m[1];
      }
      if (!driveAction) {
        const m = text.match(
          /createServerReference\)\("([a-f0-9]+)",[^)]*?"getDriveUrl"\)/,
        );
        if (m) driveAction = m[1];
      }

      const dynMatches = [
        ...text.matchAll(/static\/chunks\/[a-zA-Z0-9_\-\.]+\.js/g),
      ].map((m) => m[0]);
      for (const d of dynMatches) {
        secondLevelChunks.add("/_next/" + d);
      }
    }

    if ((!proxyAction || !driveAction) && secondLevelChunks.size > 0) {
      const dynResponses = await Promise.allSettled(
        [...secondLevelChunks].map((src) => {
          const chunkUrl = src.startsWith("http") ? src : origin + src;
          return providerContext.axios.get(chunkUrl, {
            signal,
            headers: { ...headers, Referer: link },
          });
        }),
      );

      for (const r of dynResponses) {
        if (r.status !== "fulfilled") continue;
        const text = typeof r.value.data === "string" ? r.value.data : "";
        if (!text) continue;

        if (!proxyAction) {
          const m = text.match(
            /createServerReference\)\("([a-f0-9]+)",[^)]*?"resolveProxyDownload"\)/,
          );
          if (m) proxyAction = m[1];
        }
        if (!driveAction) {
          const m = text.match(
            /createServerReference\)\("([a-f0-9]+)",[^)]*?"getDriveUrl"\)/,
          );
          if (m) driveAction = m[1];
        }
      }
    }

    return { proxyAction, driveAction, initialShareData };
  } catch {
    return {};
  }
}

async function followDownloadLink(
  link: string,
  signal: AbortSignal | undefined,
  headers: Record<string, string>,
  providerContext: ProviderContext,
): Promise<DownloadPage> {
  let currentUrl = link;

  for (let index = 0; index < 5; index += 1) {
    let location: string | null = null;
    let data = "";
    let responseUrl = currentUrl;

    const res = await providerContext.axios.get(currentUrl, {
      headers,
      signal,
      timeout: 15000,
      maxRedirects: 0,
      validateStatus: (status: number) => status >= 200 && status < 400,
    });
    location = res.headers?.location || res.headers?.Location || null;
    if (!location) {
      data = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
      responseUrl = res.request?.responseURL || res.request?.res?.responseUrl || currentUrl;
    }

    if (location) {
      currentUrl = new URL(location, currentUrl).href;
      if (getDotflixSharingCode(currentUrl) || isHubcloudUrl(currentUrl)) {
        return { data: "", url: currentUrl };
      }
      continue;
    }

    return {
      data,
      url: getDotflixSharingCode(responseUrl)
        ? responseUrl
        : getDotflixUrl(data) || responseUrl,
    };
  }

  throw new Error("EonMovies download redirect chain exceeded the limit");
}

async function resolveDotflixShareUrl(
  link: string,
  signal: AbortSignal | undefined,
  headers: Record<string, string>,
  providerContext: ProviderContext,
): Promise<string> {
  const sharingCode = getDotflixSharingCode(link);
  const visited = new Set<string>();
  let currentUrl = link;
  for (let hop = 0; hop < 5; hop++) {
    if (visited.has(currentUrl)) throw new Error("Dotflix share redirect loop");
    visited.add(currentUrl);
    const response = await providerContext.axios.get(currentUrl, {
      signal,
      headers: { ...headers, Referer: currentUrl },
      timeout: 15000,
      maxRedirects: 0,
      validateStatus: (status: number) => status >= 200 && status < 400,
    });
    const location = response.headers?.location || response.headers?.Location;
    // Some app transports follow redirects internally despite maxRedirects.
    const finalUrl = response.request?.responseURL || response.request?.res?.responseUrl;
    const target = location ? new URL(location, currentUrl).href : finalUrl || currentUrl;
    if (getDotflixSharingCode(target) !== sharingCode) {
      throw new Error("Dotflix redirected away from the requested share");
    }
    if (!location) return target;
    currentUrl = target;
  }
  throw new Error("Dotflix share redirect chain exceeded the limit");
}

async function extractDotflixStream(
  link: string,
  signal: AbortSignal | undefined,
  headers: Record<string, string>,
  providerContext: ProviderContext,
  isDownload?: boolean,
): Promise<Stream[]> {
  const sharingCode = getDotflixSharingCode(link);
  if (!sharingCode) return [];

  // A 301/302 on an API POST can change its method to GET. Resolve the
  // share's canonical host first, then send POSTs directly to that host.
  link = await resolveDotflixShareUrl(link, signal, headers, providerContext);
  const origin = new URL(link).origin;
  const requestHeaders = { ...headers, Origin: origin, Referer: link };

  const kv = providerContext.kvStore;
  let proxyAction =
    (await kv?.get<string>("dotflix_proxy_action")) || cachedProxyAction;
  let driveAction =
    (await kv?.get<string>("dotflix_drive_action")) || cachedDriveAction;

  const streams: Stream[] = [];
  const seenLinks = new Set<string>();
  let mediaType = "mkv";
  let fileQuality: StreamQuality | undefined;

  const addStream = (server: string, streamUrl: string) => {
    if (!streamUrl || seenLinks.has(streamUrl)) return;
    seenLinks.add(streamUrl);
    const isZip = /\.zip(\?|$)/i.test(streamUrl);
    streams.push({
      server,
      link: streamUrl,
      type: isZip ? "zip" : mediaType,
      quality: fileQuality,
    });
  };

  const sortStreams = () => {
    const priority = (stream: Stream) => {
      if (isDownload) return /Quick Download|Proxy|Direct/.test(stream.server) ? 0 : 1;
      return /Direct|Worker/.test(stream.server) ? 0 : 1;
    };
    return streams.sort((a, b) => priority(a) - priority(b));
  };

  // Current Dotflix builds expose JSON download APIs instead of the old
  // deployment-specific Next.js server actions. Keep those as a fallback.
  const [resumeRes, quickRes, statusRes] = await Promise.allSettled([
    providerContext.axios.post(`${origin}/api/generate-direct-drive-download`, { sharingCode }, {
      signal, headers: { ...requestHeaders, "Content-Type": "application/json" }, timeout: 15000,
    }),
    providerContext.axios.post(`${origin}/api/generate-quick-download`, { sharingCode }, {
      signal, headers: { ...requestHeaders, "Content-Type": "application/json" }, timeout: 15000,
    }),
    providerContext.axios.get(`${origin}/api/share-status/${sharingCode}`, {
      signal, headers: requestHeaders, timeout: 10000,
    }),
  ]);
  if (statusRes.status === "fulfilled") {
    const file = statusRes.value.data?.data;
    fileQuality = getStreamQuality(String(file?.filename || ""));
    const extension = String(file?.fileType || file?.filename?.split(".").pop() || "").toLowerCase();
    if (["zip", "mp4", "mkv", "m3u8"].includes(extension)) mediaType = extension;
  }
  for (const [result, name] of [[resumeRes, "Dotflix Direct Resume"], [quickRes, "Dotflix Quick Download"]] as const) {
    if (result.status === "fulfilled" && result.value.data?.success && typeof result.value.data.workerUrl === "string") {
      addStream(name, result.value.data.workerUrl);
    }
  }
  if (streams.length) return sortStreams();

  const [directRes, cfRes, proxyRes, driveRes] = await Promise.allSettled([
    providerContext.axios.post(
      `${origin}/api/extract-download`,
      { sharingCode },
      {
        signal,
        headers: { ...requestHeaders, "Content-Type": "application/json" },
      },
    ),
    providerContext.axios.get(
      `${origin}/api/secure-cloudflare-url/${sharingCode}`,
      {
        signal,
        headers: { ...requestHeaders, Referer: link },
      },
    ),
    callDotflixServerAction(
      link,
      proxyAction,
      sharingCode,
      signal,
      requestHeaders,
      providerContext,
    ),
    callDotflixServerAction(
      link,
      driveAction,
      sharingCode,
      signal,
      requestHeaders,
      providerContext,
    ),
  ]);

  if (
    directRes.status === "fulfilled" &&
    directRes.value.data?.success &&
    typeof directRes.value.data.downloadUrl === "string"
  ) {
    addStream("Dotflix Direct", directRes.value.data.downloadUrl);
  }

  if (
    cfRes.status === "fulfilled" &&
    cfRes.value.data?.success &&
    typeof cfRes.value.data.downloadUrl === "string"
  ) {
    addStream("Dotflix (Cloudflare)", cfRes.value.data.downloadUrl);
  }

  let proxyUrl =
    proxyRes.status === "fulfilled"
      ? getServerActionDownloadUrl(proxyRes.value.data)
      : "";
  if (proxyUrl) {
    addStream("Dotflix Proxy", proxyUrl);
  }

  let driveUrl =
    driveRes.status === "fulfilled"
      ? getServerActionDriveUrl(driveRes.value.data)
      : "";
  if (driveUrl) {
    const workerUrl = await resolveDotflixWorkerUrl(
      driveUrl,
      signal,
      providerContext,
    );
    if (workerUrl) {
      addStream("Dotflix Worker", workerUrl);
    }
  }

  // Fallback: If no server action worked, dynamically find actions from Next.js chunks
  if (!proxyUrl && !driveUrl) {
    const resolved = await resolveDotflixActionsFromPage(
      link,
      signal,
      headers,
      providerContext,
    );
    let retryNeeded = false;
    if (resolved.proxyAction && resolved.proxyAction !== proxyAction) {
      proxyAction = resolved.proxyAction;
      cachedProxyAction = proxyAction;
      await kv?.set("dotflix_proxy_action", proxyAction);
      retryNeeded = true;
    }
    if (resolved.driveAction && resolved.driveAction !== driveAction) {
      driveAction = resolved.driveAction;
      cachedDriveAction = driveAction;
      await kv?.set("dotflix_drive_action", driveAction);
      retryNeeded = true;
    }

    if (resolved.initialShareData) {
      const data = resolved.initialShareData;
      if (typeof data.pixeldrainLink === "string" && data.pixeldrainLink) {
        const pdId = data.pixeldrainLink.match(/\/u\/([a-zA-Z0-9]+)/)?.[1];
        if (pdId) {
          addStream(
            "Dotflix (PixelDrain)",
            `https://pixeldrain.com/api/file/${pdId}?download`,
          );
        }
      }
    }

    if (retryNeeded) {
      const [newProxyRes, newDriveRes] = await Promise.allSettled([
        callDotflixServerAction(
          link,
          proxyAction,
          sharingCode,
          signal,
          requestHeaders,
          providerContext,
        ),
        callDotflixServerAction(
          link,
          driveAction,
          sharingCode,
          signal,
          requestHeaders,
          providerContext,
        ),
      ]);

      if (newProxyRes.status === "fulfilled") {
        const newProxyUrl = getServerActionDownloadUrl(newProxyRes.value.data);
        if (newProxyUrl) addStream("Dotflix Proxy", newProxyUrl);
      }

      if (newDriveRes.status === "fulfilled") {
        const newDriveUrl = getServerActionDriveUrl(newDriveRes.value.data);
        if (newDriveUrl) {
          const workerUrl = await resolveDotflixWorkerUrl(
            newDriveUrl,
            signal,
            providerContext,
          );
          if (workerUrl) addStream("Dotflix Worker", workerUrl);
        }
      }
    }
  }

  if (!streams.length) {
    throw new Error("Dotflix did not return a direct or proxy download URL");
  }

  return sortStreams();
}

async function extractDownloadStreams(
  link: string,
  signal: AbortSignal | undefined,
  headers: Record<string, string>,
  providerContext: ProviderContext,
  isDownload?: boolean,
): Promise<Stream[]> {
  if (getDotflixSharingCode(link)) {
    return extractDotflixStream(
      link,
      signal,
      headers,
      providerContext,
      isDownload,
    );
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
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  const headers = { ...providerContext.commonHeaders };
  const visited = new Set<string>();

  async function resolve(link: string, depth: number, quality?: StreamQuality): Promise<Stream[]> {
    if (signal?.aborted) throw new Error("EonMovies request aborted");
    if (depth > 5 || visited.has(link)) return [];
    visited.add(link);
    if (getDotflixSharingCode(link) || isHubcloudUrl(link)) {
      return addQuality(await extractDownloadStreams(link, signal, headers, providerContext, isDownload), quality);
    }

    const page = await followDownloadLink(link, signal, headers, providerContext);
    if (getDotflixSharingCode(page.url) || isHubcloudUrl(page.url)) {
      return addQuality(await extractDownloadStreams(page.url, signal, headers, providerContext, isDownload), quality);
    }
    if (page.url !== link && visited.has(page.url)) return [];
    visited.add(page.url);
    const $ = providerContext.cheerio.load(page.data);
    const pageQuality = quality || getStreamQuality($("title").text());
    const downloadLinks = $(".dl-row a[href*='/dl/'], a.dl-btn-host[href*='/dl/']")
      .map((_, element) => {
        const anchor = $(element);
        const row = anchor.closest(".dl-row");
        const label = row.attr("data-dlname") || row.find(".dl-row-name").text().trim();
        return {link: new URL(anchor.attr("href") || "", page.url).href, quality: getStreamQuality(label) || pageQuality};
      }).get();
    if (!downloadLinks.length) {
      throw new Error(`EonMovies has no supported download mirrors: ${page.url}`);
    }

    const streams: Stream[] = [];
    let lastError: unknown;
    for (const download of downloadLinks) {
      try {
        streams.push(...await resolve(download.link, depth + 1, download.quality));
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
      }
    }
    if (!streams.length && lastError) throw lastError;
    return streams;
  }

  const streams = await resolve(link, 0);
  return streams.filter((stream, index, all) => all.findIndex(item => item.link === stream.link) === index);
}
