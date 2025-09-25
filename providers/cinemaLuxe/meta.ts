import { Info, ProviderContext, Link } from "../types";

const headers = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Cache-Control": "no-store",
  "Accept-Language": "en-US,en;q=0.9",
  DNT: "1",
  "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

export const getMeta = ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> => {
  const { axios, cheerio } = providerContext;
  const baseUrl = link.split("/").slice(0, 3).join("/");

  return axios
    .get(link, { headers: { ...headers, Referer: baseUrl } })
    .then((response) => {
      const $ = cheerio.load(response.data);
      const infoContainer = $(".entry-content,.post-inner");

      const title = $("h1.entry-title").text().trim() || "";

      let imdbId = "";
      const imdbMatch = infoContainer.html()?.match(/tt\d+/);
      if (imdbMatch) imdbId = imdbMatch[0];

      const synopsis =
        infoContainer
          .find("h3:contains('SYNOPSIS'), h3:contains('synopsis'), h3:contains('Series-SYNOPSIS')")
          .next("p")
          .text()
          .trim() || "";

      let image = "";
      const firstImg = infoContainer.find("img").first();
      if (firstImg.length) {
        image = firstImg.attr("src") || "";
        if (image.startsWith("//")) image = "https:" + image;
      }

      const linkList: Link[] = [];
      const type: "movie" | "series" = /Season \d+/i.test(infoContainer.text()) ? "series" : "movie";

      if (type === "series") {
        infoContainer.find("h3").each((_, el) => {
          const el$ = $(el);
          const seasonText = el$.text().trim();
          if (/Season \d+/i.test(seasonText)) {
            let vCloudLink = "";
            el$.nextUntil("h3").find("a").each((_, aEl) => {
              const href = $(aEl).attr("href") || "";
              const text = $(aEl).text();
              if (href.includes("fzlinks.xyz/archive") && text.includes("V-Cloud")) {
                vCloudLink = href;
                return false; // stop at first V-Cloud
              }
            });

            if (vCloudLink) {
              linkList.push({
                title: seasonText,
                episodesLink: vCloudLink,
                directLinks: [],
              });
            }
          }
        });
      } else {
        // Movie: sab links collect
        infoContainer.find("h5").each((_, h5El) => {
          const h5Text = $(h5El).text().trim();
          const directLinks: Link["directLinks"] = [];
          $(h5El)
            .next("p")
            .find("a")
            .each((_, aEl) => {
              const linkHref = $(aEl).attr("href") || "";
              if (linkHref) directLinks.push({ title: h5Text, link: linkHref, type: "movie" });
            });

          if (directLinks.length) linkList.push({ title: h5Text, directLinks });
        });
      }

      return { title, synopsis, image, imdbId, type, linkList };
    })
    .catch((err) => {
      console.error("getMeta error:", err);
      return { title: "", synopsis: "", image: "", imdbId: "", type: "movie", linkList: [] };
    });
};
