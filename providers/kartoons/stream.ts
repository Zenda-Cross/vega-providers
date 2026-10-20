import { ProviderContext, Stream, TextTracks } from "../types";
import { API_BASE, commonHeaders } from "./headers";

function solvePow(nonce: string, bits: number): string {
  if (typeof require === "function") {
    try {
      const crypto = require("crypto");
      const prefix = nonce + ":";
      for (let counter = 0; ; counter++) {
        const hash = crypto.createHash("sha256").update(prefix + counter).digest();
        let zeroBits = 0;
        for (let i = 0; i < hash.length; i++) {
          const b = hash[i];
          if (b === 0) {
            zeroBits += 8;
            continue;
          }
          let mask = 0x80;
          while (mask && !(b & mask)) {
            zeroBits++;
            mask >>= 1;
          }
          break;
        }
        if (zeroBits >= bits) return String(counter);
      }
    } catch {}
  }
  return "0";
}

function decryptUrl(encryptedUrl: string, keyStr = "bca9e0df1a5abb32906ca3f63ac04cef"): string {
  if (!encryptedUrl || typeof encryptedUrl !== "string") return encryptedUrl;
  try {
    let clean = encryptedUrl.replace(/-/g, "+").replace(/_/g, "/");
    const rem = clean.length % 4;
    if (rem) clean += "=".repeat(4 - rem);

    if (typeof require === "function") {
      try {
        const crypto = require("crypto");
        const raw = Buffer.from(clean, "base64");
        if (raw.length < 17) return encryptedUrl;
        const iv = raw.subarray(0, 16);
        const ciphertext = raw.subarray(16);
        const key = Buffer.from(keyStr.padEnd(32, " ").slice(0, 32), "utf8");
        const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
        let dec = decipher.update(ciphertext, undefined, "utf8");
        dec += decipher.final("utf8");
        return dec;
      } catch {}
    }
    return encryptedUrl;
  } catch {
    return encryptedUrl;
  }
}

export const getStream = async function ({
  link,
  type,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    const { axios, kvStore } = providerContext;
    let contentId = link;
    let isMovie = type === "movie";

    if (link.startsWith("{")) {
      try {
        const parsed = JSON.parse(link);
        contentId = parsed.id || contentId;
        if (parsed.type === "movie") isMovie = true;
        if (parsed.type === "episode" || parsed.type === "show") isMovie = false;
      } catch {}
    }

    const endpoint = isMovie
      ? `/movies/${contentId}/links`
      : `/shows/episode/${contentId}/links`;
    const powContent = isMovie ? `movie:${contentId}` : `episode:${contentId}`;

    let challengeToken: string | null = null;
    try {
      const cached = await kvStore?.get("kartoons_challenge_token");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (!parsed.expires_at || new Date(parsed.expires_at) > new Date()) {
          challengeToken = parsed.token;
        }
      }
    } catch {}

    const fetchLinks = async (token?: string | null) => {
      const reqHeaders: Record<string, string> = {
        ...commonHeaders,
      };
      if (token) {
        reqHeaders["X-Challenge-Token"] = token;
      }

      // Check and solve PoW challenge
      try {
        const powRes = await axios.get(
          `${API_BASE}/challenge/pow?content=${encodeURIComponent(powContent)}`,
          { headers: reqHeaders, signal },
        );
        const powData = powRes.data?.data;
        if (powData?.enabled && powData.nonce && powData.bits) {
          const solution = solvePow(powData.nonce, powData.bits);
          reqHeaders["X-Pow-Nonce"] = powData.nonce;
          reqHeaders["X-Pow-Solution"] = solution;
          reqHeaders["X-Challenge-Retry"] = "true";
        }
      } catch {}

      return await axios.get(`${API_BASE}${endpoint}`, {
        headers: reqHeaders,
        signal,
      });
    };

    let linksData: any[] = [];
    try {
      const res = await fetchLinks(challengeToken);
      if (res.data?.success && Array.isArray(res.data?.data)) {
        linksData = res.data.data;
      }
    } catch (err: any) {
      const isChallengeRequired =
        err.response?.status === 403 || err.response?.data?.challenge_required;

      if (isChallengeRequired && providerContext.openWebView) {
        const webViewRes = await providerContext.openWebView(
          "https://kartoons.to/home",
          {
            title: "Kartoons Verification",
            description: "Please complete verification in the browser to unlock streams",
            timeoutMs: 60000,
            injectedJavaScript: `
              (function() {
                function check() {
                  var t = localStorage.getItem("challengeToken");
                  if (t) {
                    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ challengeToken: t }));
                    return;
                  }
                  var inp = document.querySelector('input[name="cf-turnstile-response"]');
                  if (inp && inp.value) {
                    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ turnstileToken: inp.value }));
                    return;
                  }
                  if (window.turnstile) {
                    try {
                      var r = window.turnstile.getResponse();
                      if (r) {
                        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ turnstileToken: r }));
                        return;
                      }
                    } catch (e) {}
                  }
                  setTimeout(check, 500);
                }
                check();
              })();
            `,
          },
        );

        let newChallengeToken: string | null = null;
        if (webViewRes?.data) {
          try {
            const parsed =
              typeof webViewRes.data === "string"
                ? JSON.parse(webViewRes.data)
                : webViewRes.data;

            if (parsed?.challengeToken) {
              newChallengeToken = parsed.challengeToken;
            } else if (parsed?.turnstileToken || (typeof parsed === "string" && parsed.length > 20)) {
              const turnstileToken = parsed.turnstileToken || parsed;
              const verifyRes = await axios.post(
                `${API_BASE}/challenge/verify`,
                {
                  turnstile_token: turnstileToken,
                  fingerprint: commonHeaders["user-agent"],
                },
                {
                  headers: {
                    ...commonHeaders,
                    "X-Skip-Challenge": "true",
                  },
                },
              );

              if (verifyRes.data?.success && verifyRes.data?.token) {
                newChallengeToken = verifyRes.data.token;
                await kvStore?.set(
                  "kartoons_challenge_token",
                  JSON.stringify({
                    token: newChallengeToken,
                    expires_at:
                      verifyRes.data.expires_at ||
                      new Date(Date.now() + 864e5).toISOString(),
                  }),
                );
              }
            }
          } catch {}
        }

        if (newChallengeToken) {
          const retryRes = await fetchLinks(newChallengeToken);
          if (retryRes.data?.success && Array.isArray(retryRes.data?.data)) {
            linksData = retryRes.data.data;
          }
        }
      }
    }

    const streams: Stream[] = [];
    for (const item of linksData) {
      const rawUrl = item.url || item.link;
      if (!rawUrl) continue;
      const decryptedUrl = decryptUrl(rawUrl);
      if (!decryptedUrl) continue;

      const subtitles: TextTracks = [];
      if (Array.isArray(item.subtitles)) {
        for (const sub of item.subtitles) {
          const subUrl = decryptUrl(sub.url || "");
          if (subUrl) {
            subtitles.push({
              title: sub.label || sub.language || "Subtitle",
              language: sub.language || "en",
              type: subUrl.endsWith(".vtt") ? "text/vtt" : "application/x-subrip",
              uri: subUrl,
            });
          }
        }
      }

      streams.push({
        server: item.title || item.server || "Kartoons",
        link: decryptedUrl,
        type: decryptedUrl.includes(".m3u8") ? "m3u8" : "mp4",
        quality: item.quality || "auto",
        headers: {
          Referer: "https://kartoons.to/",
          "User-Agent": commonHeaders["user-agent"],
        },
        subtitles: subtitles.length > 0 ? subtitles : undefined,
      });
    }

    return streams;
  } catch (error) {
    return [];
  }
};
