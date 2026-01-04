import { Stream, ProviderContext } from "../types";

/* =========================
   HELPER: Robust Unpacker (Handles Escaped Quotes)
========================= */
function unPack(code: string): string {
    try {
        // Regex Explanation:
        // 1. Matches "return p}("
        // 2. Captures Payload: (['"]) ... \1 -> Matches quote-delimited string allowing escaped quotes (\\.)
        // 3. Captures Radix (a): (\d+)
        // 4. Captures Count (c): (\d+)
        // 5. Captures Keywords (k): (['"]) ... \4 -> Matches quote-delimited string
        // 6. Matches ".split('|'))"
        
        const regex = /return\s+p}\s*\(\s*(['"])((?:(?!\1).|\\\1)+)\1\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"])((?:(?!\5).|\\\5)+)\5\.split\(['"]\|['"]\)/;
        const match = code.match(regex);

        if (!match) return "";

        let [_, quote1, p, aStr, cStr, quote2, kStr] = match;
        
        const a = parseInt(aStr);
        let c = parseInt(cStr);
        let k = kStr.split('|');

        // Decode Function (BaseN)
        const e = (n: number): string => {
            return (n < a ? '' : e(Math.floor(n / a))) + 
                   ((n = n % a) > 35 ? String.fromCharCode(n + 29) : n.toString(36));
        };

        // Substitution Loop
        while (c--) {
            if (k[c]) {
                const pattern = new RegExp('\\b' + e(c) + '\\b', 'g');
                p = p.replace(pattern, k[c]);
            }
        }
        return p;
    } catch (err) {
        console.error("Unpack error:", err);
        return "";
    }
}

/* =========================
   HELPER: Base64 Decode
========================= */
function decodeBase64(input: string): string {
  try {
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(input), (c: string) =>
          "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
        )
        .join("")
    );
  } catch {}
  try {
    return Buffer.from(input, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

/* =========================
   HELPER: Stream Builder
========================= */
function buildStream(server: string, link: string, referer?: string, subtitles: any[] = []): Stream {
  return {
    server,
    link,
    type: link.includes(".m3u8") ? "m3u8" : "mp4",
    subtitles: subtitles,
    headers: referer
      ? {
          "Referer": referer,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Origin": "https://play.streamplay.co.in",
          "X-Requested-With": "XMLHttpRequest"
        }
      : undefined,
  };
}

/* =========================
   MAIN EXPORT
========================= */
export const getStream = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, cheerio, commonHeaders } = providerContext;

  try {
    const res = await axios.get(link, { headers: commonHeaders, timeout: 8000 });
    const $ = cheerio.load(res.data || "");
    const tasks: Promise<Stream[]>[] = [];

    const handleOption = (el: any) => {
      const b64 = $(el).attr("value");
      if (!b64) return;

      const decoded = decodeBase64(b64);
      if (!decoded) return;

      const iframe =
        cheerio.load(decoded)("iframe").attr("src") ||
        cheerio.load(decoded)('meta[itemprop="embedUrl"]').attr("content");
      if (!iframe) return;

      let iframeUrl = iframe.startsWith("http") ? iframe : "https:" + iframe;
      const server = $(el).text().trim() || "Server";

      // ==================================================
      // 🔥 STREAMPLAY / ALL SUB PLAYER FIX
      // ==================================================
      if (iframeUrl.includes("play.streamplay.co.in/embed/")) {
        const task = axios.get(iframeUrl, { 
            headers: { 
                ...commonHeaders, 
                "Referer": link // The page linking to the iframe
            } 
        }).then((embedRes: any) => {
            const embedHtml = embedRes.data || "";

            // 1. Try to Unpack
            let unpacked = "";
            if (embedHtml.includes("eval(function(p,a,c,k,e,d)")) {
                unpacked = unPack(embedHtml);
            }

            // 2. Find 'kaken' Token
            let tokenMatch = unpacked.match(/kaken\s*=\s*['"]([^'"]+)['"]/);
            if (!tokenMatch) {
                tokenMatch = embedHtml.match(/kaken\s*=\s*['"]([^'"]+)['"]/);
            }

            if (tokenMatch && tokenMatch[1]) {
                const token = tokenMatch[1];
                const apiUrl = `https://play.streamplay.co.in/api/?${token}`;

                // 3. Call API with Strict Headers
                return axios.get(apiUrl, {
                    headers: {
                        "Referer": iframeUrl, 
                        "X-Requested-With": "XMLHttpRequest",
                        "User-Agent": commonHeaders["User-Agent"],
                        "Accept": "application/json",
                        "Origin": "https://play.streamplay.co.in",
                    }
                }).then((apiRes: any) => {
                    const data = apiRes.data;
                    const streams: Stream[] = [];

                    // 4. Extract Sources & Fix Extension
                    if (data && data.sources) {
                        const sources = Array.isArray(data.sources) ? data.sources : [data.sources];
                        sources.forEach((source: any) => {
                            if (source.file) {
                                let streamUrl = source.file;
                                
                                // 🔥 FIX: Convert .txt to .m3u8 automatically
                                if (streamUrl.includes("master.txt")) {
                                    streamUrl = streamUrl.replace("master.txt", "master.m3u8");
                                }

                                streams.push(buildStream(
                                    server || "StreamPlay", 
                                    streamUrl, 
                                    iframeUrl
                                ));
                            }
                        });
                    }

                    // (Subtitles removed as per request)

                    return streams.length > 0 ? streams : [buildStream(server, iframeUrl, link)];
                });
            }
            
            // Fallback: Check for 'file:' in unpacked code
            const fileMatch = unpacked.match(/file\s*:\s*['"]([^'"]+)['"]/);
            if (fileMatch && fileMatch[1]) {
                 let fallbackUrl = fileMatch[1];
                 // Apply same fix for fallback
                 if (fallbackUrl.includes("master.txt")) {
                     fallbackUrl = fallbackUrl.replace("master.txt", "master.m3u8");
                 }
                 return [buildStream(server || "StreamPlay", fallbackUrl, iframeUrl)];
            }

            return [buildStream(server, iframeUrl, link)];

        }).catch((e: any) => {
            console.error("Streamplay error:", e.message);
            return [buildStream(server, iframeUrl, link)];
        });

        tasks.push(task);
        return;
      }

      // ==================================================
      // 🎬 DAILYMOTION HANDLING
      // ==================================================
      if (iframeUrl.includes("dailymotion.com")) {
        const dmId = iframeUrl.match(/\/video\/([a-zA-Z0-9]+)/)?.[1] || 
                     new URL(iframeUrl).searchParams.get("video");

        if (dmId) {
          tasks.push(
            axios
              .get(`https://www.dailymotion.com/player/metadata/video/${dmId}`, {
                headers: commonHeaders,
                timeout: 8000,
              })
              .then((r: any) => {
                const m3u8 = r.data?.qualities?.auto?.[0]?.url;
                if (m3u8) {
                  return [buildStream(server || "Dailymotion", m3u8, "https://www.dailymotion.com/")];
                }
                return [buildStream(server, iframeUrl, link)];
              })
              .catch(() => [buildStream(server, iframeUrl, link)])
          );
          return;
        }
      }

      // ==================================================
      // 🔹 GENERIC FALLBACK
      // ==================================================
      tasks.push(
        Promise.resolve([buildStream(server, iframeUrl, link)])
      );
    };

    $("option[data-index]").each((_: any, el: any) => handleOption(el));
    $(".mobius option").each((_: any, el: any) => handleOption(el));

    const results = (await Promise.allSettled(tasks))
      .flatMap((r) => (r.status === "fulfilled" ? r.value : []));

    const seen = new Set<string>();
    const unique = results.filter((s) => {
      if (seen.has(s.link)) return false;
      seen.add(s.link);
      return true;
    });

    unique.sort((a, b) => {
      const A = a.server.toLowerCase();
      const B = b.server.toLowerCase();
      if (A.includes("dailymotion") || A.includes("m3u8")) return -1;
      if (B.includes("dailymotion") || B.includes("m3u8")) return 1;
      if (A.includes("all sub") || A.includes("streamplay")) return -1;
      if (B.includes("all sub") || B.includes("streamplay")) return 1;
      return 0;
    });

    return unique;
  } catch (e: any) {
    console.error("Donghuastream stream error:", e?.message || e);
    return [];
  }
};