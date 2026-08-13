import { Info, Link, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";
import {
  applyCinemetaMeta,
  enrichCinemetaEpisodes,
  getCinemetaMeta,
  getCinemetaSeason,
} from "../getCinemetaMeta";

const hdbHeaders = {
  Cookie: "xla=s4t",
  Referer: "https://google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

function getEpisodeLinks($: any, seriesTitle: string): Link[] {
  const qualityGroups: Record<string, Link["directLinks"]> = {};

  $("strong").each((_, element) => {
    const episodeTitle = $(element).text().trim();
    if (!/^episode\s*\d+$/i.test(episodeTitle)) return;

    const heading = $(element).closest("h1,h2,h3,h4,h5,h6,p,div");
    if (!heading.length) return;

    for (const sibling of heading.nextAll().toArray()) {
      const siblingHeading = $(sibling);
      if (/^episode\s*\d+$/i.test(siblingHeading.text().trim())) break;

      const driveLinks = siblingHeading.find('a[href*="hubdrive"],a:contains("Drive")');

      driveLinks.each((_, aEl) => {
        const driveLink = $(aEl).attr("href");
        if (driveLink) {
          const textContext =
            $(aEl).text().toLowerCase() + " " +
            $(aEl).parent().text().toLowerCase() + " " +
            $(aEl).parent().prev().text().toLowerCase();

          let quality = "Unknown";
          if (textContext.includes("2160p") || textContext.includes("4k")) quality = "4K";
          else if (textContext.includes("1080p")) quality = "1080p";
          else if (textContext.includes("720p")) quality = "720p";
          else if (textContext.includes("480p")) quality = "480p";

          const epTitle = episodeTitle.toUpperCase();

          if (!qualityGroups[quality]) {
            qualityGroups[quality] = [];
          }

          if (!qualityGroups[quality].some(ep => ep.link === driveLink)) {
            qualityGroups[quality].push({ title: epTitle, link: driveLink });
          }
        }
      });
    }
  });

  const links: Link[] = [];
  for (const [quality, episodes] of Object.entries(qualityGroups)) {
    const linkTitle = quality === "Unknown" ? seriesTitle : `${seriesTitle} - ${quality}`;
    const linkObj: Link = {
      title: linkTitle,
      directLinks: episodes,
    };
    if (quality !== "Unknown") {
      linkObj.quality = quality;
    }
    links.push(linkObj);
  }

  return links;
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
    const container = $(".page-body");
    const imdbId =
      container
        .find('a[href*="imdb.com/title/tt"]:not([href*="imdb.com/title/tt/"])')
        .attr("href")
        ?.split("/")[4] || "";
    const title = container
      .find(
        'h2[data-ved="2ahUKEwjL0NrBk4vnAhWlH7cAHRCeAlwQ3B0oATAfegQIFBAM"],h2[data-ved="2ahUKEwiP0pGdlermAhUFYVAKHV8tAmgQ3B0oATAZegQIDhAM"]',
      )
      .text();
    const type = title.toLocaleLowerCase().includes("season")
      ? "series"
      : "movie";
    const synopsis = container
      .find('strong:contains("DESCRIPTION")')
      .parent()
      .text()
      .replace("DESCRIPTION:", "");
    const image = container.find('img[decoding="async"]').attr("src") || "";

    // Links
    const links: Link[] = [];
    const episodeLinks = getEpisodeLinks($, title);

    if (episodeLinks.length === 0) {
      const directLink: Link["directLinks"] = [];
      container.find('a:contains("EPiSODE")').map((i, element) => {
        const epTitle = $(element).text();
        const episodesLink = $(element).attr("href");
        if (episodesLink) {
          directLink.push({
            title: epTitle.toLocaleUpperCase(),
            link: episodesLink,
          });
        }
      });
      if (directLink.length > 0) {
        links.push({
          title: title,
          directLinks: directLink,
        });
      }
    } else {
      links.push(...episodeLinks);
    }

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
                { link: movieLinks, title: "Movie", type: "movie" },
              ],
              quality: quality,
              title: title,
            });
          }
        });
    }

    console.log("drive meta", title, synopsis, image, imdbId, type, links[0]);
    const websiteInfo: Info = {
      title,
      synopsis,
      image,
      imdbId: "",
      type,
      linkList: links,
      webUrl: url,
    };
    if (!imdbId) return websiteInfo;

    const cinemeta = await getCinemetaMeta(imdbId, type, providerContext);
    if (type === "series" && cinemeta.type === "series") {
      websiteInfo.linkList = websiteInfo.linkList.map((item) => {
        if (!item.directLinks) return item;
        const season =
          getCinemetaSeason(item.title) || getCinemetaSeason(title);
        if (!season) return item;
        return {
          ...item,
          directLinks: enrichCinemetaEpisodes(
            item.directLinks,
            cinemeta.videos || [],
            season,
          ),
        };
      });
    }
    return applyCinemetaMeta(websiteInfo, cinemeta);
  } catch (err) {
    throwProviderError("HDHub4u", "metadata", err);
  }
};
