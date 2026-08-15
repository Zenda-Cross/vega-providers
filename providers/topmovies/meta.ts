import { Info, Link, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";
import {
  addCinemetaContext,
  applyCinemetaMeta,
  getCinemetaMeta,
  getCinemetaSeason,
} from "../getCinemetaMeta";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio } = providerContext;
    const baseUrl = await getBaseUrl("Topmovies");
    const url = new URL(link, `${baseUrl}/`).href;
    const res = await axios.get(url);
    const data = res.data;
    const $ = cheerio.load(data);
    const meta: Info = {
      title: $(".imdbwp__title").text(),
      synopsis: $(".imdbwp__teaser").text(),
      image: $(".imdbwp__thumb").find("img").attr("src") || "",
      imdbId: $(".imdbwp__link").attr("href")?.split("/")[4] || "",
      type: $(".thecontent").text().toLocaleLowerCase().includes("season")
        ? "series"
        : "movie",
      linkList: [],
      webUrl: url,
    };
    const links: Link[] = [];

    $("h3,h4").map((i, element) => {
      const seriesTitle = $(element).text();
      // const batchZipLink = $(element)
      //   .next("p")
      //   .find(".maxbutton-batch-zip,.maxbutton-zip-download")
      //   .attr("href");
      const episodesLink = $(element)
        .next("p")
        .find(
          ".maxbutton-episode-links,.maxbutton-g-drive,.maxbutton-af-download",
        )
        .attr("href");
      const movieLink = $(element)
        .next("p")
        .find(".maxbutton-download-links")
        .attr("href");

      if (
        movieLink ||
        (episodesLink && episodesLink !== "javascript:void(0);")
      ) {
        links.push({
          title: seriesTitle.replace("Download ", "").trim() || "Download",
          episodesLink: episodesLink || "",
          directLinks: movieLink
            ? [{ link: movieLink, title: "Movie", type: "movie" }]
            : [],
          quality: seriesTitle?.match(/\d+p\b/)?.[0] || "",
        });
      }
    });
    const imdbId = meta.imdbId;
    meta.linkList = links;
    if (!imdbId) return meta;

    const cinemeta = await getCinemetaMeta(imdbId, meta.type, providerContext);
    if (meta.type === "series" && cinemeta.type === "series") {
      meta.linkList = meta.linkList.map((item) => {
        if (!item.episodesLink) return item;
        const season =
          getCinemetaSeason(item.title) || getCinemetaSeason(meta.title);
        if (!season) return item;
        return {
          ...item,
          episodesLink: addCinemetaContext(
            new URL(item.episodesLink, url).href,
            imdbId,
            season,
          ),
        };
      });
    }
    return applyCinemetaMeta(meta, cinemeta);
  } catch (err) {
    throwProviderError("TopMovies", "metadata", err);
  }
};
