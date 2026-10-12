import { Stream, ProviderContext, TextTracks } from "../types";

const TURNSTILE_DEFAULT_SITEKEY = "0x4AAAAAABBCV3tPrCXT9h2H";
const DEFAULT_COBALT_API = "https://cobalt-backend.canine.tools";
const DEFAULT_COBALT_WEB = "https://cobalt.canine.tools";

function extractVideoId(link: string): string {
  const match =
    link.match(/(?:v=|\/watch\?v=|\/embed\/|\/v\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/i) ||
    link.match(/([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : link;
}

const QUALITY_ORDER: Record<string, number> = {
  "2160": 1,
  "1440": 2,
  "1080": 3,
  "720": 4,
  "480": 5,
  "360": 6,
  "240": 7,
  "144": 8,
};

function getTurnstileInjectJs(sitekey: string): string {
  return `(function() {
  if (window.__vega_turnstile_injected) return;
  window.__vega_turnstile_injected = true;

  function sendToken(token) {
    if (!token || typeof token !== 'string') return;
    if (token.length < 20 || token.startsWith('<') || token.startsWith('{')) return;
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        __waf: true,
        data: token
      }));
    }
  }

  function checkExistingTokens() {
    // 1. Check window.turnstile.getResponse on existing widget
    if (window.turnstile && typeof window.turnstile.getResponse === 'function') {
      try {
        var nativeWidget = document.getElementById('turnstile-widget');
        var res = nativeWidget ? window.turnstile.getResponse(nativeWidget) : window.turnstile.getResponse();
        if (res && res.length > 20) {
          sendToken(res);
          return true;
        }
      } catch (e) {}
    }

    // 2. Check input elements
    var inputs = document.querySelectorAll('input[name="cf-turnstile-response"], [name="cf-turnstile-response"]');
    for (var i = 0; i < inputs.length; i++) {
      var val = inputs[i].value;
      if (val && val.length > 20) {
        sendToken(val);
        return true;
      }
    }
    return false;
  }

  function init() {
    if (!document.body) {
      setTimeout(init, 50);
      return;
    }

    if (checkExistingTokens()) return;

    var container = document.getElementById('vega-turnstile-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'vega-turnstile-container';
      container.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999999;background:#18181b;padding:16px 24px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:300px;border:1px solid #333;font-family:system-ui,-apple-system,sans-serif;';

      var title = document.createElement('div');
      title.innerText = 'Cobalt Verification';
      title.style.cssText = 'color:#fff;font-size:14px;font-weight:600;margin-bottom:6px;text-align:center;';
      container.appendChild(title);

      var subtitle = document.createElement('div');
      subtitle.innerText = 'Please complete the challenge to unlock MP4 streams...';
      subtitle.style.cssText = 'color:#a1a1aa;font-size:12px;margin-bottom:12px;text-align:center;';
      container.appendChild(subtitle);

      var widget = document.createElement('div');
      widget.id = 'vega-turnstile-widget';
      container.appendChild(widget);

      document.body.appendChild(container);
    }

    function renderWidget() {
      if (!window.turnstile || typeof window.turnstile.render !== 'function') return false;
      var widget = document.getElementById('vega-turnstile-widget');
      if (!widget || widget.children.length > 0) return true;
      try {
        window.turnstile.render(widget, {
          sitekey: '${sitekey}',
          theme: 'dark',
          callback: function(token) {
            sendToken(token);
          },
          'error-callback': function() {
            console.error('Turnstile render error');
          }
        });
        return true;
      } catch (err) {
        return false;
      }
    }

    if (!window.turnstile && !document.getElementById('vega-turnstile-script')) {
      var script = document.createElement('script');
      script.id = 'vega-turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      document.head.appendChild(script);
    }

    var poll = setInterval(function() {
      if (checkExistingTokens()) {
        clearInterval(poll);
        return;
      }
      if (window.turnstile) {
        renderWidget();
      }
    }, 200);
    setTimeout(function() { clearInterval(poll); }, 35000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); true;`;
}

async function getCobaltSitekey(axios: any, apiBase: string): Promise<string> {
  try {
    const res = await axios.get(`${apiBase}/`, {
      headers: { Accept: "application/json" },
      timeout: 3000,
    });
    if (res.data?.cobalt?.turnstileSitekey) {
      return res.data.cobalt.turnstileSitekey;
    }
  } catch {
    // Fall back to default
  }
  return TURNSTILE_DEFAULT_SITEKEY;
}

interface CachedCobaltSession {
  token: string;
  expiresAt: number;
}

async function getOrRefreshCobaltJwt(
  providerContext: ProviderContext,
  apiBase: string,
  webUrl: string,
  forceNew = false,
  allowPrompt = false
): Promise<string | null> {
  const { axios, kvStore, commonHeaders } = providerContext;

  // 1. Check existing cached session token
  if (!forceNew) {
    const cached = await kvStore?.get<CachedCobaltSession>("cobalt_jwt_session");
    if (cached?.token && cached.expiresAt > Date.now() + 60000) {
      return cached.token;
    }
  }

  // 2. If no valid cached token and interactive prompt is not allowed (streaming mode with HLS available), do not show captcha
  if (!allowPrompt || !providerContext.openWebView) {
    return null;
  }

  try {
    const sitekey = await getCobaltSitekey(axios, apiBase);
    const wafResult = await providerContext.openWebView(webUrl, {
      title: "Cobalt Verification",
      description: "Please complete the verification to load MP4 streams",
      force: true,
      injectedJavaScript: getTurnstileInjectJs(sitekey),
    });

    const turnstileToken = wafResult?.data?.trim();
    console.log("[Cobalt] Solver returned token length:", turnstileToken?.length || 0);
    if (!turnstileToken || turnstileToken.startsWith("<") || turnstileToken.startsWith("{")) {
      console.warn("[Cobalt] Invalid or empty Turnstile token received");
      return null;
    }

    console.log("[Cobalt] Exchanging Turnstile token at:", `${apiBase}/session`);
    const sessionRes = await axios.post(
      `${apiBase}/session`,
      {},
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "cf-turnstile-response": turnstileToken,
          ...commonHeaders,
        },
        timeout: 15000,
      }
    );

    const jwt = sessionRes.data?.token;
    if (jwt) {
      const expSec = sessionRes.data?.exp || 600;
      console.log(`[Cobalt] Successfully acquired session JWT, expires in ${expSec}s`);
      await kvStore?.set("cobalt_jwt_session", {
        token: jwt,
        expiresAt: Date.now() + expSec * 1000,
      });
      return jwt;
    }
  } catch (err: any) {
    console.error("Cobalt WAF solving or session token exchange failed:", err?.response?.data || err?.message || err);
  }

  return null;
}

async function queryCobaltEndpoint(
  axios: any,
  apiBase: string,
  jwt: string,
  videoId: string,
  quality: string,
  commonHeaders: any,
  signal?: AbortSignal
): Promise<Stream[]> {
  const streams: Stream[] = [];
  const res = await axios.post(
    `${apiBase}/`,
    {
      url: `https://www.youtube.com/watch?v=${videoId}`,
      videoQuality: quality,
      downloadMode: "auto",
    },
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
        ...commonHeaders,
      },
      timeout: 20000,
      signal,
    }
  );

  const data = res.data;
  if (!data) return streams;

  if (data.status === "tunnel" || data.status === "redirect") {
    if (data.url) {
      const label = quality === "max" ? "1080" : quality;
      streams.push({
        server: `Cobalt (${label}p MP4)`,
        link: data.url,
        type: "mp4",
        quality: label,
        tag: "Audio + Video",
      });
    }
  } else if (data.status === "picker" && Array.isArray(data.picker)) {
    for (const item of data.picker) {
      if (item.url) {
        streams.push({
          server: "Cobalt (MP4)",
          link: item.url,
          type: "mp4",
          quality: quality === "max" ? "1080" : quality,
          tag: "Audio + Video",
        });
      }
    }
  }

  return streams;
}

async function fetchFromCobalt(
  providerContext: ProviderContext,
  videoId: string,
  preferredQuality?: string,
  isDownload?: boolean,
  allowPrompt?: boolean,
  signal?: AbortSignal
): Promise<Stream[]> {
  const { axios, kvStore, commonHeaders } = providerContext;

  const customApi = ((await kvStore?.get<string>("cobaltApiOverride")) || "").trim();
  const apiBase = customApi || DEFAULT_COBALT_API;
  const webUrl = DEFAULT_COBALT_WEB;

  let jwt = await getOrRefreshCobaltJwt(providerContext, apiBase, webUrl, false, allowPrompt);
  if (!jwt) return [];

  const targetQuality =
    preferredQuality && preferredQuality !== "auto"
      ? preferredQuality.replace("p", "")
      : "1080";

  const qualitiesToQuery = targetQuality === "1080" ? ["1080", "720"] : [targetQuality];

  try {
    const results = await Promise.allSettled(
      qualitiesToQuery.map((q) =>
        queryCobaltEndpoint(axios, apiBase, jwt!, videoId, q, commonHeaders, signal)
      )
    );

    const streams: Stream[] = [];
    const seenUrls = new Set<string>();

    for (const r of results) {
      if (r.status === "fulfilled") {
        for (const s of r.value) {
          if (!seenUrls.has(s.link)) {
            seenUrls.add(s.link);
            streams.push(s);
          }
        }
      }
    }

    if (streams.length > 0) {
      return streams;
    }
  } catch (err: any) {
    const errCode = err?.response?.data?.error?.code || "";
    if (errCode.includes("jwt") || errCode.includes("auth")) {
      await kvStore?.delete("cobalt_jwt_session");
      if (allowPrompt) {
        const freshJwt = await getOrRefreshCobaltJwt(providerContext, apiBase, webUrl, true, true);
        if (freshJwt) {
          return queryCobaltEndpoint(
            axios,
            apiBase,
            freshJwt,
            videoId,
            targetQuality,
            commonHeaders,
            signal
          ).catch(() => []);
        }
      }
    }
  }

  return [];
}

async function getVisitorData(axios: any, kvStore: any): Promise<string> {
  const fallback =
    "CgtSdHczNXdoNzhqQSiYoJ7WBjIKCgJJThIEGgAgZGLfAgrcAjIyLllUPUpQRHNlLWd6ZzYwc3FRN2JRSGNlMzdJWHFlelQxLUZMd00yR3M5X1gxZUd4RWtRdUxyakphLS1iaU1LMk9fcU83MHl4cExXcFRKd3p2ckcxcGMyU0RBS3FmYXVPOGpnd1dpWUtUdU5rQ1pZZzFZeHh3UkFnRXYtNE9YR1gtaWhvd2RvblQ3dENIV0NmdDgtZU9Ibi04M2QtUlBoZlhoZGpyNjE4YlFGY0VWVU5UanJBZ2g0cVFCRXJWbktnQm4tV1Eydm1CNE5qTl9FajBQVV9TaFlsYkxEOGY3WFJaUGVNRnIzTzhoejEyMDJQQlJpRUwyX1gtV2N0WG1YRmFvLVYyZXRpTWJDSUZLaU9jNEZUTU1lSktrWVBKV1A0WlV5eFZYeTNPZUlFMS1XeXpaa1Y3T1dVVDE5SllHcTNSN0NFcE5HNTNFZElmcW9UVDdMYjV2N09mdw==";
  try {
    const cached = await kvStore?.get("youtube_visitor_data");
    if (cached) return cached;
    const res = await axios.get("https://www.youtube.com", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 3000,
    });
    const match =
      typeof res?.data === "string"
        ? res.data.match(/"visitorData"\s*:\s*"([^"]+)"/)
        : null;
    if (match && match[1]) {
      await kvStore?.set("youtube_visitor_data", match[1]);
      return match[1];
    }
  } catch {
    // Fall back to default
  }
  return fallback;
}

async function fetchFromInnerTube(
  axios: any,
  kvStore: any,
  videoId: string,
  signal?: AbortSignal
): Promise<{ streams: Stream[]; subtitles: TextTracks }> {
  const streams: Stream[] = [];
  const subtitles: TextTracks = [];

  const visitorData = await getVisitorData(axios, kvStore);

  try {
    const [visionRes, vrRes] = await Promise.allSettled([
      axios.post(
        "https://www.youtube.com/youtubei/v1/player?prettyPrint=false&alt=json",
        {
          videoId,
          racyCheckOk: true,
          contentCheckOk: true,
          playbackContext: {
            contentPlaybackContext: {
              signatureTimestamp: 20731,
            },
          },
          context: {
            client: {
              hl: "en",
              gl: "US",
              visitorData,
              clientName: "VISIONOS",
              clientVersion: "1.02",
              osName: "visionOS",
              osVersion: "26.5.23O471",
              platform: "MOBILE",
              deviceMake: "Apple",
              deviceModel: "RealityDevice17,1",
            },
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-YouTube-Client-Name": "101",
            "X-YouTube-Client-Version": "1.02",
            "X-Goog-Visitor-Id": visitorData,
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
            Origin: "https://www.youtube.com",
            Referer: `https://www.youtube.com/watch?v=${videoId}`,
          },
          timeout: 5000,
          signal,
        }
      ),
      axios.post(
        "https://www.youtube.com/youtubei/v1/player?prettyPrint=false&alt=json",
        {
          videoId,
          racyCheckOk: true,
          contentCheckOk: true,
          playbackContext: {
            contentPlaybackContext: {
              signatureTimestamp: 20731,
            },
          },
          context: {
            client: {
              clientName: "ANDROID_VR",
              clientVersion: "1.60.19",
              deviceMake: "Oculus",
              deviceModel: "Quest 3",
              platform: "MOBILE",
              hl: "en",
              gl: "US",
            },
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 12; Quest 3) AppleWebKit/537.36",
          },
          timeout: 5000,
          signal,
        }
      ),
    ]);

    const vData = visionRes.status === "fulfilled" ? visionRes.value?.data : null;
    const vrData = vrRes.status === "fulfilled" ? vrRes.value?.data : null;

    // 1. Master HLS (Multi-Quality adaptive stream with audio)
    const masterUrl = vData?.streamingData?.hlsManifestUrl;
    if (masterUrl) {
      streams.push({
        server: "YouTube HLS (Multi-Quality)",
        link: masterUrl,
        type: "m3u8",
        quality: "1080",
        tag: "Audio + Video",
      });
    }

    // 2. Progressive MP4 (Audio + Video muxed)
    const formats = vrData?.streamingData?.formats || [];
    for (const f of formats) {
      if (f.url) {
        const qualityLabel = f.qualityLabel || "360p";
        streams.push({
          server: `YouTube (${qualityLabel} MP4)`,
          link: f.url,
          type: "mp4",
          quality: qualityLabel.replace("p", ""),
          tag: "Audio + Video",
        });
      }
    }

    // Extract subtitles from captions
    const captionTracks =
      vData?.captions?.playerCaptionsTracklistRenderer?.captionTracks ||
      vrData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (Array.isArray(captionTracks)) {
      for (const c of captionTracks) {
        if (c.baseUrl) {
          const name =
            c.name?.runs?.[0]?.text || c.name?.simpleText || c.languageCode;
          subtitles.push({
            title: name,
            language: c.languageCode || name,
            type: "text/vtt",
            uri: c.baseUrl.includes("fmt=") ? c.baseUrl : `${c.baseUrl}&fmt=vtt`,
          });
        }
      }
    }
  } catch {
    // Return empty on failure
  }

  return { streams, subtitles };
}

export const getStream = async function ({
  link,
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
  const { axios, kvStore } = providerContext;

  const videoId = extractVideoId(link);
  if (!videoId) return [];

  const preferredQuality = await kvStore?.get<string>("preferredQuality");
  const enableCobalt = (await kvStore?.get<boolean>("enableCobalt")) !== false;

  // 1. Fetch direct YouTube streams
  const innerTubeData = await fetchFromInnerTube(axios, kvStore, videoId, signal);

  // 2. Fetch Cobalt MP4 if enabled
  // Only trigger interactive Turnstile challenge if downloading OR direct streams failed
  // Otherwise use cached session without interrupting video playback
  let cobaltStreams: Stream[] = [];
  if (enableCobalt) {
    const allowPrompt = Boolean(isDownload) || innerTubeData.streams.length === 0;
    try {
      cobaltStreams = await fetchFromCobalt(
        providerContext,
        videoId,
        preferredQuality,
        Boolean(isDownload),
        allowPrompt,
        signal
      );
    } catch (e) {
      console.error("Cobalt stream fetch error:", e);
    }
  }

  const allStreams: Stream[] = [...cobaltStreams, ...innerTubeData.streams];
  if (allStreams.length === 0) {
    return [];
  }

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const uniqueStreams: Stream[] = [];
  for (const s of allStreams) {
    if (!seenUrls.has(s.link)) {
      seenUrls.add(s.link);
      uniqueStreams.push(s);
    }
  }

  // Attach subtitles to all streams
  if (innerTubeData.subtitles.length > 0) {
    for (const s of uniqueStreams) {
      if (!s.subtitles) {
        s.subtitles = innerTubeData.subtitles;
      }
    }
  }

  sortStreams(uniqueStreams, preferredQuality, isDownload);
  return uniqueStreams;
};

function sortStreams(
  streams: Stream[],
  preferredQuality?: string,
  isDownload?: boolean
) {
  streams.sort((a, b) => {
    // 1. If downloading, strictly prioritize complete MP4s ahead of HLS
    if (isDownload) {
      const aIsMp4 = a.type === "mp4";
      const bIsMp4 = b.type === "mp4";
      if (aIsMp4 && !bIsMp4) return -1;
      if (!aIsMp4 && bIsMp4) return 1;

      // Prefer Cobalt MP4 (complete 1080p/720p audio+video mux) over VR progressive
      const aIsCobalt = a.server.startsWith("Cobalt");
      const bIsCobalt = b.server.startsWith("Cobalt");
      if (aIsCobalt && !bIsCobalt) return -1;
      if (!aIsCobalt && bIsCobalt) return 1;
    }

    // 2. If streaming, strictly prioritize streaming-friendly adaptive HLS first
    if (!isDownload) {
      const aIsHls = a.server.includes("Multi-Quality") || a.type === "m3u8";
      const bIsHls = b.server.includes("Multi-Quality") || b.type === "m3u8";
      if (aIsHls && !bIsHls) return -1;
      if (!aIsHls && bIsHls) return 1;
    }

    // 3. Match user preferred quality
    if (preferredQuality && preferredQuality !== "auto") {
      const cleanPref = preferredQuality.replace("p", "");
      const aMatches = a.quality === cleanPref;
      const bMatches = b.quality === cleanPref;
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
    }

    // 4. Default numerical quality ordering (highest first)
    const orderA = QUALITY_ORDER[a.quality || ""] || 99;
    const orderB = QUALITY_ORDER[b.quality || ""] || 99;
    return orderA - orderB;
  });
}
