import { Info, ProviderContext } from "../types";

const headers = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-store",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Referer: "https://kaido.to",
};

export const getMeta = function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;

  const empty: Info = {
    title: "",
    synopsis: "",
    image: "",
    imdbId: "",
    type: "series",
    linkList: [],
  };

  return axios
    .get(link, { headers })
    .then((res: any) => {
      const $ = cheerio.load(res.data || "");

      // ---------------- TITLE ----------------
      const title =
        $("h2.film-name").first().text().trim() ||
        $(".breadcrumb-item.active").text().trim();

      // ---------------- IMAGE ----------------
      let image =
        $(".anisc-poster img").attr("src") ||
        $(".anis-cover")
          .attr("style")
          ?.match(/url\((.*?)\)/)?.[1] ||
        "";

      if (image.startsWith("//")) image = "https:" + image;

      // ---------------- SYNOPSIS ----------------
      const synopsis =
        $(".film-description .text").text().trim() ||
        $(".anisc-info .item .text").first().text().trim();

      // ---------------- WATCH BASE URL ----------------
      let watchBase = $(".film-buttons a.btn-play").attr("href") || "";
      if (watchBase && !watchBase.startsWith("http")) {
        watchBase = "https://kaido.to" + watchBase;
      }

      const info: Info = {
        title,
        synopsis,
        image,
        imdbId: "",
        type: "series",
        linkList: [],
      };

      // ---------------- EPISODE IDS ----------------
      const episodeIds: string[] = [];

      $("a").each((_, el) => {
        const href = $(el).attr("href") || "";
        const match = href.match(/ep=(\d+)/);
        if (match && !episodeIds.includes(match[1])) {
          episodeIds.push(match[1]);
        }
      });

      // ---------------- BUILD LINKLIST ----------------
      if (watchBase) {
        info.linkList.push({
          title: "Episodes",
          quality: "HD",
          episodesLink: watchBase,
          directLinks: episodeIds.map((ep) => ({
            title: `Episode ${ep}`,
            link: `${watchBase}?ep=${ep}`,
          })),
        });
      }

      return info;
    })
    .catch((err: any) => {
      console.error("Kaido meta error:", err?.message || err);
      return empty;
    });
};
