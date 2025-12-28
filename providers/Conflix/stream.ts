import { Stream, ProviderContext } from "../types";

/* =========================
   Base64 Decode
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
   Extractors
========================= */
function extractM3U8(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
  return m ? m[0] : null;
}

function extractMP4(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/);
  return m ? m[0] : null;
}

/* =========================
   MAIN STREAM (ALL SERVERS)
========================= */
export const getStream = function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, cheerio, commonHeaders } = providerContext;

  return axios
    .get(link, { headers: commonHeaders })
    .then((res: any) => {
      const $ = cheerio.load(res.data || "");
      const iframeSrc = $("div.embed iframe").attr("src");
      if (!iframeSrc) return [];

      const iframeUrl = iframeSrc.startsWith("http")
        ? iframeSrc
        : new URL(iframeSrc, link).href;

      return axios
        .get(iframeUrl, {
          headers: { ...commonHeaders, referer: link },
        })
        .then((iframeRes: any) => {
          const $$ = cheerio.load(iframeRes.data || "");
          const tasks: Promise<Stream | null>[] = [];

          $$("li[onclick]").each((_, el) => {
            const onclick = $$(el).attr("onclick") || "";
            const base64 = onclick
              .split("showVideo('")[1]
              ?.split("',")[0];

            if (!base64) return;

            const decodedUrl = decodeBase64(base64);
            if (!decodedUrl) return;

            const serverName = $$(el).text().trim() || "Server";

            const task = axios
              .get(decodedUrl, {
                headers: { ...commonHeaders, referer: iframeUrl },
                maxRedirects: 5,
                timeout: 10000,
              })
              .then((playerRes: any) => {
                const body =
                  typeof playerRes.data === "string"
                    ? playerRes.data
                    : JSON.stringify(playerRes.data);

                const m3u8 = extractM3U8(body);
                if (m3u8)
                  return { server: serverName, link: m3u8, type: "m3u8" };

                const mp4 = extractMP4(body);
                if (mp4)
                  return { server: serverName, link: mp4, type: "mp4" };

                const finalUrl =
                  playerRes.request?.res?.responseUrl || "";
                if (finalUrl.endsWith(".mp4"))
                  return { server: serverName, link: finalUrl, type: "mp4" };

                return null;
              })
              .catch(() => null);

            tasks.push(task);
          });

          // ✅ wait for all servers
          return Promise.all(tasks).then((results) =>
            results.filter(Boolean) as Stream[]
          );
        });
    })
    .catch((err: any) => {
      console.error("Coflix stream error:", err?.message || err);
      return [];
    });
};
