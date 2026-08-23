import { getBaseUrl } from "../getBaseUrl";
import {
  applyCinemetaMeta,
  enrichCinemetaEpisodes,
  getCinemetaMeta,
} from "../getCinemetaMeta";
import { enrichEpisodesWithSkipTimings } from "../theintrodb";
import { Info, Link, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

const providerValue = "cinefreak";
const defaultBaseUrl = "https://cinefreak.net";

function cleanQuality(text: string): string {
  const match = text.match(/\b(480p|720p|1080p|2160p|4k)\b/i);
  if (match) return match[1].toLowerCase();
  return "";
}

function decodeCinefreakLink(link: string, baseUrl: string): string {
  try {
    if (link.includes("generate.php") && link.includes("id=")) {
      const urlObj = new URL(link, baseUrl);
      const rawId = urlObj.searchParams.get("id") || "";
      if (rawId) {
        let decoded = "";
        try {
          decoded = atob(rawId);
        } catch {
          decoded = Buffer.from(rawId, "base64").toString("utf8");
        }
        if (decoded.startsWith("http")) {
          return decoded.replace(/newgo\d*$/i, "");
        }
      }
    }
  } catch {
    // fallback
  }
  try {
    return new URL(link, baseUrl).href;
  } catch {
    return link;
  }
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio, commonHeaders } = providerContext;
  try {
    const baseUrl = (await getBaseUrl(providerValue)) || defaultBaseUrl;
    const url = new URL(link, baseUrl).href;

    const response = await axios.get(url, {
      headers: {
        ...commonHeaders,
        Referer: `${baseUrl}/`,
      },
    });

    const $ = cheerio.load(response.data || "");

    const rawTitle =
      $("h1.page-title, .page-title").first().text().replace(/\s+/g, " ").trim() ||
      $("title").text().split("|")[0].trim();

    const title = rawTitle
      .replace(/Download\s*|Watch Online\s*/gi, "")
      .replace(/\s*–\s*CineFreak.*$/i, "")
      .replace(/\s*\|\s*CineFreak.*$/i, "")
      .replace(/–\s*GDrive.*$/i, "")
      .replace(/\|\s*GDrive.*$/i, "")
      .replace(/\s*\[.*?\]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const image =
      $(".poster-image img, .content-sidebar img, .poster-container img")
        .first()
        .attr("src") ||
      $('meta[property="og:image"]').attr("content") ||
      "";

    let synopsis = "";
    $(".entry-content p").each((_, el) => {
      const text = $(el).text().trim();
      if (
        text &&
        !text.includes("IMDb Rating") &&
        !text.includes("Movie Details") &&
        !text.includes("Series Info") &&
        !text.includes("Screenshots") &&
        !text.includes("Download") &&
        !synopsis
      ) {
        synopsis = text;
      }
    });

    // Extract IMDb ID if available
    let imdbId = "";
    const imdbLink = $('a[href*="imdb.com/title/"]').attr("href") || "";
    const imdbMatch = imdbLink.match(/tt\d+/i) || response.data.match(/tt\d+/i);
    if (imdbMatch) {
      imdbId = imdbMatch[0];
    } else {
      // Check for TMDb link if no IMDb ID found
      const tmdbLink = $('a[href*="themoviedb.org/"]').attr("href") || "";
      const tmdbMatch = tmdbLink.match(/themoviedb\.org\/(tv|movie)\/(\d+)/i);
      if (tmdbMatch) {
        const tmdbType = tmdbMatch[1] === "tv" ? "tv" : "movie";
        const tmdbNum = tmdbMatch[2];
        try {
          const tmdbRes = await axios.get(
            `https://api.themoviedb.org/3/${tmdbType}/${tmdbNum}/external_ids?api_key=cfe422613b250f702980a3bbf9e90716`,
            { timeout: 5000 }
          );
          if (tmdbRes.data?.imdb_id) {
            imdbId = tmdbRes.data.imdb_id;
          }
        } catch (e: any) {
          console.warn(`CineFreak: Failed to resolve TMDb to IMDb via API: ${e.message}`);
        }
      }
    }

    const hasEpisodeCards = $(".ep-card").length > 0;
    const isSeries =
      hasEpisodeCards ||
      /season|series|episode|k-drama/i.test(rawTitle) ||
      $('a[href*="/web-series/"]').length > 0;

    const linkList: Link[] = [];

    if (hasEpisodeCards) {
      // Group episodes by Season and Quality
      // seasonMap: seasonName -> quality -> directLinks[]
      const seasonMap: Record<
        string,
        Record<string, { title: string; link: string; type?: "series" | "movie" }[]>
      > = {};

      $(".ep-card").each((_, epElement) => {
        const card = $(epElement);
        const seasonText = card.find(".season-number").text().trim();
        const seasonNum = seasonText.match(/\d+/)?.[0] || "1";
        const seasonName = `Season ${parseInt(seasonNum, 10)}`;

        const epBadgeText = card.find(".episode-badge").text().trim();
        const epNumMatch = epBadgeText.match(/\d+/)?.[0];
        const episodeTitle = epNumMatch
          ? `EPISODE ${parseInt(epNumMatch, 10)}`
          : epBadgeText || "EPISODE 1";

        if (!seasonMap[seasonName]) {
          seasonMap[seasonName] = {};
        }

        // Process Download Resolution Links
        card
          .find(".download-links .quality-grid a, .quality-box.download-links a")
          .each((_, qEl) => {
            const qAnchor = $(qEl);
            const qText = qAnchor.text().trim();
            const quality = cleanQuality(qText) || "720p";
            const qHref = qAnchor.attr("href") || "";
            if (!qHref) return;

            const fullLink = decodeCinefreakLink(qHref, baseUrl);
            if (!seasonMap[seasonName][quality]) {
              seasonMap[seasonName][quality] = [];
            }

            // Check if episode already added for this quality
            const exists = seasonMap[seasonName][quality].some(
              (ep) => ep.title === episodeTitle,
            );
            if (!exists) {
              seasonMap[seasonName][quality].push({
                title: episodeTitle,
                link: fullLink,
                type: "series",
              });
            }
          });
      });

      for (const [seasonName, qualityObj] of Object.entries(seasonMap)) {
        const qualityKeys = Object.keys(qualityObj);
        for (const quality of qualityKeys) {
          const directLinks = qualityObj[quality];
          // Sort episodes numerically
          directLinks.sort((a, b) => {
            const numA = parseInt(a.title.replace(/\D+/g, "") || "0", 10);
            const numB = parseInt(b.title.replace(/\D+/g, "") || "0", 10);
            return numA - numB;
          });

          linkList.push({
            title: qualityKeys.length > 1 ? `${seasonName} - ${quality}` : seasonName,
            quality: quality,
            directLinks: directLinks,
          });
        }
      }
    }

    // Process Movie download links or fallback download containers
    if (linkList.length === 0) {
      $(".download-links-div h4.movie-title, .download-links-div h3.movie-title").each(
        (_, headingEl) => {
          const heading = $(headingEl);
          const headingText = heading.text().replace(/\s+/g, " ").trim();
          const quality = cleanQuality(headingText);
          const container = heading.nextAll(".dlbtn-container").first();

          const directLinks: {
            title: string;
            link: string;
            type?: "series" | "movie";
          }[] = [];

          container.find("a[href]").each((_, aEl) => {
            const btn = $(aEl);
            const href = btn.attr("href");
            if (!href) return;
            const fullLink = decodeCinefreakLink(href, baseUrl);
            const btnText = btn.text().replace(/\s+/g, " ").trim() || "Download";

            directLinks.push({
              title: btnText.includes("Watch") ? "Watch Online" : "Download",
              link: fullLink,
              type: isSeries ? "series" : "movie",
            });
          });

          if (directLinks.length > 0) {
            linkList.push({
              title: headingText || `${quality || "Default"} Links`,
              quality: quality || undefined,
              directLinks,
            });
          }
        },
      );
    }

    // General fallback for any remaining generate.php links if still empty
    if (linkList.length === 0) {
      const fallbackLinks: {
        title: string;
        link: string;
        type?: "series" | "movie";
      }[] = [];

      $('a[href*="generate.php"]').each((_, el) => {
        const href = $(el).attr("href");
        if (href) {
          fallbackLinks.push({
            title: $(el).text().replace(/\s+/g, " ").trim() || "Download",
            link: decodeCinefreakLink(href, baseUrl),
            type: isSeries ? "series" : "movie",
          });
        }
      });

      if (fallbackLinks.length > 0) {
        linkList.push({
          title: isSeries ? "Episodes" : "Movie Links",
          directLinks: fallbackLinks,
        });
      }
    }

    const quickDownload = await providerContext.kvStore?.get<boolean>(
      "cinefreak_quickDownload",
    );

    let info: Info = {
      title,
      image,
      synopsis,
      imdbId: imdbId || "",
      type: isSeries ? "series" : "movie",
      quickDownload: quickDownload ?? true,
      linkList,
    };

    // Enrich with Cinemeta if IMDb ID is available
    if (imdbId && /^tt\d+$/.test(imdbId)) {
      try {
        const cinemeta = await getCinemetaMeta(
          imdbId,
          info.type,
          providerContext,
        );
        if (cinemeta) {
          info = applyCinemetaMeta(info, cinemeta);
          if (cinemeta.videos && info.linkList) {
            const skipTimings = await providerContext.kvStore?.get<boolean>("cinefreak_skipTimings");
            info.linkList = await Promise.all(
              info.linkList.map(async (linkGroup) => {
                if (linkGroup.directLinks) {
                  const seasonNum = parseInt(
                    linkGroup.title.match(/season\s*(\d+)/i)?.[1] || "1",
                    10,
                  );
                  let enriched = enrichCinemetaEpisodes(
                    linkGroup.directLinks,
                    cinemeta.videos || [],
                    seasonNum,
                  );
                  if (skipTimings ?? true) {
                    enriched = await enrichEpisodesWithSkipTimings(
                      enriched,
                      imdbId,
                      seasonNum,
                      providerContext,
                    );
                  }
                  return {
                    ...linkGroup,
                    directLinks: enriched,
                  };
                }
                return linkGroup;
              }),
            );
          }
        }
      } catch {
        // Silently keep default scraped meta if Cinemeta fails
      }
    }

    return info;
  } catch (error: any) {
    throwProviderError("CineFreak", "meta", error);

  }
};
