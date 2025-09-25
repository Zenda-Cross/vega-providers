import { Info, Link, ProviderContext } from "../types";

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Cache-Control": "no-store",
  "Accept-Language": "en-US,en;q=0.9",
  DNT: "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

export const getMeta = function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;

  return axios
    .get(link, { headers })
    .then((response) => {
      const $ = cheerio.load(response.data);
      const infoContainer = $(".entry-content,.post-inner");

      const title =
        $("h1.entry-title").text().trim() ||
        $("h2.entry-title").text().trim() ||
        "";

      const imdbMatch = infoContainer.html()?.match(/tt\d+/);
      const imdbId = imdbMatch ? imdbMatch[0] : "";

      const synopsis =
        infoContainer
          .find("h3:contains('SYNOPSIS'), h3:contains('synopsis')")
          .next("p")
          .text()
          .trim() || "";

      let image = infoContainer.find("img").first().attr("src") || "";
      if (image.startsWith("//")) image = "https:" + image;

      const type = /Season \d+/i.test(infoContainer.text()) ? "series" : "movie";
      const linkList: Link[] = [];

      if (type === "series") {
        // ✅ Series ke liye sirf V-Cloud links
        infoContainer.find("h3").each((_, el) => {
          const el$ = $(el);
          const seasonTitle = el$.text().trim();
          if (!/Season \d+/i.test(seasonTitle)) return;

          const vcloudLinks: string[] = [];

          el$.nextUntil("h3").find("a").each((_, aEl) => {
            const href = $(aEl).attr("href")?.trim() || "";
            const btnText = $(aEl).text().trim() || "";
            if (href.includes("vcloud.lol") || btnText.includes("V-Cloud")) {
              vcloudLinks.push(href);
            }
          });

          if (vcloudLinks.length > 0) {
            linkList.push({
              title: seasonTitle,
              episodesLink: vcloudLinks[0],
              directLinks: vcloudLinks.map((l, i) => ({
                title: `Episode ${i + 1}`,
                link: l,
                type: "series",
              })),
            });
          }
        });
      } else {
        // ✅ Movie ke liye direct links fetch karenge
        infoContainer.find("h5").each((_, h5El) => {
          const el$ = $(h5El);
          const movieTitle = el$.text().trim();
          const directLinks: Link["directLinks"] = [];

          // h5 ke next p me <a> tags search
          el$.next("p").find("a").each((_, aEl) => {
            const href = $(aEl).attr("href")?.trim() || "";
            if (href) {
              directLinks.push({
                title: movieTitle,
                link: href,
                type: "movie",
              });
            }
          });

          if (directLinks.length) {
            linkList.push({
              title: movieTitle,
              directLinks,
              episodesLink: "",
            });
          }
        });
      }

      return { title, synopsis, image, imdbId, type, linkList };
    })
    .catch((err) => {
      console.error("getMeta error:", err);
      return {
        title: "",
        synopsis: "",
        image: "",
        imdbId: "",
        type: "movie",
        linkList: [],
      };
    });
};
