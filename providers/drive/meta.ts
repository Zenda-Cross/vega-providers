import { Info, Link, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";
import {
  addCinemetaContext,
  applyCinemetaMeta,
  getCinemetaMeta,
  getCinemetaSeason,
} from "../getCinemetaMeta";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
  providerValue?: string;
}): Promise<Info> {
  try {
    const { axios, cheerio } = providerContext;
    const currentBaseUrl = await getBaseUrl("drive");
    const url = new URL(link, `${currentBaseUrl}/`).href;
    const res = await axios.get(url, { headers: providerContext.commonHeaders });
    const data = res.data;
    const $ = cheerio.load(data);

    const pageTitle = $("h1, .entry-title, title").first().text().replace("Download", "").trim();
    const pageBody = $("body").text();

    const isSeries =
      (/season\s*\d+/i.test(pageTitle) ||
        /\b(s\d{1,2}|s\d{1,2}\s*-\s*\d{1,2})\b/i.test(pageTitle) ||
        /single episode/i.test(pageBody) ||
        /\[\s*\d+.*\/e\s*\]/i.test(pageBody)) &&
      !pageTitle.toLowerCase().includes("full movie");
    const type = isSeries ? "series" : "movie";

    const imdbId = $('a[href*="imdb.com/title/tt"]').attr("href")?.match(/tt\d+/)?.[0] || "";

    let title =
      $('strong:contains("Name"), h5:contains("Name"), p:contains("Name:")')
        .first()
        .text()
        .replace(/.*?(?:Movie|Series)\s*Name:\s*/i, "")
        .replace(/\[.*?\]|\(.*?\)|\|.*/g, "")
        .trim() ||
      pageTitle.replace(/\[.*?\]|\(.*?\)|\|.*/g, "").trim();

    const synopsis =
      $('h2:contains("Storyline"), h3:contains("Storyline"), h4:contains("Storyline"), h5:contains("Storyline"), p:contains("Storyline")')
        .first()
        .next("p")
        .text()
        .trim() ||
      $('p:contains("Storyline:")')
        .text()
        .replace(/.*?Storyline:\s*/i, "")
        .trim() ||
      $(".ipc-html-content-inner-div").text().trim() ||
      "";

    const image =
      $("img.entered.lazyloaded, img.entered, img.litespeed-loaded, .post-inner img, .entry-content img, img.aligncenter")
        .first()
        .attr("src") || "";

    // Links
    const links: Link[] = [];

    $("a").each((i, a) => {
      const aText = $(a).text().trim().replace(/\s+/g, " ");
      const aHref = $(a).attr("href") || "";

      if (
        !aHref ||
        aHref === "#" ||
        aHref.startsWith("javascript:") ||
        aHref.includes("/?s=") ||
        aHref.includes("search.php") ||
        aHref.includes("moviesdrive") ||
        aHref.includes("moviesdrives") ||
        aHref.includes("moviedrive") ||
        aHref.includes("imdb.com") ||
        aText.toLowerCase().includes("zip") ||
        aHref.toLowerCase().includes("zip") ||
        aText.toLowerCase().includes("sample") ||
        aText.toLowerCase().includes("trailer") ||
        aText.toLowerCase().includes("notice")
      ) {
        return;
      }

      const isDownloadAnchor =
        /archive\/\d+/i.test(aHref) ||
        /hubcloud|gdflix|fastdl|drive/i.test(aHref) ||
        /(?:480|720|1080|2160|4k)/i.test(aText) ||
        /single episode/i.test(aText) ||
        /download/i.test(aText);

      if (isDownloadAnchor && /^https?:\/\//i.test(aHref)) {
        let linkTitle = $(a).parent("h5, h4, h3, p").prev("h5, h4, h3, p").text().trim().replace(/\s+/g, " ");
        if (!linkTitle || linkTitle.length < 5 || linkTitle.includes("Download Links")) {
          linkTitle = $(a).parent().text().trim().replace(/\s+/g, " ");
        }
        if (!linkTitle || linkTitle === aText) {
          linkTitle = aText;
        }

        linkTitle = linkTitle.replace(/[\r\n\t]+/g, " ").replace(/^[\s•\-*—_:=~|]+|[\s•\-*—_:=~|]+$/g, "").trim();

        const quality = (linkTitle + " " + aText).match(/\b(480p|720p|1080p|2160p|4k)\b/i)?.[0] || "";

        if (type === "series") {
          const seasonMatch = (linkTitle + " " + pageTitle).match(/Season\s*\d+/i);
          if (seasonMatch && !linkTitle.toLowerCase().includes("season")) {
            linkTitle = `${seasonMatch[0]} ${quality || linkTitle}`.trim();
          }
        }

        if (!links.some((l) => l.episodesLink === aHref || (l.directLinks && l.directLinks[0]?.link === aHref))) {
          if (type === "movie") {
            links.push({
              title: linkTitle,
              quality,
              directLinks: [{ title: "Movie", link: aHref, type: "movie" }],
            });
          } else {
            links.push({
              title: linkTitle,
              quality,
              episodesLink: aHref,
            });
          }
        }
      }
    });

    console.log("drive meta", links, type);
    const quickDownload = await providerContext.kvStore?.get<boolean>("drive_quickDownload");
    const websiteInfo: Info = {
      title,
      synopsis,
      image,
      imdbId: imdbId || "",
      type,
      quickDownload: quickDownload ?? true,
      linkList: links,
      webUrl: url,
    };

    if (!imdbId) return websiteInfo;

    try {
      const cinemeta = await getCinemetaMeta(imdbId, type, providerContext);
      if (type === "series" && cinemeta.type === "series") {
        websiteInfo.linkList = websiteInfo.linkList.map((item) => {
          if (!item.episodesLink) return item;
          const season = getCinemetaSeason(item.title);
          if (!season) return item;
          return {
            ...item,
            episodesLink: addCinemetaContext(
              new URL(item.episodesLink, url).href,
              imdbId,
              season,
            ),
          };
        });
      }
      return applyCinemetaMeta(websiteInfo, cinemeta);
    } catch {
      return websiteInfo;
    }
  } catch (err) {
    throwProviderError("Drive", "metadata", err);
  }
};
