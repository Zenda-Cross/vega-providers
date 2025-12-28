import { Info, ProviderContext } from "../types";

const headers = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-store",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
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
    .then((epRes: any) => {
      const $ep = cheerio.load(epRes.data || "");

      // Find anime page from breadcrumb or fallback
      const animePage =
        $ep('span[itemprop="itemListElement"] a[href*="/anime/"]')
          .first()
          .attr("href") || link;

      return axios.get(animePage, { headers }).then((animeRes: any) => {
        const $ = cheerio.load(animeRes.data || "");

        // ---------------- META DATA ----------------
        const title = $("h1.entry-title").first().text().trim();
        let image = $(".thumbook img").first().attr("src") || "";
        if (image.startsWith("//")) image = "https:" + image;

        const synopsis = $(".desc").first().text().trim();

        const info: Info = {
          title,
          synopsis,
          image,
          imdbId: "",
          type: "series",
          linkList: [],
        };

        // ---------------- EPISODE LINKS ----------------
        $(".eplister .inepcx a").each((_i, el) => {
          const epLink = $(el).attr("href") || "";
          const epTitle = $(el).find("span.epcur").text().trim() || "Episode";
          if (epLink) {
            info.linkList.push({
              title: epTitle,
              quality: "Ongoing",
              episodesLink: epLink,
              directLinks: [],
            });
          }
        });

        // If no episode list found, fallback to main anime page
        if (!info.linkList.length) {
          info.linkList.push({
            title: "All Episodes",
            quality: "Ongoing",
            episodesLink: animePage,
            directLinks: [],
          });
        }

        return info;
      });
    })
    .catch((err: any) => {
      console.log("animenosub meta error:", err?.message || err);
      return empty;
    });
};
