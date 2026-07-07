import { Stream, ProviderContext } from "../types";
import CryptoJS from "crypto-js";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function decryptAes(hexText: string): string {
  const key = CryptoJS.enc.Utf8.parse("kiemtienmua911ca");
  const iv = CryptoJS.enc.Utf8.parse("1234567890oiuytr");
  const base64 = CryptoJS.enc.Hex.parse(hexText).toString(CryptoJS.enc.Base64);
  const decrypted = CryptoJS.AES.decrypt(
    base64,
    key,
    {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  );
  return decrypted.toString(CryptoJS.enc.Utf8);
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

    // A. Resolve IQSmartGames nested servers (Priority 1)
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

          const decodedMresult = JSON.parse(decodeBase64(mresultB64));
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
              } catch (innerErr: any) {
                console.error(`DesiDubAnime error resolving key ${key}:`, innerErr.message);
              }
            }
          }
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
