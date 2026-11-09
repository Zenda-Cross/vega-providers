import { Info, Link, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";

const DEFAULT_BASE_URL = "https://asianc.id";

async function resolveBaseUrl(
  providerContext?: ProviderContext
): Promise<string> {
  try {
    if (
      providerContext &&
      typeof (providerContext as any).getBaseUrl === "function"
    ) {
      const resolved =
        (await (providerContext as any).getBaseUrl("dramacool")) ||
        (await (providerContext as any).getBaseUrl("asianc"));
      if (resolved) {
        return resolved.replace(/\/+$/, "");
      }
    }
  } catch {}
  try {
    const resolved =
      (await getBaseUrl("dramacool")) || (await getBaseUrl("asianc"));
    if (resolved) {
      return resolved.replace(/\/+$/, "");
    }
  } catch {}
  return DEFAULT_BASE_URL;
}

function cleanSynopsis(raw: string): string {
  return raw
    .replace(/^Description:\s*/i, "")
    .replace(/^Other name:\s*/i, "")
    .trim();
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio, commonHeaders } = providerContext;
    const baseUrl = await resolveBaseUrl(providerContext);
    let currentUrl = link.startsWith("http")
      ? link
      : `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;

    const headers = {
      ...(commonHeaders || {}),
      Referer: `${baseUrl}/`,
    };

    // If an episode link is provided, resolve the drama detail page first
    if (!currentUrl.includes("/drama-detail/")) {
      try {
        const epRes = await axios.get(currentUrl, { headers });
        const $ep = cheerio.load(epRes.data);
        const detailHref =
          $ep('.category a[href*="/drama-detail/"]').first().attr("href") ||
          $ep('a[href*="/drama-detail/"]').first().attr("href");
        if (detailHref) {
          currentUrl = detailHref.startsWith("http")
            ? detailHref
            : `${baseUrl}${detailHref.startsWith("/") ? "" : "/"}${detailHref}`;
        }
      } catch (e) {
        console.warn("Failed to resolve detail link from episode page:", e);
      }
    }

    const res = await axios.get(currentUrl, { headers });
    const $ = cheerio.load(res.data);

    const title = $("h1").first().text().trim();
    const rawImage =
      $(".img img, .info .img img, .drama-detail .img img")
        .first()
        .attr("src") ||
      $(".img img").first().attr("data-original") ||
      "";
    const image = rawImage.startsWith("http")
      ? rawImage
      : rawImage
      ? `${baseUrl}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`
      : "";

    let synopsis = "";
    $(".info p, .content p, .details p").each((_, p) => {
      const text = $(p).text().trim();
      if (
        text.toLowerCase().includes("description:") ||
        (!synopsis && text.length > 50 && !text.includes("Country:"))
      ) {
        synopsis = cleanSynopsis(text);
      }
    });

    const tags: string[] = [];
    $(".other-info p, .info p").each((_, p) => {
      const text = $(p).text().trim();
      if (text.startsWith("Country:")) {
        tags.push(text.replace("Country:", "").trim());
      } else if (text.startsWith("Status:")) {
        tags.push(text.replace("Status:", "").trim());
      } else if (text.startsWith("Released:")) {
        tags.push(text.replace("Released:", "").trim());
      } else if (text.startsWith("Genre:")) {
        const genreList = text
          .replace("Genre:", "")
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean);
        tags.push(...genreList);
      }
    });

    const isMovie =
      currentUrl.includes("/drama-movie") ||
      tags.some((t) => t.toLowerCase() === "movie");
    const mediaType = isMovie ? "movie" : "series";

    const subLinks: Link["directLinks"] = [];
    const episodeElements: { href: string; title: string; type: string }[] = [];

    $("ul.all-episode li").each((_, el) => {
      const a = $(el).find("a").first();
      const href = a.attr("href") || "";
      const epTitle =
        $(el).find("h3, .title").text().trim() || a.attr("title")?.trim() || "";
      const epType = $(el).find(".type").first().text().trim();
      if (href) {
        episodeElements.push({ href, title: epTitle, type: epType });
      }
    });

    // AsianC lists newest episode first, reverse so episode 1 is first
    episodeElements.reverse();

    episodeElements.forEach((ep, index) => {
      const epUrl = ep.href.startsWith("http")
        ? ep.href
        : `${baseUrl}${ep.href.startsWith("/") ? "" : "/"}${ep.href}`;

      let displayTitle = isMovie
        ? "Full Movie"
        : `Episode ${index + 1}`;

      const epNumMatch = ep.title.match(/episode\s*([0-9.]+)/i);
      if (epNumMatch && !isMovie) {
        displayTitle = `Episode ${epNumMatch[1]}`;
      }
      if (ep.type && ep.type !== "SUB") {
        displayTitle += ` (${ep.type})`;
      }

      subLinks.push({
        title: displayTitle,
        link: epUrl,
        type: mediaType,
      });
    });

    const linkList: Link[] = [
      {
        title: isMovie ? "Movie" : title || "Episodes",
        directLinks: subLinks,
      },
    ];

    return {
      title: title || "Drama",
      synopsis,
      image,
      imdbId: "",
      type: mediaType,
      tags: tags.filter(Boolean),
      linkList,
    };
  } catch (err) {
    console.error("dramacool getMeta error:", err);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "series",
      linkList: [],
    };
  }
};
