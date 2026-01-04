import { Info, ProviderContext } from "../types";

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
    .get(link)
    .then((res: any) => {
      const $ = cheerio.load(res.data || "");

      // ---------- TITLE ----------
      const title =
        $("h1.entry-title").text().trim() ||
        $('meta[property="og:title"]').attr("content") ||
        "";

      // ---------- IMAGE ----------
      let image =
        $("div.ime img").attr("data-src") ||
        $('meta[property="og:image"]').attr("content") ||
        "";

      if (image && !image.startsWith("http")) {
        image = new URL(image, link).href;
      }

      // ---------- SYNOPSIS ----------
      const synopsis = $("div.entry-content").text().trim();

      // ---------- TYPE ----------
      const typeText = $(".spe").text() || "";
      const type = typeText.includes("Movie") ? "movie" : "series";

      // ---------- BUTTON LOGIC ----------
      if (type === "series") {
        const epPage = $(".eplister li a").attr("href");

        if (epPage) {
          empty.linkList.push({
            title: "Episodes",
            quality: "HD",
            episodesLink: epPage,
            directLinks: [],
          });
        }
      } else {
        // 🎬 Movie → Play
        empty.linkList.push({
          title: "Play",
          quality: "HD",
          episodesLink: link,
          directLinks: [],
        });
      }

      return {
        title,
        synopsis,
        image,
        imdbId: "",
        type,
        linkList: empty.linkList,
      };
    })
    .catch((err: any) => {
      console.error("Donghuastream meta error:", err?.message || err);
      return empty;
    });
};
