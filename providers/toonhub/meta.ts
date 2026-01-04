import { Info, ProviderContext } from "../types";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;
  const res = await axios.get(link);
  const $ = cheerio.load(res.data);

  const title =
    $('meta[property="og:title"]').attr("content")?.split("[")[0] || "";

  const image = $('meta[property="og:image"]').attr("content") || "";

  const synopsis =
    $('meta[property="og:description"]').attr("content") || "";

  const isSeries = $("strong:contains('TV Series')").length > 0;

  return {
    title,
    synopsis,
    image,
    imdbId: "",
    type: isSeries ? "series" : "movie",
    linkList: [
      {
        title: isSeries ? "Episodes" : "Play",
        quality: "HD",
        episodesLink: link,
        directLinks: [],
      },
    ],
  };
}
