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

// --- getMeta using Promise ---
export const getMeta = async function ({
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

      const type = /Season \d+/i.test(infoContainer.text())
        ? "series"
        : "movie";
      const linkList: Link[] = [];

      if (type === "series") {
        // Single Episode Links
        infoContainer.find("h2 a").each((_, el) => {
          const el$ = $(el);
          const href = el$.attr("href")?.trim();
          const linkText = el$.text().trim();
          if (href && linkText.includes("Single Episode")) {
            linkList.push({
              title: linkText,
              episodesLink: href,
              directLinks: [],
            });
          }
        });
      } else {
        // Movies
        infoContainer.find("a[href]").each((_, aEl) => {
          const el$ = $(aEl);
          const href = el$.attr("href")?.trim() || "";
          if (!href) return;
          const btnText = el$.text().trim() || "Download";
          linkList.push({
            title: btnText,
            directLinks: [{ title: btnText, link: href, type: "movie" }],
            episodesLink: "",
          });
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

// --- scrapeEpisodePage using Promise ---
export const scrapeEpisodePage = function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<{ title: string; link: string; type: "series" }[]> {
  const { axios, cheerio } = providerContext;
  const result: { title: string; link: string; type: "series" }[] = [];

  return axios
    .get(link, { headers })
    .then((response) => {
      const $ = cheerio.load(response.data);
      $(".entry-content,.post-inner")
        .find("h3 a")
        .each((_, el) => {
          const el$ = $(el);
          const href = el$.attr("href")?.trim();
          const btnText = el$.text().trim() || "Download";
          if (href) result.push({ title: btnText, link: href, type: "series" });
        });
      return result;
    })
    .catch((err) => {
      console.error("scrapeEpisodePage error:", err);
      return result;
    });
};
