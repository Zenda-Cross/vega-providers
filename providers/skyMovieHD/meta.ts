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

export async function fetchEpisodesFromSelectedLink(
  url: string,
  providerContext: ProviderContext
): Promise<Episode[]> {
  const { axios, cheerio } = providerContext;
  const res = await axios.get(url, { headers });
  const $ = cheerio.load(res.data);

  const episodes: Episode[] = [];

  $("h4").each((_, h4El) => {
    const epTitle = $(h4El).text().trim();
    if (!epTitle) return;

    const directLinks: DirectLink[] = [];

    $(h4El)
      .nextUntil("h4, hr")
      .find("a[href]")
      .each((_, linkEl) => {
        let href = ($(linkEl).attr("href") || "").trim();
        if (!href) return;
        if (!href.startsWith("http")) href = new URL(href, url).href;

        const btnText = $(linkEl).text().trim() || "Watch Episode";
        directLinks.push({
          link: href,
          title: btnText,
          quality: "AUTO",
          type: "episode",
        });
      });

    if (directLinks.length > 0) {
      episodes.push({
        title: epTitle,
        directLinks,
      });
    }
  });

  return episodes;
}

// --- Main getMeta function
export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<
  Info & { extraInfo: Record<string, string>; episodeList: Episode[] }
> {
  const { axios, cheerio } = providerContext;
  if (!link.startsWith("http"))
    link = new URL(link, "https://vgmlinks.click").href;

  try {
    const res = await axios.get(link, { headers });
    const $ = cheerio.load(res.data);
    const content = $(".entry-content, .post-inner").length
      ? $(".entry-content, .post-inner")
      : $("body");

    const title =
      $("h1.entry-title").first().text().trim() ||
      $("meta[property='og:title']").attr("content")?.trim() ||
      "Unknown"; // --- Type Detect ---

    const pageText = content.text();
    const type =
      /Season\s*\d+/i.test(pageText) || /Episode\s*\d+/i.test(pageText)
        ? "series"
        : "movie";

    let image =
      $(".poster img").attr("src") ||
      $("meta[property='og:image']").attr("content") ||
      $("meta[name='twitter:image']").attr("content") ||
      "";
    if (image && !image.startsWith("http")) image = new URL(image, link).href;

    let synopsis = "";
    $(".entry-content p").each((_, el) => {
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
    $(".entry-content p strong").each((_, el) => {
      const txt = $(el).text().trim();
      if (
        txt.match(
          /drama|biography|action|thriller|romance|adventure|animation/i
        )
      )
        tags.push(txt);
    });

    const extra: Record<string, string> = {};
    $("p").each((_, el) => {
      const html = $(el).html() || "";
      if (html.includes("Series Name"))
        extra.name = $(el).text().split(":")[1]?.trim();
      if (html.includes("Language"))
        extra.language = $(el).text().split(":")[1]?.trim();
      if (html.includes("Released Year"))
        extra.year = $(el).text().split(":")[1]?.trim();
      if (html.includes("Quality"))
        extra.quality = $(el).text().split(":")[1]?.trim();
      if (html.includes("Episode Size"))
        extra.size = $(el).text().split(":")[1]?.trim();
      if (html.includes("Format"))
        extra.format = $(el).text().split(":")[1]?.trim();
    });

    const links: Link[] = [];
    const episodeList: Episode[] = [];

    const isInformationalHeading = (text: string) => {
      const lowerText = text.toLowerCase();
      return (
        lowerText.includes("series info") ||
        lowerText.includes("series name") ||
        lowerText.includes("language") ||
        lowerText.includes("released year") ||
        lowerText.includes("episode size") ||
        lowerText.includes("format") ||
        lowerText.includes("imdb rating") ||
        lowerText.includes("winding up") ||
        (lowerText.length < 5 && !/\d/.test(lowerText))
      );
    }; // --- Download Links Extraction ---

    if (type === "series") {
      // Series case: h3 text as title + episode link button (V-Cloud)
      content.find("h3").each((_, h3) => {
        const h3Text = $(h3).text().trim();

        if (isInformationalHeading(h3Text)) return;

        const qualityMatch = h3Text.match(/\d+p/)?.[0] || "AUTO";

        const vcloudLink = $(h3)
          .nextUntil("h3, hr")
          .find("a")
          .filter((_, a) => /v-cloud|mega|gdrive|download/i.test($(a).text()))
          .first();

        const href = vcloudLink.attr("href");
        if (href) {
          // Hide unwanted texts
          const btnText = vcloudLink.text().trim() || "Link";
          if (
            btnText.toLowerCase().includes("imdb rating") ||
            btnText.toLowerCase().includes("winding up")
          )
            return;

          links.push({
            title: h3Text,
            quality: qualityMatch,
            episodesLink: href,
          });
        }
      });
    } else {
      // Movie case: h5/h3 text as title + direct download link
      content.find("h3, h5").each((_, heading) => {
        const headingText = $(heading).text().trim();

        if (isInformationalHeading(headingText)) return;

        const qualityMatch = headingText.match(/\d+p/)?.[0] || "AUTO";
        const linkEl = $(heading)
          .nextUntil("h3, h5, hr")
          .find("a[href]")
          .first();

        const href = linkEl.attr("href");
        if (href) {
          let finalHref = href.trim();
          if (!finalHref.startsWith("http"))
            finalHref = new URL(finalHref, link).href;

          const btnText = linkEl.text().trim() || "Download Link"; // Hide unwanted texts

          if (
            btnText.toLowerCase().includes("imdb rating") ||
            btnText.toLowerCase().includes("winding up")
          )
            return;

          links.push({
            title: headingText,
            quality: qualityMatch,
            episodesLink: "",
            directLinks: [
              {
                title: btnText,
                link: finalHref,
                type: "movie",
              },
            ],
          });
        }
      });
    }

    return {
      title,
      synopsis,
      image,
      imdbId,
      type: type as "movie" | "series",
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
      image: "",
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
