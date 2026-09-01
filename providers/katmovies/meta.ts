import { Info, Link, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";
import {
  addCinemetaContext,
  applyCinemetaMeta,
  enrichCinemetaEpisodes,
  getCinemetaMeta,
  getCinemetaSeason,
} from "../getCinemetaMeta";
import { enrichEpisodesWithSkipTimings } from "../theintrodb";

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
        force: true,
        waitForCookie: "cf_clearance",
      });
      return await axios.get(url, {
        headers: {
          ...headers,
          Referer: baseUrl,
          Cookie: wafResult.cookies || wafResult.cookie,
        },
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
    const baseUrl = await getBaseUrl("kat");
    const url = new URL(link, `${baseUrl}/`).href;
    const res = await getWithWAF(url, axios, openWebView, commonHeaders);
    const data = res.data;
    const $ = cheerio.load(data);
    const container = $(".yQ8hqd.ksSzJd.LoQAYe").html()
      ? $(".yQ8hqd.ksSzJd.LoQAYe")
      : $(".FxvUNb");
    const imdbId =
      container
        .find('a[href*="imdb.com/title/tt"]:not([href*="imdb.com/title/tt/"])')
        .attr("href")
        ?.split("/")[4] ||
      data.match(/imdb\.com\/title\/(tt\d+)/i)?.[1] ||
      "";

    const pageTitle = $("h1, .entry-title, title").first().text().replace("Download", "").trim();

    let title = container
      .find('li:contains("Name")')
      .children()
      .remove()
      .end()
      .text()
      .trim();

    if (!title) {
      title = pageTitle.replace(/\[.*?\]|\(.*?\)|\|.*/g, "").trim();
    }

    const isSeries =
      /season\s*\d+/i.test(pageTitle) ||
      /\[\s*s\d{1,2}\s*\]/i.test(pageTitle) ||
      (/episode/i.test(data) && !pageTitle.toLowerCase().includes("full movie")) ||
      $(".yQ8hqd.ksSzJd.LoQAYe").length > 0;
    const type = isSeries ? "series" : "movie";

    const synopsis = container.find('li:contains("Stars"), li:contains("Storyline")').text().trim();
    const image =
      $('h4:contains("SCREENSHOTS")').next().find("img").attr("src") ||
      $(".entry-content img").first().attr("src") ||
      "";

    console.log("katGetInfo", title, synopsis, image, imdbId, type);

    // Links
    const links: Link[] = [];
    const directLink: Link["directLinks"] = [];

    // Episode direct links on page
    $(".entry-content")
      .find('p:contains("Episode")')
      .each((i, element) => {
        const dlLink =
          $(element)
            .nextAll("h3,h2")
            .first()
            .find('a:contains("1080"),a:contains("720"),a:contains("480")')
            .attr("href") || "";
        const dlTitle = $(element).find("span").text().trim();

        if (dlLink.trim().length > 0 && dlTitle.includes("Episode ")) {
          directLink.push({
            title: dlTitle,
            link: dlLink,
            type: "series",
          });
        }
      });

    if (directLink.length > 0) {
      links.push({
        quality: "",
        title: title,
        directLinks: directLink,
      });
    }

    // Quality headings with download links
    $(".entry-content a").each((i, element) => {
      const aHref = $(element).attr("href") || "";
      const aText = $(element).text().trim().replace(/\s+/g, " ");

      if (
        !aHref ||
        aHref === "#" ||
        !aHref.startsWith("http") ||
        aHref.includes("imdb.com") ||
        aHref.includes("catimages") ||
        aText.toLowerCase().includes("sample") ||
        aText.toLowerCase().includes("online") ||
        aText.toLowerCase().includes("trailer") ||
        aHref.includes("/directlink")
      ) {
        return;
      }

      if (
        /links\.(?:kmhd|kmphotos)\.[a-z]+\/(?:file|pack)\/[\w]+/i.test(aHref) ||
        /(?:480|720|1080|2160|4k)/i.test(aText) ||
        aHref.includes("gdflix") ||
        aHref.includes("hubcloud")
      ) {
        let linkTitle = $(element).parent("h2, h3, h4, h5, p").text().trim().replace(/[\r\n\t]+/g, " ");
        if (!linkTitle || linkTitle === aText || linkTitle.length < 4) {
          linkTitle = aText;
        }
        const quality = (linkTitle + " " + aText).match(/\b(480p|720p|1080p|2160p|4k)\b/i)?.[0] || "";

        if (type === "movie") {
          if (!links.some((l) => l.directLinks?.[0]?.link === aHref)) {
            links.push({
              quality,
              title: linkTitle,
              directLinks: [{ link: aHref, title: linkTitle, type: "movie" }],
            });
          }
        } else {
          if (!links.some((l) => l.episodesLink === aHref)) {
            links.push({
              quality,
              title: linkTitle,
              episodesLink: aHref,
            });
          }
        }
      }
    });

    const quickDownload = await providerContext.kvStore?.get<boolean>("katmovies_quickDownload");
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
        const skipTimings = await providerContext.kvStore?.get<boolean>("katmovies_skipTimings");
        websiteInfo.linkList = await Promise.all(
          websiteInfo.linkList.map(async (item) => {
            const season =
              getCinemetaSeason(item.title) || getCinemetaSeason(title);
            if (!season) return item;
            if (item.directLinks) {
              let enriched = enrichCinemetaEpisodes(
                item.directLinks,
                cinemeta.videos || [],
                season,
              );
              if (skipTimings ?? true) {
                enriched = await enrichEpisodesWithSkipTimings(
                  enriched,
                  imdbId,
                  season,
                  providerContext,
                );
              }
              return {
                ...item,
                directLinks: enriched,
              };
            }
            if (item.episodesLink) {
              return {
                ...item,
                episodesLink: addCinemetaContext(
                  new URL(item.episodesLink, url).href,
                  imdbId,
                  season,
                ),
              };
            }
            return item;
          }),
        );
      }
      return applyCinemetaMeta(websiteInfo, cinemeta);
    } catch {
      return websiteInfo;
    }
  } catch (err) {
    throwProviderError("KatMovies", "metadata", err);
  }
};
