import { Info, ProviderContext } from "../types";

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-store",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

export const getMeta = ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> => {
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
      const title = $("h1")
        .first()
        .text()
        .trim();

      // ---------------- IMAGE ----------------
      let image =
        $("img").first().attr("src") || "";

      if (image.startsWith("//")) image = "https:" + image;

      // ---------------- SYNOPSIS ----------------
      const synopsis = $(
        "div.text-slate-100 div"
      )
        .last()
        .text()
        .trim();

      const info: Info = {
        title,
        synopsis,
        image,
        imdbId: "",
        type: "series",
        linkList: [],
      };

      // ---------------- START WATCHING LINK ----------------
      const watchLink = $("a")
        .filter((_, el) =>
          $(el).text().toLowerCase().includes("start watching")
        )
        .first()
        .attr("href");

      if (watchLink) {
        info.linkList.push({
          title: "Start Watching",
          quality: "Episode 1",
          episodesLink: watchLink.startsWith("http")
            ? watchLink
            : new URL(watchLink, link).href,
          directLinks: [],
        });
      }

      // ---------------- FALLBACK ----------------
      if (info.linkList.length === 0) {
        info.linkList.push({
          title: "Watch",
          quality: "Episodes",
          episodesLink: link,
          directLinks: [],
        });
      }

      return info;
    })
    .catch((err: any) => {
      console.error("AniZone meta error:", err?.message || err);
      return empty;
    });
};
