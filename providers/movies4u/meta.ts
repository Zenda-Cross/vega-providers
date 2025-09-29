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
  Cookie:
    "xla=s4t; _ga=GA1.1.1081149560.1756378968; _ga_BLZGKYN5PF=GS2.1.s1756378968$o1$g1$t1756378984$j44$l0$h0",
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
    const infoContainer = $(".entry-content, .post-inner").length
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

    // --- Type determination ---
    const infoParagraph = $("h2.movie-title").next("p").text();
    if (
      infoParagraph.includes("Season:") ||
      infoParagraph.includes("Episode:") ||
      infoParagraph.includes("SHOW Name:")
    ) {
      result.type = "series";
    } else {
      result.type = "movie";
    }

    // --- Title ---
    const rawTitle = $("h1").text().trim() || $("h2").text().trim();
    result.title = rawTitle.split(/\[| \d+p| x\d+/)[0].trim();
    const showNameMatch =
      infoParagraph.match(/SHOW Name: (.+)/) ||
      infoParagraph.match(/Name: (.+)/);
    if (showNameMatch && showNameMatch[1]) {
      result.title = result.title || showNameMatch[1].trim();
    }

    // --- IMDb ID ---
    const imdbMatch =
      infoContainer.html()?.match(/tt\d+/) ||
      $("a[href*='imdb.com/title/']").attr("href")?.match(/tt\d+/);
    result.imdbId = imdbMatch ? imdbMatch[0] : "";

    // --- Image ---
    let image =
      infoContainer.find(".post-thumbnail img").attr("src") ||
      infoContainer.find("img[src]").first().attr("src") ||
      "";
    if (image.startsWith("//")) image = "https:" + image;
    else if (image.startsWith("/")) image = baseUrl + image;
    if (image.includes("no-thumbnail") || image.includes("placeholder"))
      image = "";
    result.image = image;

    // --- Synopsis ---
    result.synopsis =
      $("h3.movie-title")
        .filter((i, el) => $(el).text().includes("Storyline"))
        .next("p")
        .text()
        .trim() ||
      infoContainer.find("p").first().text().trim() ||
      "";

    // --- LinkList extraction ---
    const links: Link[] = [];
    const h4Elements = $(".download-links-div").find("> h4");

    h4Elements.each((index, element) => {
      const el = $(element);
      const titleText = el.text().trim();
      const qualityMatch = titleText.match(/\d+p\b/)?.[0];
      const fullTitle = titleText;

      const downloadButtons = el.next(".downloads-btns-div").find("a");

      if (downloadButtons.length && qualityMatch) {
        if (result.type === "series") {
          links.push({
            title: fullTitle,
            quality: qualityMatch,
            episodesLink: downloadButtons.attr("href") || "",
            directLinks: [],
          });
        } else {
          // Movie: collect all direct download buttons
          const directLinks: Link["directLinks"] = [];

          downloadButtons.each((i, btn) => {
            const btnEl = $(btn);
            const link = btnEl.attr("href");
            if (link) {
              directLinks.push({
                title: btnEl.text().trim() || "Download",
                link,
                type: "movie", // literal type
              });
            }
          });

          if (directLinks.length) {
            links.push({
              title: fullTitle,
              quality: qualityMatch,
              episodesLink: "",
              directLinks,
            });
          }
        }
      }
    });

    result.linkList = links;
    return result;
  } catch (err) {
    console.log("getMeta error:", err);
    return emptyResult;
  }
};
