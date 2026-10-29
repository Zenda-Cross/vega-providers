import { Info, Link, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";
import {
  applyCinemetaMeta,
  enrichCinemetaEpisodes,
  getCinemetaMeta,
  getCinemetaSeason,
} from "../getCinemetaMeta";
import { enrichEpisodesWithSkipTimings } from "../theintrodb";

const hdbHeaders = {
  Cookie: "xla=s4t",
  Referer: "https://google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

function readQuality(text: string): string {
  const match = text.match(/\b(480|720|1080|2160)p\b|\b4k\b/i);
  return match ? (/2160|4k/i.test(match[0]) ? "4K" : match[0].toLowerCase()) : "";
}

function getEpisodeLinks($: any, container: any, seriesTitle: string, pageUrl: string): Link[] {
  const groups = new Map<string, NonNullable<Link["directLinks"]>>();
  let episode = "";
  let quality = "";
  let sectionQuality = "";
  // Follow DOM order instead of scanning every later sibling. Invalid/nested
  // headings otherwise cause one episode to claim the rest of the season.
  container.find("h2,h3,h4,h5,h6,p,strong,a[href]").each((_, element) => {
    const el = $(element);
    const own = el.clone();
    own.find("h1,h2,h3,h4,h5,h6,p,strong").remove();
    const text = own.text().replace(/\s+/g, " ").trim();
    const number = text.match(/^(?:episodes?\s*[:.-]?\s*|E)(\d+)\b/i)?.[1];
    if (!el.is("a")) {
      if (/episode.*(?:links|index)|single episode/i.test(text) && !number) {
        sectionQuality = readQuality(text);
        quality = sectionQuality;
        episode = "";
      } else if (number) {
        episode = "EPISODE " + Number(number);
        quality = readQuality(text) || sectionQuality;
      } else if (readQuality(text)) quality = readQuality(text);
      else if (el.is("h2,h3") && /storyline|review|description/i.test(text)) episode = "";
      return;
    }
    if (number) { episode = "EPISODE " + Number(number); quality = sectionQuality; }
    if (!episode) return;
    const href = el.attr("href") || "";
    if (!number && !/hubdrive|hubcloud/i.test(href) && !/drive/i.test(text)) return;
    let target: string;
    try { target = new URL(href, pageUrl).href; } catch { return; }
    if (!/^https?:/i.test(target)) return;
    const key = readQuality(text) || quality || "Unknown";
    const entries = groups.get(key) || [];
    if (!entries.some(e => e.title === episode || e.link === target)) {
      entries.push({title: episode, link: target, type: "series"});
    }
    groups.set(key, entries);
  });
  return [...groups.entries()].map(([quality, episodes]) => ({
    title: quality === "Unknown" ? seriesTitle : seriesTitle + " - " + quality,
    quality: quality === "Unknown" ? undefined : quality,
    directLinks: episodes.sort((a, b) => Number(a.title.match(/\d+/)?.[0]) - Number(b.title.match(/\d+/)?.[0])),
  }));
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio } = providerContext;
    const baseUrl = await getBaseUrl("hdhub");
    const url = new URL(link, `${baseUrl}/`).href;
    const res = await axios.get(url, { headers: hdbHeaders });
    const data = res.data;
    const $ = cheerio.load(data);
    $("script,style,.code-block,nav,footer").remove();
    const container = $(".page-body").first().length ? $(".page-body").first() : $(".entry-content").first();
    const imdbId = container.find('a[href*="imdb.com/title/"]').first().attr("href")?.match(/tt\d+/)?.[0] || "";
    const titleHeading = container.find('h2[data-attrid="title"],h2.kno-ecr-pt').first().text().trim();
    const fallbackTitle = $("h1.page-title .material-text, h1.entry-title, h1").first().text().replace(/[\uE000-\uF8FF]/g, "").replace(/\s+/g, " ").trim();
    const title = titleHeading || fallbackTitle.split(/\s+(?:WEB-DL|WEBRip|BluRay|HDRip|480p|720p|1080p)\b|\s*\[/i)[0].trim();
    let synopsis = container.find('strong').filter((_, el) => /^description\s*:/i.test($(el).text().trim())).first().parent().text().replace(/^\s*DESCRIPTION\s*:\s*:?\s*/i, "").trim();
    {
      const storyline = container.find("h2,h3,h4").filter((_, el) => /storyline|synopsis|plot/i.test($(el).text())).first();
      const following = storyline.nextAll().first();
      const description = following.find(".kno-rdesc").first();
      const plot = (description.length ? description.text() : following.text()).replace(/\s+/g, " ").trim();
      if (plot) synopsis = plot;
    }
    const poster = container.find("img").first();
    const imageSource = poster.attr("data-src") || poster.attr("src") || $("meta[property='og:image']").attr("content") || "";
    const image = imageSource ? new URL(imageSource, url).href : "";
    const episodeLinks = getEpisodeLinks($, container, title, url);
    const type = episodeLinks.length || /\bseason\b|\bS\d{1,2}\b/i.test(title + " " + fallbackTitle) ? "series" : "movie";

    // Links
    const links: Link[] = [...episodeLinks];

    if (links.length === 0) {
      container
        .find(
          'a:contains("480"),a:contains("720"),a:contains("1080"),a:contains("2160"),a:contains("4K")',
        )
        .map((i, element) => {
          const quality =
            $(element)
              .text()
              .match(/\b(480p|720p|1080p|2160p)\b/i)?.[0] || "";
          const movieLinks = $(element).attr("href");
          const title = $(element).text();
          if (movieLinks) {
            links.push({
              directLinks: [
                { link: new URL(movieLinks, url).href, title: type === "series" ? "Season Pack" : "Movie", type },
              ],
              quality: quality,
              title: title,
            });
          }
        });
    }

    const quickDownload = await providerContext.kvStore?.get<boolean>("hdhub4u_quickDownload");
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
      if (cinemeta) {
        if (type === "series" && cinemeta.type === "series") {
          const skipTimings = await providerContext.kvStore?.get<boolean>("hdhub4u_skipTimings");
          websiteInfo.linkList = await Promise.all(
            websiteInfo.linkList.map(async (item) => {
              if (!item.directLinks) return item;
              const season =
                getCinemetaSeason(item.title) || getCinemetaSeason(title);
              if (!season) return item;
              let enriched = enrichCinemetaEpisodes(
                item.directLinks,
                cinemeta.videos || [],
                season,
              );
              if (skipTimings ?? true) {
                try {
                  enriched = await enrichEpisodesWithSkipTimings(
                    enriched,
                    imdbId,
                    season,
                    providerContext,
                  );
                } catch (e) {
                  console.warn("HDHub4u: Skip timings failed", e);
                }
              }
              return {
                ...item,
                directLinks: enriched,
              };
            }),
          );
        }
        return applyCinemetaMeta(websiteInfo, cinemeta);
      }
    } catch (e) {
      console.warn("HDHub4u: Cinemeta lookup failed", e);
    }
    return websiteInfo;
  } catch (err) {
    throwProviderError("HDHub4u", "metadata", err);
  }
};
