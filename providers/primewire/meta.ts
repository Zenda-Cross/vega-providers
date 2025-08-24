import { Info, Link, ProviderContext } from "../types";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio } = providerContext;
    const url = link;
    const baseUrl = link.split("/").slice(0, 3).join("/");
    const res = await axios.get(url, { headers: providerContext.commonHeaders });
    const html = res.data;
    const $ = cheerio.load(html);

    // ✅ Metadata Extraction
    const imdbId =
      $(".movie_info")
        .find('a[href*="imdb.com/title/tt"]:not([href*="imdb.com/title/tt/"])')
        .attr("href")
        ?.split("/")[4] || "";

    const title =
      $(".movie_title, h1.entry-title").first().text().trim() ||
      $("meta[property='og:title']").attr("content") ||
      "";

    const synopsis =
      $(".movie_synopsis p, .entry-content p, .movie-summary-content p").first().text().trim() ||
      $("meta[name='description']").attr("content") ||
      "";

    const image =
      $(".movie_thumb img, .poster img, .featured img").attr("src") ||
      $("meta[property='og:image']").attr("content") ||
      "";

    const linkList: Link[] = [];
    const type = $(".show_season").length > 0 ? "series" : "movie";

    if (type === "series") {
      $(".show_season").each((i, element) => {
        const seasonTitle = "Season " + $(element).attr("data-id");
        const episodes: Link["directLinks"] = [];
        $(element)
          .children()
          .each((i, element2) => {
            const $el = $(element2);
            const episodeTitle = $el.text().trim();
            const episodeLink = $el.find("a").attr("href");
            const episodeNumber = episodeTitle.match(/E(\d+)/i)?.[1];
            
            if (episodeTitle && episodeLink) {
                episodes.push({
                    title: `Episode ${episodeNumber || i + 1} - ${episodeTitle}`,
                    link: baseUrl + episodeLink,
                    type: "episode",
                });
            }
          });
        linkList.push({
          title: seasonTitle,
          directLinks: episodes,
        });
      });
    } else {
      // Logic for movies
      const movieLinks: Link["directLinks"] = [];
      $(".download-links a, .download a, .entry-content a, a.btn").each((i, el) => {
          const $el = $(el);
          const href = $el.attr("href");
          const linkTitle = $el.text().trim() || "Download Link";

          if (href && href !== "#") {
              movieLinks.push({
                  title: linkTitle,
                  link: baseUrl + href,
                  type: "movie",
              });
          }
      });
      if (movieLinks.length > 0) {
        linkList.push({
          title: "Movie Links",
          directLinks: movieLinks,
        });
      }
    }

    return {
      title: title || "",
      image: image || "",
      imdbId: imdbId,
      synopsis: synopsis || "",
      type: type,
      linkList: linkList,
    };
  } catch (error) {
    console.error("cinemalux getMeta error:", error);
    return {
      title: "",
      image: "",
      imdbId: "",
      synopsis: "",
      linkList: [],
      type: "movie",
    };
  }
};
