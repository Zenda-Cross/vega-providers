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
  if (encryptedUrl.startsWith("http://") || encryptedUrl.startsWith("https://")) {
    return encryptedUrl;
  }
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
    let cachedUserAgent: string | null = null;

    try {
      const cached = await kvStore?.get("kartoons_challenge_token");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (!parsed.expires_at || new Date(parsed.expires_at) > new Date()) {
          challengeToken = parsed.token;
          cachedUserAgent = parsed.userAgent || null;
        }
      }
    } catch {}

    const fetchLinks = async (token?: string | null, ua?: string | null) => {
      const activeUa = ua || cachedUserAgent || commonHeaders["user-agent"];
      const reqHeaders: Record<string, string> = {
        ...commonHeaders,
        "user-agent": activeUa,
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

    const extractLinksArray = (data: any): any[] => {
      if (!data) return [];
      if (Array.isArray(data.data)) return data.data;
      if (Array.isArray(data.data?.links)) return data.data.links;
      if (Array.isArray(data.links)) return data.links;
      if (Array.isArray(data)) return data;
      return [];
    };

    let linksData: any[] = [];
    try {
      const res = await fetchLinks(challengeToken);
      linksData = extractLinksArray(res.data);
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
                var notified = false;
                function sendWaf(payload) {
                  if (notified) return;
                  try {
                    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                      notified = true;
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        __waf: true,
                        data: typeof payload === "string" ? payload : JSON.stringify(payload),
                        token: typeof payload === "string" ? payload : JSON.stringify(payload)
                      }));
                    }
                  } catch(e) {}
                }

                // Intercept localStorage.setItem
                try {
                  var origSetItem = localStorage.setItem.bind(localStorage);
                  localStorage.setItem = function(k, v) {
                    origSetItem(k, v);
                    if (k === "challengeToken" && v && v.length > 20) {
                      sendWaf({ challengeToken: v });
                    }
                  };
                } catch(e) {}

                // Intercept fetch to catch /challenge/verify
                try {
                  var origFetch = window.fetch;
                  if (origFetch) {
                    window.fetch = async function() {
                      var res = await origFetch.apply(this, arguments);
                      try {
                        var clone = res.clone();
                        var u = clone.url || "";
                        if (u.includes("/challenge/verify")) {
                          clone.json().then(function(json) {
                            if (json && json.token) {
                              sendWaf({ challengeToken: json.token, expires_at: json.expires_at });
                            }
                          }).catch(function() {});
                        }
                      } catch(e) {}
                      return res;
                    };
                  }
                } catch(e) {}

                // Render Turnstile widget if not already visible
                function ensureTurnstileWidget() {
                  if (document.getElementById("vega-cf-box")) return;
                  if (!window.turnstile || typeof window.turnstile.render !== "function") {
                    setTimeout(ensureTurnstileWidget, 500);
                    return;
                  }
                  try {
                    var box = document.createElement("div");
                    box.id = "vega-cf-box";
                    box.style.cssText = "position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);z-index:2147483647;background:#18181b;padding:24px;border-radius:12px;border:1px solid #3f3f46;box-shadow:0 10px 40px rgba(0,0,0,0.8);text-align:center;";
                    var txt = document.createElement("div");
                    txt.innerText = "Please complete verification to stream";
                    txt.style.cssText = "color:#fff;font-size:15px;font-weight:600;margin-bottom:16px;font-family:sans-serif;";
                    box.appendChild(txt);
                    var widget = document.createElement("div");
                    widget.id = "vega-cf-widget";
                    box.appendChild(widget);
                    document.body.appendChild(box);

                    window.turnstile.render("#vega-cf-widget", {
                      sitekey: "0x4AAAAAAFMBI3Lp3ohSsfYm",
                      callback: function(tok) {
                        if (tok) {
                          sendWaf({ turnstileToken: tok });
                        }
                      }
                    });
                  } catch(e) {}
                }
                setTimeout(ensureTurnstileWidget, 1000);

                // Poll storage and Turnstile inputs
                function poll() {
                  if (notified) return;
                  try {
                    var ct = localStorage.getItem("challengeToken");
                    if (ct && ct.length > 20) {
                      sendWaf({ challengeToken: ct });
                      return;
                    }
                    var inp = document.querySelector('input[name="cf-turnstile-response"]');
                    if (inp && inp.value && inp.value.length > 20) {
                      sendWaf({ turnstileToken: inp.value });
                      return;
                    }
                    if (window.turnstile) {
                      var r = window.turnstile.getResponse();
                      if (r && r.length > 20) {
                        sendWaf({ turnstileToken: r });
                        return;
                      }
                    }
                  } catch (e) {}
                  setTimeout(poll, 300);
                }
                poll();
              })();
            `,
          },
        );

        const activeUa = webViewRes?.userAgent || commonHeaders["user-agent"];
        let tokenToVerify: string | null = null;
        let challengeTokenReady: string | null = null;

        if (webViewRes?.data) {
          try {
            const raw = webViewRes.data;
            let parsed: any = null;
            if (typeof raw === "string" && (raw.startsWith("{") || raw.startsWith("["))) {
              try { parsed = JSON.parse(raw); } catch {}
            } else if (typeof raw === "object" && raw !== null) {
              parsed = raw;
            }

            if (parsed) {
              if (parsed.challengeToken) challengeTokenReady = parsed.challengeToken;
              else if (parsed.turnstileToken) tokenToVerify = parsed.turnstileToken;
              else if (parsed.token) challengeTokenReady = parsed.token;
              else if (parsed.data) {
                const inner = typeof parsed.data === "string" && parsed.data.startsWith("{") ? JSON.parse(parsed.data) : parsed.data;
                if (inner?.challengeToken) challengeTokenReady = inner.challengeToken;
                else if (inner?.turnstileToken) tokenToVerify = inner.turnstileToken;
                else if (typeof inner === "string" && inner.length > 20) tokenToVerify = inner;
              }
            } else if (typeof raw === "string") {
              if (raw.length > 20 && !raw.includes("<")) {
                tokenToVerify = raw;
              } else {
                const matchToken = raw.match(/"challengeToken"\s*:\s*"([^"]+)"/);
                const matchCf = raw.match(/name="cf-turnstile-response"\s+value="([^"]+)"/);
                if (matchToken && matchToken[1]) challengeTokenReady = matchToken[1];
                else if (matchCf && matchCf[1]) tokenToVerify = matchCf[1];
              }
            }
          } catch {}
        }

        if (tokenToVerify && !challengeTokenReady) {
          try {
            const verifyRes = await axios.post(
              `${API_BASE}/challenge/verify`,
              {
                turnstile_token: tokenToVerify,
                fingerprint: activeUa,
              },
              {
                headers: {
                  ...commonHeaders,
                  "user-agent": activeUa,
                  "X-Skip-Challenge": "true",
                },
              },
            );

            if (verifyRes.data?.success && verifyRes.data?.token) {
              challengeTokenReady = verifyRes.data.token;
            }
          } catch {}
        }

        if (challengeTokenReady) {
          await kvStore?.set(
            "kartoons_challenge_token",
            JSON.stringify({
              token: challengeTokenReady,
              userAgent: activeUa,
              expires_at: new Date(Date.now() + 864e5).toISOString(),
            }),
          );

          try {
            const retryRes = await fetchLinks(challengeTokenReady, activeUa);
            linksData = extractLinksArray(retryRes.data);
          } catch {}
        }
      }
    }

    const streams: Stream[] = [];
    const activeUa = cachedUserAgent || commonHeaders["user-agent"];

    for (const item of linksData) {
      const rawUrl = item.url || item.link || item.file || item.src;
      if (!rawUrl) continue;
      const decryptedUrl = decryptUrl(rawUrl);
      if (!decryptedUrl) continue;

      const subtitles: TextTracks = [];
      if (Array.isArray(item.subtitles)) {
        for (const sub of item.subtitles) {
          const rawSubUrl = sub.url || sub.file || sub.link;
          const subUrl = decryptUrl(rawSubUrl || "");
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
        server: item.title || item.server || item.name || "Kartoons",
        link: decryptedUrl,
        type: decryptedUrl.includes(".m3u8") ? "m3u8" : "mp4",
        quality: item.quality || "auto",
        headers: {
          Referer: "https://kartoons.to/",
          "User-Agent": activeUa,
        },
        subtitles: subtitles.length > 0 ? subtitles : undefined,
      });
    }

    return streams;
  } catch (error) {
    return [];
  }
};
