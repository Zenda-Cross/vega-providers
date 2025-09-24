import { Info, Link, ProviderContext } from "../types";

interface DirectLink {
  link: string;
  title: string;
  quality: string;
  type: "movie" | "episode";
}

interface Episode {
  title: string;
  directLinks: DirectLink[];
}

const headers = {
  Referer: "https://google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

// --- Fetch episodes from selected page
async function fetchEpisodesFromSelectedLink(
  url: string,
  providerContext: ProviderContext
): Promise<Episode[]> {
  const { axios, cheerio } = providerContext;
  const res = await axios.get(url, { headers });
  const $ = cheerio.load(res.data);

  const episodes: Episode[] = [];

  $("h4").each((_: any, h4El: any) => {
    const epTitle = $(h4El).text().trim();
    if (!epTitle) return;

    const directLinks: DirectLink[] = [];

    $(h4El)
      .nextUntil("h4, hr")
      .find("a[href]")
      .each((_: any, linkEl: any) => {
        let href = ($(linkEl).attr("href") || "").trim();
        if (!href) return;
        if (!href.startsWith("http")) href = new URL(href, url).href;

        const btnText = $(linkEl).text().trim() || "Watch Episode";
        const lowerHref = href.toLowerCase();

        if (
          lowerHref.includes("nexdrive.top") ||
          lowerHref.includes("vcloud.lol") ||
          lowerHref.includes("dgdrive") ||
          lowerHref.includes("fastdl.icu")
        ) {
          directLinks.push({
            link: href,
            title: btnText,
            quality: "AUTO",
            type: "episode",
          });
        }
      });

    if (directLinks.length > 0) {
      episodes.push({ title: epTitle, directLinks });
    }
  });

  return episodes;
}

// --- Fetch movie links from provided HTML snippet
function fetchMovieLinksFromHTML(html: string): Link[] {
  const cheerio = require("cheerio");
  const $ = cheerio.load(html);
  const links: Link[] = [];

  $("a[href]").each((_: any, aEl: any) => {
    let href = ($(aEl).attr("href") || "").trim();
    if (!href) return;
    if (!href.startsWith("http")) return;

    const btnText = $(aEl).text().trim() || "Download";
    links.push({
      title: btnText,
      directLinks: [
        {
          link: href,
          title: btnText,
          quality: "AUTO",
          type: "movie",
        },
      ],
      episodesLink: href,
    });
  });

  return links;
}

// --- Main getMeta function
export const getMeta = async function ({
  link,
  providerContext,
  movieHTML = "",
}: {
  link: string;
  providerContext: ProviderContext;
  movieHTML?: string;
}): Promise<Info & { extraInfo: Record<string, string>; episodeList: Episode[] }> {
  const { axios, cheerio } = providerContext;

  if (!link.startsWith("http")) link = new URL(link, "https://vgmlinks.click").href;

  try {
    const res = await axios.get(link, { headers });
    const $ = cheerio.load(res.data);

    const title =
      $("h1.entry-title").first().text().trim() ||
      $("meta[property='og:title']").attr("content")?.trim() ||
      "Unknown";

    let image =
      $(".poster img").attr("src") ||
      $("meta[property='og:image']").attr("content") ||
      $("meta[name='twitter:image']").attr("content") ||
      "";
    if (image && !image.startsWith("http")) image = new URL(image, link).href;

    let synopsis = "";
    $(".entry-content p").each((_: any, el: any) => {
      const txt = $(el).text().trim();
      if (txt.length > 40 && !txt.toLowerCase().includes("download")) {
        synopsis = txt;
        return false;
      }
    });

    const imdbLink = $("a[href*='imdb.com']").attr("href") || "";
    const imdbId = imdbLink
      ? "tt" + (imdbLink.split("/tt")[1]?.split("/")[0] || "")
      : "";

    const tags: string[] = [];
    $(".entry-content p strong").each((_: any, el: any) => {
      const txt = $(el).text().trim();
      if (
        txt.match(
          /drama|biography|action|thriller|romance|adventure|animation/i
        )
      )
        tags.push(txt);
    });

    const extra: Record<string, string> = {};
    $("p").each((_: any, el: any) => {
      const html = $(el).html() || "";
      if (html.includes("Series Name")) extra.name = $(el).text().split(":")[1]?.trim();
      if (html.includes("Language")) extra.language = $(el).text().split(":")[1]?.trim();
      if (html.includes("Released Year")) extra.year = $(el).text().split(":")[1]?.trim();
      if (html.includes("Quality")) extra.quality = $(el).text().split(":")[1]?.trim();
      if (html.includes("Episode Size")) extra.size = $(el).text().split(":")[1]?.trim();
      if (html.includes("Format")) extra.format = $(el).text().split(":")[1]?.trim();
    });

    let links: Link[] = [];
    let episodeList: Episode[] = [];

    if (movieHTML) {
      // --- Movie page: fetch all links from given HTML
      links = fetchMovieLinksFromHTML(movieHTML);
    } else {
      // --- Series page: fetch episodes normally
      episodeList = await fetchEpisodesFromSelectedLink(link, providerContext);

      $("a[href]").each((_: any, aEl: any) => {
        let href = ($(aEl).attr("href") || "").trim();
        if (!href) return;
        if (!href.startsWith("http")) href = new URL(href, link).href;

        const btnText = $(aEl).text().trim() || "Link";
        const lowerHref = href.toLowerCase();

        if (
          lowerHref.includes("nexdrive.top") ||
          lowerHref.includes("vcloud.lol") ||
          lowerHref.includes("dgdrive") ||
          lowerHref.includes("fastdl.icu")
        ) {
          links.unshift({
            title: btnText,
            directLinks: [
              {
                link: href,
                title: btnText,
                quality: "AUTO",
                type: "movie",
              },
            ],
            episodesLink: href,
          });
        }
      });
    }

    return {
      title,
      synopsis,
      image,
      imdbId,
      type: episodeList.length > 0 ? "series" : "movie",
      tags,
      cast: [],
      rating: $(".entry-meta .entry-date").text().trim() || "",
      linkList: links,
      extraInfo: extra,
      episodeList,
    };
  } catch (err) {
    console.error("getMeta error:", err);
    return {
      title: "",
      synopsis: "",
      image: "https://via.placeholder.com/300x450",
      imdbId: "",
      type: "movie",
      tags: [],
      cast: [],
      rating: "",
      linkList: [],
      extraInfo: {},
      episodeList: [],
    };
  }
};
