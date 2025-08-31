import { Info, Link, ProviderContext } from "../types";

const headers = {
  Referer: "https://google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
};

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio } = providerContext;
    const res = await axios.get(link, { headers });
    const $ = cheerio.load(res.data);

    // --- Main container
    const container = $("article.post.single, .entry-content").first();

    // --- Title
    const rawTitle = container.find("h1.entry-title").text().trim() ||
      $("meta[property='og:title']").attr("content")?.trim() ||
      $("title").text().trim();
    const title = rawTitle.replace(/\s{2,}/g, " ").trim();

    // --- Type
    const type: "movie" | "series" = /season|episode|ep\s*\d+/i.test(title)
      ? "series"
      : "movie";

    // --- Synopsis
    const synopsis = container.find(".entry-content p").map((_, el) => $(el).text().trim()).get().join(" ") ||
      $("meta[name='description']").attr("content") ||
      $("meta[property='og:description']").attr("content") ||
      "";

    // --- Image
    const image = container.find(".post-thumbnail img").attr("src") ||
      $("meta[property='og:image']").attr("content") ||
      "";

    // --- Links
    const links: Link[] = [];
    const episodeLinks: Link["directLinks"] = [];
    const seenLinks = new Set<string>();

    // --- Episodes buttons
    $(".seasons-lst li").each((_, el) => {
      const ep = $(el);
      const epTitle = ep.find("h3.title").text().trim();
      const epLink = ep.find("a.btn").attr("href");
      const epImage = ep.find("img").attr("src") || "";

      if (!epLink || seenLinks.has(epLink)) return;
      seenLinks.add(epLink);

      episodeLinks.push({
        title: epTitle,
        link: epLink.startsWith("http") ? epLink : new URL(epLink, link).href,
        type: "episode",
      });
    });

    // --- Download links
    $(".download-links a[data-url]").each((_, el) => {
      const base64Link = $(el).attr("data-url");
      const quality = $(el).closest("tr").find("td:nth-child(3)").text().trim() || "HD";
      if (!base64Link) return;
      const finalLink = atob(base64Link); // decode base64

      if (seenLinks.has(finalLink)) return;
      seenLinks.add(finalLink);

      episodeLinks.push({
        title: `Download - ${quality}`,
        link: finalLink,
        type: "movie",
        quality,
      });
    });

    if (episodeLinks.length > 0) {
      links.push({
        title,
        directLinks: episodeLinks,
      });
    }

    return {
      title,
      synopsis,
      image,
      imdbId: "", // TOONo me IMDb ID nahi hota
      type,
      linkList: links,
    };
  } catch (err) {
    console.error("❌ TOONo meta fetch error:", err);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };
  }
};



