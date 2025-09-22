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
    const streams: Stream[] = [];

    // --- GDFlix type link handling
    if (link.toLowerCase().includes("gdlink") || link.toLowerCase().includes("gdflix")) {
      const res = await axios.get(link, {
        headers: {
          Referer: "https://google.com",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
      });

      const $ = cheerio.load(res.data);

      $("a[href]").each((_, el) => {
        const $el = $(el);
        const href = ($el.attr("href") || "").trim();
        if (!href.toLowerCase().includes("pixeldrain")) return;

        const text = ($el.text() || "").trim() || "PixelDrain";
        const parentText = $el.parent().text() || "";
        const sizeMatch = parentText.match(/\[(.*?)\]/);
        const size = sizeMatch ? ` [${sizeMatch[1]}]` : "";

        streams.push({
          server: `${text}${size}`,
          link: href,
          type: "file",
        });
      });
    }

    // --- V-Cloud type link handling
    if (link.toLowerCase().includes("vcloud.lol")) {
      const res = await axios.get(link, {
        headers: {
          Referer: "https://google.com",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
      });

      const $ = cheerio.load(res.data);

      // 1️⃣ Find Pixeldrain embed URL in V-Cloud page
      const embedAnchor = $("a[href*='pixeldrain.dev/u/']");
      embedAnchor.each((_, el) => {
        const $el = $(el);
        const embedUrl = ($el.attr("href") || "").trim();
        if (!embedUrl) return;

        // 2️⃣ Extract file ID and construct direct download link
        const fileIdMatch = embedUrl.match(/\/u\/([a-zA-Z0-9]+)/);
        if (fileIdMatch) {
          const downloadLink = `https://pixeldrain.dev/api/file/${fileIdMatch[1]}?download`;
          const text = ($el.text() || "PixelDrain").trim();
          streams.push({
            server: text,
            link: downloadLink,
            type: "file",
          });
        }
      });
    }

    return streams;
  } catch (err) {
    console.error(
      "vgmlinks getStream error:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
};
