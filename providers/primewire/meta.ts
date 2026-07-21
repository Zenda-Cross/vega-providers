import { Info, Link, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio } = providerContext;
    const baseUrl = await getBaseUrl("primewire");
    const url = new URL(link, `${baseUrl}/`).href;
    const res = await axios.get(url);
    const html = await res.data;
    const $ = cheerio.load(html);
    const imdbId =
      $(".movie_info")
        .find('a[href*="imdb.com/title/tt"]:not([href*="imdb.com/title/tt/"])')
        .attr("href")
        ?.split("/")[4] || "";
    const type = $(".show_season").html() ? "series" : "movie";
    const linkList: Link[] = [];
    $(".show_season").each((i, element) => {
      const seasonTitle = "Season " + $(element).attr("data-id");
      const episodes: Link["directLinks"] = [];
      $(element)
        .children()
        .each((i, element2) => {
          const episodeTitle = $(element2)
            .find("a")
            .children()
            .remove()
            .end()
            .text()
            .trim()
            .replace("E", "Epiosode ");
          const episodeLink = baseUrl + $(element2).find("a").attr("href");
          if (episodeTitle && episodeLink) {
            episodes.push({
              title: episodeTitle,
              link: episodeLink,
            });
          }
        });
      linkList.push({
        title: seasonTitle,
        directLinks: episodes,
      });
    });
    if (type === "movie") {
      linkList.push({
        title: "Movie",
        directLinks: [
          {
            link: link,
            title: "Movie",
            type: "movie",
          },
        ],
      });
    }
    return {
      title: "",
      image: "",
      imdbId: imdbId,
      synopsis: "",
      type: type,
      linkList: linkList,
      webUrl: url,
    };
  } catch (error) {
    console.error(error);
    return {
      title: "",
      image: "",
      imdbId: "",
      synopsis: "",
      linkList: [],
      type: "uhd",
    };
  }
};
