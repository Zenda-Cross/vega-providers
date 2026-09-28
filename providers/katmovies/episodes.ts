import { EpisodeLink, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";
import {
  enrichCinemetaEpisodes,
  getCinemetaMeta,
  readCinemetaContext,
} from "../getCinemetaMeta";
import { enrichEpisodesWithSkipTimings } from "../theintrodb";

async function getWithWAF(
  url: string,
  axios: any,
  openWebView: any,
  headers: any,
  customHeaders?: any,
): Promise<any> {
  const baseUrl = url.split("/").slice(0, 3).join("/");
  const mergedHeaders = { ...headers, ...customHeaders, Referer: baseUrl };
  try {
    return await axios.get(url, { headers: mergedHeaders });
  } catch (error: any) {
    if (error.response?.status === 403 && openWebView) {
      console.log(`WAF detected (403) for ${url}, using solver...`);
      const wafResult = await openWebView(baseUrl, {
        title: "Solve the captcha below and click done",
        description: "Required to bypass anti-bot protection.",
        headers: mergedHeaders,
        force: true,
        waitForCookie: "cf_clearance",
      });
      return await axios.get(url, {
        headers: {
          ...mergedHeaders,
          Cookie:
            (mergedHeaders.Cookie ? mergedHeaders.Cookie + "; " : "") +
            (wafResult.cookies || wafResult.cookie),
        },
      });
    }
    throw error;
  }
}

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio, openWebView, commonHeaders } = providerContext;
  const episodesLink: EpisodeLink[] = [];
  try {
    const context = readCinemetaContext(url);
    const requestUrl = context.requestUrl;
    const finish = async (): Promise<EpisodeLink[]> => {
      const quickDownload = await providerContext.kvStore?.get<boolean>("katmovies_quickDownload");
      if (!context.imdbId || !context.season) {
        return episodesLink.map((e) => ({
          ...e,
          quickDownload: quickDownload ?? true,
        }));
      }
      try {
        let enriched = episodesLink;
        const cinemeta = await getCinemetaMeta(
          context.imdbId,
          "series",
          providerContext,
        );
        if (cinemeta) {
          enriched = enrichCinemetaEpisodes(
            episodesLink,
            cinemeta.videos || [],
            context.season,
          );
        }
        const skipTimings = await providerContext.kvStore?.get<boolean>("katmovies_skipTimings");
        if (skipTimings ?? true) {
          try {
            enriched = await enrichEpisodesWithSkipTimings(
              enriched,
              context.imdbId,
              context.season,
              providerContext,
            );
          } catch (e) {
            console.warn("KatMovies: Skip timings failed", e);
          }
        }
        return enriched.map((e) => ({
          ...e,
          quickDownload: quickDownload ?? true,
        }));
      } catch {
        return episodesLink.map((e) => ({
          ...e,
          quickDownload: quickDownload ?? true,
        }));
      }
    };

    if (requestUrl.includes("gdflix")) {
      const baseUrl = requestUrl.split("/pack")?.[0];
      const res = await getWithWAF(
        requestUrl,
        axios,
        openWebView,
        commonHeaders,
      );
      const data = res.data;
      const $ = cheerio.load(data);
      const links = $(".list-group-item");
      links?.each((i, link) => {
        const href = $(link).find("a").attr("href");
        if (href) {
          episodesLink.push({
            title: $(link).text().trim() || `Episode ${i + 1}`,
            link: href.startsWith("http") ? href : baseUrl + href,
          });
        }
      });
      if (episodesLink.length > 0) {
        return finish();
      }
    }

function parseSvelteData(html: string): any {
  const match = html.match(/resolve\(\{\s*id:\s*\d+,\s*data:/);
  if (!match || match.index === undefined) return null;
  const start = match.index + match[0].length;
  const errorIdx = html.indexOf(",error:", start);
  if (errorIdx === -1) return null;
  const dataStr = html.substring(start, errorIdx);
  try {
    return Function(`"use strict"; return (${dataStr});`)();
  } catch {
    return null;
  }
}

    if (requestUrl.includes("/pack") || requestUrl.includes("kmhd") || requestUrl.includes("kmphotos")) {
      const res = await getWithWAF(
        requestUrl,
        axios,
        openWebView,
        commonHeaders,
      );
      const data = res.data;
      const parsed = parseSvelteData(data);
      const info = parsed?.info || parsed?.data?.info;
      const hostBase = requestUrl.split("/pack")[0].split("/file")[0];
      if (info && typeof info === "object") {
        for (const [id, ep] of Object.entries(info as Record<string, any>)) {
          const epTitle = ep?.name
            ? ep.name.replace(/\.mkv$/i, "").replace(/\./g, " ").trim()
            : id;
          episodesLink.push({
            title: epTitle,
            link: `${hostBase}/file/${id}`,
          });
        }
        if (episodesLink.length > 0) return finish();
      }

      const epIds = await extractKmhdEpisodes(requestUrl, providerContext, data);
      if (epIds && epIds.length > 0) {
        epIds.forEach((id: string, index: number) => {
          episodesLink.push({
            title: `Episode ${index + 1}`,
            link: `${hostBase}/file/${id}`,
          });
        });
        return finish();
      }
    }

    const res = await getWithWAF(
      requestUrl,
      axios,
      openWebView,
      commonHeaders,
      {
        Cookie: "unlocked=true",
      },
    );
    const episodeData = res.data;
    const $ = cheerio.load(episodeData);
    const links = $(".autohyperlink, a[href*='/file/'], a[href*='hubcloud'], a[href*='gdflix']");
    links?.each((i, link) => {
      const href = $(link).attr("href");
      if (href) {
        episodesLink.push({
          title: $(link).text().trim() || `Episode ${i + 1}`,
          link: href,
        });
      }
    });

    return finish();
  } catch (err) {
    throwProviderError("KatMovies", "episodes", err);
  }
};

async function extractKmhdEpisodes(
  katlink: string,
  providerContext: ProviderContext,
  cachedData?: string,
) {
  const { axios, openWebView, commonHeaders } = providerContext;
  let origin = "https://links.kmhd.me";
  try {
    origin = new URL(katlink).origin;
  } catch {}

  let pageData: string = cachedData || "";
  if (!pageData) {
    try {
      const res = await getWithWAF(katlink, axios, openWebView, commonHeaders, {
        Cookie: "unlocked=true",
        Referer: origin + "/",
      });
      pageData =
        typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    } catch {}
  }

  const packIdMatch = katlink.match(/[\w]+_[a-f0-9]{8}/);
  if (packIdMatch && pageData) {
    const packId = packIdMatch[0];
    const dynamicToken = pageData.match(/"PUBLIC_TOKEN"\s*:\s*"([^"]+)"/)?.[1];
    const token =
      dynamicToken ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTgwNzQ4NDIzMywiaWF0IjoxNzA3NDg0MjMzfQ.7u5bF9PcMhvClSDZgsd6EU-CQnp1Ec--wsezkDEgiZo";

    const chibiMatch = pageData.match(
      /"PUBLIC_CHIBI_PATH"\s*:\s*"https?:\/\/([^"\/]+)"/,
    )?.[1];
    const apiHost = chibiMatch
      ? chibiMatch.replace(/^upload-[^.]+\./, "api.")
      : "api.dandndn.one";

    try {
      const res = await axios.get(`https://${apiHost}/api/v1/file/${packId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...commonHeaders,
          Origin: origin,
          Referer: origin + "/",
        },
      });
      if (res.data?.zip_files?.length > 0) {
        return res.data.zip_files;
      }
    } catch (e) {}
  }

  try {
    const ids = pageData.match(/[\w]+_[a-f0-9]{8}/g);
    if (ids && ids.length > 0) {
      return Array.from(new Set(ids));
    }
    return [];
  } catch {
    return [];
  }
}
