import { Stream, ProviderContext } from "../types";

// universal base64 decode
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

  // fallback (older JS engines)
  try {
    return Buffer.from(input, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

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
      const streams: Stream[] = [];

      $("select.mirror option").each((_, el) => {
        const encoded = $(el).attr("value") || "";
        if (!encoded) return;

        const decoded = decodeBase64(encoded);
        if (!decoded) return;

        // 🔥 ONLY RUMBLE
        if (!decoded.includes("rumble.com/embed/")) return;

        // extract ID
        const match = decoded.match(/rumble\.com\/embed\/v([a-zA-Z0-9]+)/);
        if (!match) return;

        const rumbleId = match[1];

        // convert to m3u8
        const m3u8 = `https://rumble.com/hls-vod/${rumbleId}/playlist.m3u8`;

        streams.push({
          server: "Rumble",
          link: m3u8,
          type: "m3u8",
          subtitles: [],
        });
      });

      return streams;
    })
    .catch((err: any) => {
      console.log("animekhor stream error:", err?.message || err);
      return [];
    });
};
