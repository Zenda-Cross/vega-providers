import { Info, Link, ProviderContext } from "../types";

// Headers
const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Cache-Control": "no-store",
  "Accept-Language": "en-US,en;q=0.9",
  DNT: "1",
  "sec-ch-ua":
    '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;
  const url = link;
  const baseUrl = url.split("/").slice(0, 3).join("/");

  const emptyResult: Info = {
    title: "",
    synopsis: "",
    image: "",
    imdbId: "",
    type: "movie",
    linkList: [],
  };

  try {
    const response = await axios.get(url, {
      headers: { ...headers, Referer: baseUrl },
    });
    const $ = cheerio.load(response.data);
    const content = $(".entry-content, .post-inner").length
      ? $(".entry-content, .post-inner")
      : $("body");

    const result: Info = {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };

    // --- Title ---
    let rawTitle = content.find("h1, h2").first().text().trim();
    rawTitle = rawTitle.replace(/^Download\s*/i, ""); // Download text remove
    result.title = rawTitle;

    // --- Type Detect ---
    const pageText = content.text();
    if (/Season\s*\d+/i.test(pageText) || /Episode\s*\d+/i.test(pageText)) {
      result.type = "series";
    } else {
      result.type = "movie";
    }

    // --- IMDb ID ---
    const imdbHref = content.find("a[href*='imdb.com/title/']").attr("href");
    const imdbMatch = imdbHref?.match(/tt\d+/);
    result.imdbId = imdbMatch ? imdbMatch[0] : "";

    // --- Image ---
    let image =
      content.find("img").first().attr("data-src") ||
      content.find("img").first().attr("src") ||
      "";
    if (image.startsWith("//")) image = "https:" + image;
    else if (image.startsWith("/")) image = baseUrl + image;
    if (image.includes("no-thumbnail") || image.includes("placeholder"))
      image = "";
    result.image = image;

    // --- Synopsis ---
    result.synopsis = content.find("p").first().text().trim() || "";

    // --- Download Links Extraction ---
    const links: Link[] = [];

    if (result.type === "series") {
      // ✅ Series case: सिर्फ V-Cloud वाला और title = पूरा <h3> का text
      content.find("h3").each((_, h3) => {
        const h3Text = $(h3).text().trim();
        const qualityMatch = h3Text.match(/\d+p/)?.[0] || "";

        const vcloudLink = $(h3)
          .next("p")
          .find("a")
          .filter((_, a) => /v-cloud/i.test($(a).text()))
          .first();

        const href = vcloudLink.attr("href");
        if (href) {
          links.push({
            title: h3Text,
            quality: qualityMatch,
            episodesLink: href, // Episode button
            directLinks: [], // Empty for series
          });
        }
      });
    } else {
      // ✅ Movie case: h5 text as title + download link
      content.find("h5").each((_, h5) => {
        const h5Text = $(h5).text().trim();
        const qualityMatch = h5Text.match(/\d+p/)?.[0] || "";

        const href = $(h5).next("p").find("a").attr("href");
        if (href) {
          links.push({
            title: h5Text,
            quality: qualityMatch,
            episodesLink: "",
            directLinks: [
              { title: "Movie", link: href, type: "movie" }, // Play/Download button
            ],
          });
        }
      });
    }

    result.linkList = links;
    return result;
  } catch (err) {
    console.error("getMeta error:", err instanceof Error ? err.message : err);
    return emptyResult;
  }
};
