import { Stream, ProviderContext } from "../types";

/* =========================
   Base64 Decoder
========================= */
function decodeBase64(input: string): string {
  try {
    if (typeof atob === "function") {
      return decodeURIComponent(
        Array.prototype.map
          .call(atob(input), (c: string) =>
            "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
          )
          .join("")
      );
    }
  } catch {}

  try {
    return Buffer.from(input, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

/* =========================
   Extract any m3u8
========================= */
function extractM3U8(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
  return match ? match[0] : null;
}

/* =========================
   Vidmoly special extractor
========================= */
function extractVidmolyM3U8(text: string): string | null {
  // covers box-xxxx.vmwesa.online/hls/...master.m3u8
  const match = text.match(
    /https?:\/\/box-[^"'\\\s]+\/hls\/[^"'\\\s]+\/master\.m3u8/
  );
  return match ? match[0] : null;
}

export const getStream = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, cheerio, commonHeaders } = providerContext;

  try {
    const res = await axios.get(link, { headers: commonHeaders });
    const $ = cheerio.load(res.data || "");

    /* =========================
       FAST LOOP – exit on first hit
    ========================= */
    for (const el of $(".server-list a").toArray()) {
      const a = $(el);
      const encoded = a.attr("data-url") || "";
      if (!encoded) continue;

      const decoded = decodeBase64(encoded).trim();
      if (!decoded) continue;

      const serverName = a.text().trim() || "Unknown";

      try {
        const iframeRes = await axios.get(decoded, {
          headers: {
            ...commonHeaders,
            referer: "https://vidmoly.net/",
            origin: "https://vidmoly.net",
          },
          maxRedirects: 5,
        });

        const body =
          typeof iframeRes.data === "string"
            ? iframeRes.data
            : JSON.stringify(iframeRes.data);

        /* ========= 1️⃣ Vidmoly ========= */
        const vidmolyM3U8 = extractVidmolyM3U8(body);
        if (vidmolyM3U8) {
          return [
            {
              server: serverName,
              link: vidmolyM3U8,
              type: "m3u8",
            },
          ];
        }

        /* ========= 2️⃣ Generic HLS ========= */
        const m3u8 = extractM3U8(body);
        if (m3u8) {
          return [
            {
              server: serverName,
              link: m3u8,
              type: "m3u8",
            },
          ];
        }

        /* ========= 3️⃣ VK ========= */
        const vkMatch = body.match(/"hls"\s*:\s*"([^"]+\.m3u8[^"]*)"/);
        if (vkMatch) {
          return [
            {
              server: serverName,
              link: vkMatch[1].replace(/\\\//g, "/"),
              type: "m3u8",
            },
          ];
        }

        /* ========= 4️⃣ MP4 redirect ========= */
        const finalUrl = iframeRes.request?.res?.responseUrl;
        if (finalUrl && finalUrl.endsWith(".mp4")) {
          return [
            {
              server: serverName,
              link: finalUrl,
              type: "mp4",
            },
          ];
        }
      } catch {
        continue;
      }
    }

    return [];
  } catch (err: any) {
    console.log("stream fetch error:", err?.message || err);
    return [];
  }
};
