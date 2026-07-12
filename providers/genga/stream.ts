import { Stream, ProviderContext } from "../types";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function hexToBase64(hex: string): string {
  const clean = hex.trim();
  let binary = "";
  for (let i = 0; i < clean.length; i += 2) {
    binary += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
  }
  if (typeof btoa !== "undefined") {
    return btoa(binary);
  }
  return Buffer.from(binary, "binary").toString("base64");
}

async function decryptAes(hexText: string, providerContext: ProviderContext): Promise<string> {
  const base64 = hexToBase64(hexText);
  return await providerContext.Aes.decrypt(
    base64,
    "6b69656d7469656e6d75613931316361",
    "313233343536373839306f6975797472",
    "aes-128-cbc"
  );
}

function decodeBase64(b64: string): string {
  try {
    if (typeof atob === "function") {
      return atob(b64);
    }
  } catch {}
  return Buffer.from(b64, "base64").toString("utf8");
}

function decodeBase64Embed(embedId: string): { name: string; url: string } | null {
  if (!embedId || !embedId.includes(":")) return null;
  try {
    const parts = embedId.split(":");
    let nameB64 = parts[0];
    let urlB64 = parts[1];

    nameB64 += "=".repeat((4 - (nameB64.length % 4)) % 4);
    urlB64 += "=".repeat((4 - (urlB64.length % 4)) % 4);

    const name = decodeBase64(nameB64).trim();
    const url = decodeBase64(urlB64).trim();
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
    let gdMirrorUrl: string | null = null;
    let cloudExternalUrl: string | null = null;

    for (const s of servers) {
      if (s.name.toLowerCase() === "cloud") {
        cloudExternalUrl = s.url;
      }
      if (s.url.includes("gdmirrorbot.nl")) {
        gdMirrorUrl = s.url;
        const sidMatch = s.url.match(/\/embed\/([^/]+)/);
        if (sidMatch) {
          gdMirrorSid = sidMatch[1];
        }
      }
    }

    // A. Resolve IQSmartGames nested servers (Priority 1)
    if (gdMirrorSid && gdMirrorUrl) {
      try {
        const payload = new URLSearchParams();
        payload.append("sid", gdMirrorSid);
        payload.append("UserFavSite", "");
        payload.append("currentDomain", "https://www.desidubanime.me/");

        const helperHeaders = {
          "User-Agent": USER_AGENT,
          "Referer": gdMirrorUrl,
          "Content-Type": "application/x-www-form-urlencoded",
        };

        const helperRes = await axios.post("https://pro.iqsmartgames.com/embedhelper.php", payload.toString(), {
          headers: helperHeaders,
        });

        const helperData = helperRes.data || {};
        if (helperData.mresult && helperData.siteUrls) {
          let mresultB64 = helperData.mresult;
          mresultB64 += "=".repeat((4 - (mresultB64.length % 4)) % 4);

          const decodedMresult = JSON.parse(decodeBase64(mresultB64));
          const siteUrls = helperData.siteUrls;
          const friendlyNames = helperData.siteFriendlyNames || {};

          const promises = Object.entries(decodedMresult).map(async ([key, code]) => {
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
                    const decrypted = JSON.parse(await decryptAes(hexText, providerContext));
                    let sourceUrl = decrypted.source || "";
                    const cfUrl = decrypted.cf || "";

                    // If sourceUrl starts with an IP address, replace it with the CF domain to prevent SSL handshake failure
                    const ipMatch = sourceUrl.match(/https?:\/\/([0-9.]+)/);
                    if (ipMatch) {
                      const cfMatch = cfUrl.match(/https?:\/\/([^/]+)/);
                      if (cfMatch) {
                        const domain = cfMatch[1];
                        sourceUrl = sourceUrl.replace(/https?:\/\/[0-9.]+/, `https://${domain}`);
                      }
                    }

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
              } catch (innerErr: any) {
                console.error(`DesiDubAnime error resolving key ${key}:`, innerErr.message);
              }
            }
          });

          await Promise.all(promises);
        }
      } catch (err: any) {
        console.error("DesiDubAnime IQSmartGames helper error:", err.message);
      }
    }
  } catch (err: any) {
    console.error("DesiDubAnime getStream error:", err.message);
  }

  return streamLinks;
};
