import { Info, ProviderContext } from "../types";

const headers = {
  Referer: "https://wb.animeluxe.org",
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
    .then((res: any) => {
      const $ = cheerio.load(res.data || "");

      // -------- TITLE --------
      const title =
        $(".media-title h1").first().text().trim() ||
        $("title").text().trim();

      // -------- IMAGE --------
      let image =
        $(".widget-sidebar .anime-card .image").attr("data-src") || "";
      if (image.startsWith("//")) image = "https:" + image;

      // -------- SYNOPSIS --------
      const synopsis = $(".media-story .content p")
        .first()
        .text()
        .trim();

      // -------- EPISODES --------
      const episodeLinks: { title: string; link: string }[] = [];

      $(".episodes-lists li a[href]").each((_, el) => {
        const ep = $(el);
        const epLink = ep.attr("href");
        const epTitle = ep.text().trim() || "Episode";

        if (!epLink) return;

        episodeLinks.push({
          title: epTitle,
          link: epLink.startsWith("http")
            ? epLink
            : new URL(epLink, link).href,
        });
      });
    
      if (episodeLinks.length) {
  empty.linkList.push({
    title: "Episodes",
    quality: "HD",
    episodesLink: episodeLinks[0].link, // ✅ FIRST EPISODE LINK
    directLinks: [],                    // ✅ no multiple buttons
  });
}


    return {
        title,
        synopsis,
        image,
        imdbId: "",
        type: "series",
        linkList: empty.linkList,
      };
    })
    .catch((err: any) => {
      console.error("AnimeLuxe meta error:", err?.message || err);
      return empty;
    });
};
