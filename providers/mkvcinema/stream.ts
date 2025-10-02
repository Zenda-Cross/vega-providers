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

    // --- Helper function (Promise-returning, no "async" keyword inside async fn)
    function scrapeGDFlix(gdflixLink: string): Promise<Stream[]> {
      return axios
        .get(gdflixLink, {
          headers: {
            Referer: link,
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          },
        })
        .then((gdRes) => {
          const $gd = cheerio.load(gdRes.data);
          const gdStreams: Stream[] = [];

          $gd("a[href]").each((_, el) => {
            const $el = $gd(el);
            const hrefAttr = $el.attr("href") || "";
            const text = ($el.text() || "").trim();

            if (!hrefAttr) return;
            if (hrefAttr.toLowerCase().includes("pixeldrain")) {
              const parentText = $el.parent().text() || "";
              const sizeMatch = parentText.match(/\[(.*?)\]/);
              const size = sizeMatch ? ` [${sizeMatch[1]}]` : "";

              gdStreams.push({
                server: (text || "PixelDrain") + size,
                link: hrefAttr,
                type: "file",
              });
            }
          });

          return gdStreams;
        });
    }

    // --- Case 1: Direct GDFlix file link
    if (link.includes("gdflix.dev/file/")) {
      return await scrapeGDFlix(link);
    }

    // --- Case 2: Aggregator page (mainlinks.today, etc.)
    const res = await axios.get(link, {
      headers: {
        Referer: "https://google.com",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });
    const $ = cheerio.load(res.data);

    let gdflixLink = "";
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (href.includes("gdflix")) {
        gdflixLink = href;
      }
    });

    if (gdflixLink) {
      const gdStreams = await scrapeGDFlix(gdflixLink);
      streams.push(...gdStreams);
    }

    return streams;
  } catch (err) {
    console.error("getStream error:", err);
    return [];
  }
};
