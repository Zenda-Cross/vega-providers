import { Info, Link, ProviderContext } from "../types";

const headers = {
  Referer: "https://google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio } = providerContext;

    // --- Ensure full URL
    if (!link.startsWith("http")) {
      link = new URL(link, "https://ufilmywap.info").href;
    }

    const res = await axios.get(link, { headers });
    const $ = cheerio.load(res.data);

    // --- Title
    let title = $("h2.wp-block-heading").first().text().trim();
    title = title.replace(/^Name:\s*/, "") || "Unknown";

    // --- Synopsis
    let synopsis = "";
    $("p.has-small-font-size").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 40 && !text.toLowerCase().includes("download")) {
        synopsis = text;
        return false;
      }
    });

    // --- Image
    let image = $("figure.wp-block-image img").first().attr("src") || "";
    if (image && !image.startsWith("http")) image = new URL(image, link).href;

    // --- IMDb ID (ufilmywap me mostly missing)
    const imdbId = "";

    // --- Collect links from ufilmywap
    const links: Link[] = [];
    $("a.wp-block-button__link").each((_, el) => {
      let href = $(el).attr("href") || "";
      const text = $(el).text().trim() || "Download";
      if (!href) return;

      if (!href.startsWith("http")) href = new URL(href, link).href;

      const qualityMatch = text.match(/\b(480P|720P|1080P|720PHEVC|HD)\b/i);
      const quality = qualityMatch ? qualityMatch[0] : "AUTO";

      links.push({
        title: text,
        directLinks: [
          {
            link: href,
            title: text,
            quality,
            type: "movie",
          },
        ],
      });
    });

    // --- Now fetch linkmake.in page if exists
    $("a.wp-block-button__link").each((_, el) => {
      const extraPageUrl = $(el).attr("href") || "";
      if (!extraPageUrl.includes("linkmake.in/view/")) return;

      try {
        // eslint-disable-next-line no-await-in-loop
        axios.get(extraPageUrl, { headers }).then(extraRes => {
          const $$ = cheerio.load(extraRes.data);

          $$("div.dlink.dl a").each((_, e) => {
            let href = $$(e).attr("href")?.trim() || "";
            const text = $$(e).find(".dll").text().trim() || "Download";
            if (!href) return;
            if (!href.startsWith("http")) href = new URL(href, extraPageUrl).href;

            const qualityMatch = text.match(/\b(480p|720p|1080p|HEVC)\b/i);
            const quality = qualityMatch ? qualityMatch[0].toUpperCase() : "AUTO";

            links.push({
              title: text,
              directLinks: [
                {
                  link: href,
                  title: text,
                  quality,
                  type: "movie",
                },
              ],
            });
          });
        });
      } catch (e) {
        console.error("Error scraping linkmake.in:", e);
      }
    });

    // --- Return final Info object
    return {
      title,
      synopsis,
      image,
      type: "movie",
      linkList: links,
      imdbId,
    };
  } catch (err) {
    console.error("ufilmywap getMeta error:", err);
    return {
      title: "",
      synopsis: "",
      image: "",
      type: "movie",
      linkList: [],
      imdbId: "",
    };
  }
};
