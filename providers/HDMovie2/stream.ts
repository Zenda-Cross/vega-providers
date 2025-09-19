import { Stream, ProviderContext } from "../types";

export const getStream = async function ({
  link,
  type,
  providerContext,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    const { axios, cheerio } = providerContext;

    const res = await axios.get(link, {
      headers: {
        Referer: "https://google.com",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(res.data);
    const streams: Stream[] = [];

    // --- Select PixelDrain links from download buttons / anchors
    $("a[href]").each((_, el) => {
      const $el = $(el);
      const hrefAttr = $el.attr("href") || "";
      const text = ($el.text() || "").trim();

      if (!hrefAttr) return;

      const href = hrefAttr.trim();
      const lowerHref = href.toLowerCase();

      // ✅ Only pick PixelDrain links
      if (lowerHref.includes("pixeldrain")) {
        // Try to extract size if present in parent text
        const parentText = $el.parent().text() || "";
        const sizeMatch = parentText.match(/\[(.*?)\]/);
        const size = sizeMatch ? ` [${sizeMatch[1]}]` : "";

        streams.push({
          server: (text || "PixelDrain") + size,
          link: href,
          type: "file", // treat PixelDrain as direct file
        });
      }
    });

    return streams;
  } catch (err) {
    console.error("hdmovie2 getStream error:", err);
    return [];
  }
};
