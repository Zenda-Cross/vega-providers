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

    // 1️⃣ Step: Get GDFlix page
    const res = await axios.get(link, {
      headers: {
        Referer: "https://google.com",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(res.data);
    const streams: Stream[] = [];

    // 2️⃣ Step: Only pick GDFlix buttons/links
    $("a[href]").each((_, el) => {
      const $el = $(el);
      const href = ($el.attr("href") || "").trim().toLowerCase();
      if (!href.includes("gdflix")) return; // Ignore non-GDFlix

      // 3️⃣ Step: Follow GDFlix link to get PixelDrain
      streams.push({ server: "GDFlix", link: href, type: "gdflix" });
    });

    const finalStreams: Stream[] = [];

    // 4️⃣ Step: Convert each GDFlix link to PixelDrain link
    for (const stream of streams) {
      const gdRes = await axios.get(stream.link, {
        headers: {
          Referer: link,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
      });
      const $gd = cheerio.load(gdRes.data);

      // ✅ Only pick PixelDrain links inside GDFlix page
      $gd("a[href]").each((_, el) => {
        const $el = $gd(el);
        const pixelHref = ($el.attr("href") || "").trim();
        if (!pixelHref.toLowerCase().includes("pixeldrain")) return;

        const text = ($el.text() || "").trim() || "PixelDrain";
        const parentText = $el.parent().text() || "";
        const sizeMatch = parentText.match(/\[(.*?)\]/);
        const size = sizeMatch ? ` [${sizeMatch[1]}]` : "";

        finalStreams.push({
          server: text + size,
          link: pixelHref,
          type: "file",
        });
      });
    }

    return finalStreams;
  } catch (err) {
    console.error("getStream error:", err instanceof Error ? err.message : String(err));
    return [];
  }
};
