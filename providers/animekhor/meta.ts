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

  // ---------------- LOAD EPISODE PAGE ----------------
  return axios
    .get(link, { headers })
    .then((epRes: any) => {
      const $ep = cheerio.load(epRes.data || "");

      // find anime page from breadcrumb
      const animePage =
        $ep('span[itemprop="itemListElement"] a[href*="/anime/"]')
          .first()
          .attr("href") || "";

      if (!animePage) {
        throw new Error("Anime page not found");
      }

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

        // ---------------- LATEST EPISODE ----------------
        const latestEpLink =
          $(".epcurlast").closest("a").attr("href") || "";

        const latestEpText = $(".epcurlast").text().trim();

        // ---------------- ALL EPISODES ----------------
        info.linkList.push({
          title: "All Episodes",
          quality: "Ongoing",
          episodesLink: animePage,
          directLinks: [],
        });

        return info;
      });
    })
    .catch((err: any) => {
      console.log("animekhor meta error:", err?.message || err);
      return empty;
    });
};
