import { Info, Link, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";

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
        force: true,
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
    const { axios, cheerio, openWebView, commonHeaders } = providerContext;
    const baseUrl = await getBaseUrl("UhdMovies");
    const url = new URL(link, `${baseUrl}/`).href;
    const res = await getWithWAF(url, axios, openWebView, commonHeaders);
    const html = await res.data;
    const $ = cheerio.load(html);

    const rawTitle = $("h2:first").text() || $("h1.entry-title").text() || $("title").text().split("-")[0].trim() || "";
    const image = $("h2").siblings().find("img").attr("src") || $(".entry-content img").first().attr("src") || "";

    // Links
    const episodes: Link[] = [];

    const isJunkText = (t: string) => {
      const lower = t.toLowerCase().trim();
      return (
        !lower ||
        lower === " " ||
        lower.includes("here you can download") ||
        lower.includes("we do not host") ||
        lower.includes("join telegram")
      );
    };

    const isJunkLink = (title: string, link: string) => {
      const lower = title.toLowerCase().trim();
      if (lower.includes("zip")) return true;
      if (
        lower === "3d movies" ||
        lower === "4k hdr" ||
        lower === "4k 2160p" ||
        lower === "1080p x264 uhd" ||
        lower === "1080p 60fps" ||
        lower === "1080p x265 10bit"
      ) {
        return true;
      }
      return false;
    };

    // 1. Try modern .mks_separator structure
    $(".mks_separator, p:contains('mks_separator')").each((_, element) => {
      $(element)
        .nextUntil(".mks_separator")
        .each((_, el) => {
          const sectionTitle = $(el)
            .text()
            .replace(/[\r\n]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          if (isJunkText(sectionTitle)) return;

          const episodesList: { title: string; link: string }[] = [];
          $(el)
            .next("p")
            .find("a")
            .each((_, a) => {
              const aTitle = $(a).text().replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
              const aLink = $(a).attr("href");
              if (aTitle && aLink && !isJunkLink(aTitle, aLink)) {
                episodesList.push({ title: aTitle, link: aLink });
              }
            });

          if (sectionTitle && episodesList.length > 0) {
            episodes.push({
              title: sectionTitle,
              directLinks: episodesList,
            });
          }
        });
    });

    // 2. Fallback to hr structure if no episodes found
    if (episodes.length === 0) {
      $("hr").each((_, element) => {
        $(element)
          .nextUntil("hr")
          .each((_, el) => {
            const sectionTitle = $(el)
              .text()
              .replace(/[\r\n]+/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            if (isJunkText(sectionTitle)) return;

            const episodesList: { title: string; link: string }[] = [];
            $(el)
              .next("p")
              .find("a")
              .each((_, a) => {
                const aTitle = $(a).text().replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
                const aLink = $(a).attr("href");
                if (aTitle && aLink && !isJunkLink(aTitle, aLink)) {
                  episodesList.push({ title: aTitle, link: aLink });
                }
              });

            if (sectionTitle && episodesList.length > 0) {
              episodes.push({
                title: sectionTitle,
                directLinks: episodesList,
              });
            }
          });
      });
    }

    const cleanTitle = rawTitle
      .replace(/^Download\s+/i, "")
      .replace(/\s+Esubs.*$/i, "")
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const isSeries =
      rawTitle.toLowerCase().includes("season") ||
      rawTitle.toLowerCase().includes("series") ||
      episodes.some((e) =>
        e.directLinks?.some((d) =>
          d.title.toLowerCase().includes("episode") ||
          d.title.toLowerCase().includes("ep ") ||
          /e\d+/i.test(d.title)
        )
      );

    return {
      title: cleanTitle || rawTitle,
      image,
      imdbId: "",
      synopsis: cleanTitle || rawTitle,
      type: isSeries ? "series" : "movie",
      linkList: episodes,
      webUrl: url,
    };
  } catch (error) {
    throwProviderError("UHDMovies", "metadata", error);
  }
};
