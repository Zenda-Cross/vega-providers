import { Stream, ProviderContext } from "../types";
import * as crypto from "crypto";
import * as vm from "vm";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function decryptAes(hexText: string): string {
  const key = Buffer.from("kiemtienmua911ca", "utf8");
  const iv = Buffer.from("1234567890oiuytr", "utf8");
  const encryptedBytes = Buffer.from(hexText, "hex");
  const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
  let decrypted = decipher.update(encryptedBytes);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf8");
}

function decodeBase64Embed(embedId: string): { name: string; url: string } | null {
  if (!embedId || !embedId.includes(":")) return null;
  try {
    const parts = embedId.split(":");
    let nameB64 = parts[0];
    let urlB64 = parts[1];

    nameB64 += "=".repeat((4 - (nameB64.length % 4)) % 4);
    urlB64 += "=".repeat((4 - (urlB64.length % 4)) % 4);

    const name = Buffer.from(nameB64, "base64").toString("utf8").trim();
    const url = Buffer.from(urlB64, "base64").toString("utf8").trim();
    return { name, url };
  } catch {
    return null;
  }
}

export const getStream = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const streamLinks: Stream[] = [];
  try {
    const { axios, cheerio } = providerContext;
    const parts = link.split("*");
    const watchUrl = parts[0];

    const headers = {
      "User-Agent": USER_AGENT,
      "Referer": "https://www.desidubanime.me/",
    };

    // 1. Fetch watch page
    const res = await axios.get(watchUrl, { headers });
    const html = res.data || "";
    const $ = cheerio.load(html);

    const servers: { name: string; url: string }[] = [];

    // Extract standard data-embed-id elements
    $("[data-embed-id]").each((_, el) => {
      const embedId = $(el).attr("data-embed-id") || "";
      const decoded = decodeBase64Embed(embedId);
      if (decoded) {
        servers.push(decoded);
      }
    });

    let gdMirrorSid: string | null = null;
    let cloudExternalUrl: string | null = null;

    for (const s of servers) {
      if (s.name.toLowerCase() === "cloud") {
        cloudExternalUrl = s.url;
      }
      if (s.url.includes("gdmirrorbot.nl")) {
        const sidMatch = s.url.match(/\/embed\/([^/]+)/);
        if (sidMatch) {
          gdMirrorSid = sidMatch[1];
        }
      }
    }

    // A. Resolve CLOUD stream (Priority 3)
    if (cloudExternalUrl) {
      try {
        const cloudHeaders = {
          "User-Agent": USER_AGENT,
          "Referer": "https://cloud.desidubanime.me/",
        };

        const extRes = await axios.get(cloudExternalUrl, { headers: cloudHeaders });
        const extHtml = extRes.data || "";
        
        // Find sources list
        const sourcesMatch = extHtml.match(/const\s+sources\s*=\s*(\[[\s\S]*?\]);/);
        if (sourcesMatch) {
          const sources = JSON.parse(sourcesMatch[1]);
          const firstSource = sources[0];
          if (firstSource && firstSource.url) {
            const playUrl = `https://cloud.desidubanime.me${firstSource.url}`;
            const playRes = await axios.get(playUrl, { headers: cloudHeaders });
            const playHtml = playRes.data || "";
            const $play = cheerio.load(playHtml);

            // Execute inline player script in VM context to capture JW player config
            const playerScript = $play("script").eq(1).text();
            if (playerScript) {
              const setupConfigs: any[] = [];
              const dummyElement = {
                appendChild: () => {},
                removeChild: () => {},
                setAttribute: () => {},
                style: {},
              };

              const mockPlayer = {
                setup: function (config: any) {
                  setupConfigs.push(config);
                  return this;
                },
                on: function () { return this; },
                addButton: function () { return this; },
                onReady: function (cb: any) { if (cb) cb(); return this; },
                onTime: function () { return this; },
                onComplete: function () { return this; },
                onPlay: function () { return this; },
                onPause: function () { return this; },
                getPlaylist: function () { return []; },
              };

              const context = {
                window: {},
                document: {
                  getElementById: () => dummyElement,
                  querySelector: () => dummyElement,
                  createElement: () => dummyElement,
                  body: dummyElement,
                  head: dummyElement,
                  addEventListener: () => {},
                },
                navigator: {
                  userAgent: USER_AGENT,
                },
                jwplayer: () => mockPlayer,
                playerInstance: mockPlayer,
                console: {
                  log: () => {},
                  error: () => {},
                  warn: () => {},
                },
                setTimeout: () => {},
                setInterval: () => {},
                location: {
                  href: playUrl,
                  hostname: "cloud.desidubanime.me",
                  protocol: "https:",
                },
              };
              (context as any).window = context;

              vm.createContext(context);
              vm.runInContext(playerScript, context);

              if (setupConfigs.length > 0 && setupConfigs[0].file) {
                const hlsFile = setupConfigs[0].file;
                streamLinks.push({
                  server: "CLOUD",
                  link: `https://cloud.desidubanime.me${hlsFile}`,
                  type: "hls",
                  headers: {
                    "User-Agent": USER_AGENT,
                    "Referer": "https://cloud.desidubanime.me/",
                  },
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("DesiDubAnime CLOUD resolver error:", err);
      }
    }

    // B. Resolve IQSmartGames nested servers (Priority 2)
    if (gdMirrorSid) {
      try {
        const payload = new URLSearchParams();
        payload.append("sid", gdMirrorSid);
        payload.append("UserFavSite", "");
        payload.append("currentDomain", "https://www.desidubanime.me/");

        const helperHeaders = {
          "User-Agent": USER_AGENT,
          "Referer": "https://pro.iqsmartgames.com/",
          "Content-Type": "application/x-www-form-urlencoded",
        };

        const helperRes = await axios.post("https://pro.iqsmartgames.com/embedhelper.php", payload.toString(), {
          headers: helperHeaders,
        });

        const helperData = helperRes.data || {};
        if (helperData.mresult && helperData.siteUrls) {
          let mresultB64 = helperData.mresult;
          mresultB64 += "=".repeat((4 - (mresultB64.length % 4)) % 4);

          const decodedMresult = JSON.parse(Buffer.from(mresultB64, "base64").toString("utf8"));
          const siteUrls = helperData.siteUrls;
          const friendlyNames = helperData.siteFriendlyNames || {};

          for (const [key, code] of Object.entries(decodedMresult)) {
            const baseUrl = siteUrls[key];
            const serverName = friendlyNames[key] || key;

            // Only implement RpmShare, UpnShare, and StreamP2p (Priority 2)
            if (baseUrl && (key === "rpmshre" || key === "upnshr" || key === "strmp2")) {
              try {
                const domainMatch = baseUrl.match(/https?:\/\/([^/]+)/);
                if (domainMatch) {
                  const domainHost = domainMatch[1];
                  const videoApiUrl = `https://${domainHost}/api/v1/video?id=${code}&w=1920&h=1080&r=https://www.desidubanime.me/`;
                  
                  const playerHeaders = {
                    "User-Agent": USER_AGENT,
                    "Referer": baseUrl,
                  };

                  const videoRes = await axios.get(videoApiUrl, { headers: playerHeaders });
                  const hexText = videoRes.data || "";
                  if (hexText) {
                    const decrypted = JSON.parse(decryptAes(hexText));
                    const sourceUrl = decrypted.source || decrypted.cf || "";
                    if (sourceUrl) {
                      streamLinks.push({
                        server: serverName,
                        link: sourceUrl,
                        type: "hls",
                        headers: {
                          "User-Agent": USER_AGENT,
                          "Referer": baseUrl,
                        },
                      });
                    }
                  }
                }
              } catch (innerErr) {
                console.error(`DesiDubAnime error resolving key ${key}:`, innerErr);
              }
            }
          }
        }
      } catch (err) {
        console.error("DesiDubAnime IQSmartGames helper error:", err);
      }
    }
  } catch (err) {
    console.error("DesiDubAnime getStream error:", err);
  }

  return streamLinks;
};
