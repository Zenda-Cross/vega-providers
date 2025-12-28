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

      // -------- TITLE --------
      const rawTitle =
        $('meta[property="og:title"]').attr("content") ||
        $("title").text() ||
        "";

      const title = rawTitle.replace(/En\s*$/, "").trim();

      // -------- IMAGE --------
      let image =
        $("img.TPostBg").attr("src") ||
        $("div.title-img img").attr("src") ||
        "";

      if (image.startsWith("//")) image = "https:" + image;
      if (image && !image.startsWith("http")) {
        image = new URL(image, link).href;
      }

      // -------- SYNOPSIS --------
      const synopsis = $("div.summary.link-co p")
        .first()
        .text()
        .trim();

      // -------- IMDb --------
      const imdbHref = $("p.dtls a:contains(IMDb)").attr("href") || "";
      const imdbId = imdbHref ? imdbHref.split("/").pop() || "" : "";

      // -------- TYPE --------
      const type = link.includes("film") ? "movie" : "series";

      // -------- LINK LIST --------
      if (type === "series") {
        // Episodes
        const input = $("section.sc-seasons ul li input").first();
        const season = input.attr("data-season");
        const postId = input.attr("post-id");

        if (season && postId) {
          empty.linkList.push({
            title: "Episodes",
            quality: "HD",
            episodesLink: `${link}?season=${season}&id=${postId}`,
            directLinks: [],
          });
        }
      } else {
        // 🎬 MOVIE → PLAY BUTTON
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
        imdbId,
        type,
        linkList: empty.linkList,
      };
    })
    .catch((err: any) => {
      console.error("Coflix meta error:", err?.message || err);
      return empty;
    });
};
