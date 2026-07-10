import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio, commonHeaders: headers } = providerContext;
  console.log("getEpisodeLinks", url);
  try {
    const res = await axios.get(url, {
      headers: {
        ...headers,
        cookie:
          "ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=6yZYfXQxBgjaD1eacR5zZCz7njssbxjtSZZCElTOGk0-1764836255-1.2.1.1-bzHvDcDRLp6AAYo7qvGVzJ6Gk6zaqAepuGiGhAWCGYL.ZDpw5yI4TkUIXDgAnEhGCZ9J5X2_OagzgeMHZrd8rzeyAFQXj0dmYMErcfII7_Rhq5kZ4kAtS0tl9PtaNKKd2m4taIufySXCCstl3iNLMODTjbsW_KZi8U8DauOdGSAhBd1DCGxvLlAOM.snfkhb0yQiVJcLW8Bv9IeKQac0ar_TKkV6QexqNZYiyRXnE7E; xla=s4t",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0",
      },
    });
    const $ = cheerio.load(res.data);
    const container = $(".entry-content,.entry-inner");
    $(".unili-content,.code-block-1").remove();
    const episodes: EpisodeLink[] = [];
    container.find("h4").each((index, element) => {
      const el = $(element);
      const title = el.text().replace(/-/g, "").replace(/:/g, "");
      const link = el
        .next("p")
        .find(
          '.btn-outline[style="background:linear-gradient(135deg,#ed0b0b,#f2d152); color: white;"]'
        )
        .parent()
        .attr("href");
      if (title && link) {
        episodes.push({ title, link });
      }
    });
    // console.log(episodes);
    return episodes;
  } catch (err) {
    console.log("getEpisodeLinks error: ");
    // console.error(err);
    return [];
  }
};
