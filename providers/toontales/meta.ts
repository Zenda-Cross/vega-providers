import { Info, ProviderContext } from "../types";

export const getMeta = ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> => {
  const { axios, cheerio } = providerContext;

  return axios.get(link, { headers: { Referer: link } }).then((res: any) => {
    const $ = cheerio.load(res.data);

    const title =
      $('meta[property="og:title"]').attr("content")?.trim() || "";

    const image =
      $('meta[property="og:image"]').attr("content")?.trim() || "";

    const synopsis =
      $('meta[property="og:description"]').attr("content")?.trim() || "";

    return {
      title,
      synopsis,
      image,
      imdbId: "",
      type: "movie",
      linkList: [
        {
          title: "Play",
          quality: "HD",
          episodesLink: link,
          directLinks: [],
        },
      ],
    };
  });
};
