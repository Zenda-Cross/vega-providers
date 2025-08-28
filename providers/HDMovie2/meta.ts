import { Info, Link, ProviderContext } from "../types";

const hdbHeaders = {
  Referer: "https://google.com",
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
  try {
    const { axios, cheerio } = providerContext;
    const res = await axios.get(link, { headers: hdbHeaders });
    const $ = cheerio.load(res.data);

    const container = $("#single");

    // --- Title
    const title =
      container.find("h1.entry-title").text().trim() ||
      $("meta[property='og:title']")
        .attr("content")
        ?.replace(" - Hdmovie2", "")
        .trim() ||
      "Unknown";

    // --- Type
    const type = title.toLowerCase().includes("season") ? "series" : "movie";

    // --- Image
    const image =
      container.find(".poster img").attr("src") ||
      $("meta[property='og:image']").attr("content") ||
      "";

    // --- Synopsis (first valid paragraph)
    let synopsis = "";
    container.find(".entry-content p").each((_, el) => {
      const text = $(el).text().trim();
      if (text && !text.includes("Watch Online HD Print")) {
        synopsis = text;
        return false; // exit after first valid para
      }
    });

    // --- Rating, IMDB ID, Tags, Cast
    const rating =
      container.find(".imdb span[itemprop='ratingValue']").text().trim() || "";
    const imdbId =
      container.find(".imdb a").attr("href")?.split("/")[4] || "";
    const tags = container
      .find(".sgeneros a")
      .map((_, el) => $(el).text().trim())
      .get();
    const cast = container
      .find(".cast .person a")
      .map((_, el) => $(el).text().trim())
      .get();

    // --- Links
    const linkList: Link[] = [];

    // --- Play Button (all servers inside)
    const playServers: Link["directLinks"] = [];
    container.find("#playeroptionsul li").each((_, el) => {
      const linkEl = $(el);
      const linkTitle = linkEl.find(".title").text().trim() || "Server";
      const linkDataPost = linkEl.attr("data-post");
      const linkDataNume = linkEl.attr("data-nume");

      if (linkDataPost && linkDataNume && linkDataNume !== "trailer") {
        playServers.push({
          title: linkTitle,
          link: `https://hdmovie2.careers/wp-json/dooplayer/v2/${linkDataPost}/${linkDataNume}`,
        });
      }
    });

    if (playServers.length > 0) {
      linkList.push({
        title: "Play",
        directLinks: playServers,
      });
    }

    // --- Download Links
    const downloadLinks: Link["directLinks"] = [];
    container.find(".dooplay_player .downloads a").each((_, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim();
      if (href && text) {
        downloadLinks.push({
          title: text,
          link: href,
          quality:
            text.match(/\b(480p|720p|1080p|2160p|4k|hd)\b/i)?.[0] || "AUTO",
        });
      }
    });

    if (downloadLinks.length > 0) {
      linkList.push({
        title: "Download",
        directLinks: downloadLinks,
      });
    }

    return {
      title,
      synopsis,
      image,
      imdbId,
      type,
      tags,
      cast,
      rating,
      linkList,
    };
  } catch (err) {
    console.error("HDMovie2 getMeta error:", err);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      tags: [],
      cast: [],
      rating: "",
      linkList: [],
    };
  }
};
