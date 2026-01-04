import { Info, ProviderContext } from "../types";

export const getMeta = ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> => {
  const { axios, cheerio } = providerContext;

  return axios.get(link).then((res: any) => {
    const $ = cheerio.load(res.data);

    const title =
      $("div.header-content h1").first().text().trim();

    const image =
      $("a.blog-img img").attr("data-src") ||
      $("img").first().attr("src") ||
      "";

    const synopsis =
      $("div.entry-content").text().trim();

    const info: Info = {
      title,
      synopsis,
      image,
      imdbId: "",
      type: "series",
      linkList: [
        {
          title: "Episodes",
          quality: "Episodes",
          episodesLink: link,
          directLinks: [],
        },
      ],
    };

    return info;
  });
};
