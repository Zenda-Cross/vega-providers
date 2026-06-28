import { Info, Link, ProviderContext } from "../types";

const kmmHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
};

async function getWithWAF(
  url: string,
  axios: any,
  openWebView: any,
  headers: any,
): Promise<any> {
  const baseUrl = url.split("/").slice(0, 3).join("/");
  try {
    return await axios.get(url, { headers: { ...headers, Referer: baseUrl } });
  } catch (error: any) {
    if (error.response?.status === 403 && openWebView) {
      console.log(`WAF detected (403) for ${url}, using solver...`);
      const wafResult = await openWebView(baseUrl, {
        title: "Solve the captcha below and click done",
        description: "Required to bypass anti-bot protection.",
        headers: { ...headers, Referer: baseUrl },
        waitForCookie: "cf_clearance",
      });
      return await axios.get(url, {
        headers: { ...headers, Referer: baseUrl, Cookie: wafResult.cookie },
      });
    }
    throw error;
  }
}


export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio, openWebView } = providerContext;

    if (!link.startsWith("http")) {
      const baseUrl = await providerContext.getBaseUrl("kmmovies");
      link = `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;
    }

    const res = await getWithWAF(link, axios, openWebView, kmmHeaders);
    const $ = cheerio.load(res.data);

    // --- Title
    const title =
      $("h1, h2, .animated-text").first().text().trim() ||
      $("meta[property='og:title']").attr("content")?.trim() ||
      $("title").text().trim() ||
      "Unknown";

    // --- Poster Image
    let image =
      $("div.wp-slider-container img").first().attr("src") ||
      $("meta[property='og:image']").attr("content") ||
      $("meta[name='twitter:image']").attr("content") ||
      "";
    if (!image || !image.startsWith("http")) {
      image = new URL(image || "/placeholder.png", link).href;
    }

    // --- Synopsis
    let synopsis = "";
    $("p").each((_, el) => {
      const text = $(el).text().trim();
      if (
        text &&
        text.length > 40 &&
        !text.toLowerCase().includes("download") &&
        !text.toLowerCase().includes("quality")
      ) {
        synopsis = text;
        return false;
      }
    });
    if (!synopsis) {
      synopsis =
        $("meta[property='og:description']").attr("content") ||
        $("meta[name='description']").attr("content") ||
        "";
    }

    // --- Tags / Genre
    const tags: string[] = [];
    if (res.data.toLowerCase().includes("action")) tags.push("Action");
    if (res.data.toLowerCase().includes("drama")) tags.push("Drama");
    if (res.data.toLowerCase().includes("romance")) tags.push("Romance");
    if (res.data.toLowerCase().includes("thriller")) tags.push("Thriller");

    // --- Cast
    const cast: string[] = [];
    $("p").each((_, el) => {
      const text = $(el).text().trim();
      if (/starring|cast/i.test(text)) {
        text.split(",").forEach((name) => cast.push(name.trim()));
      }
    });

    // --- Rating
    let rating =
      $("p")
        .text()
        .match(/IMDb Rating[:\s]*([0-9.]+)/i)?.[1] || "";
    if (rating && !rating.includes("/")) rating = rating + "/10";

    // --- IMDb ID
    const imdbLink = $("p a[href*='imdb.com']").attr("href") || "";
    const imdbId =
      imdbLink && imdbLink.includes("/tt")
        ? "tt" + imdbLink.split("/tt")[1].split("/")[0]
        : "";

    // --- Download Links
    const linkList: Link[] = [];

    // Both movies and series use a.dl-btn now
    $("a.dl-btn").each((_, a) => {
      const el = $(a);
      const text = el.text().trim(); // e.g. "720p\n\t\t\t\t\t\t\t\t\t623 MB"
      // Replace multiple whitespaces/newlines with a single space
      const titleText = text.replace(/\s+/g, ' ').trim();
      let quality = "AUTO";
      if (titleText.toLowerCase().includes('480p')) quality = '480p';
      else if (titleText.toLowerCase().includes('720p')) quality = '720p';
      else if (titleText.toLowerCase().includes('1080p')) quality = '1080p';
      else if (titleText.toLowerCase().includes('2160p') || titleText.toLowerCase().includes('4k')) quality = '2160p';
      
      const href = el.attr("href") || "";
      if (href) {
        linkList.push({
            title: `Download ${titleText}`,
            quality,
            directLinks: [
                {
                    link: href,
                    title: `Download ${titleText}`,
                    type: href.includes("/series/") ? "series" : "movie",
                },
            ],
        });
      }
    });

    return {
      title,
      synopsis,
      image,
      imdbId,
      type: linkList.some(l => l.directLinks && l.directLinks.some(dl => dl.type === "series")) ? "series" : "movie",
      tags,
      cast,
      rating,
      linkList,
    };
  } catch (err) {
    console.error("KMMOVIES getMeta error:", err);
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
    };
  }
};
