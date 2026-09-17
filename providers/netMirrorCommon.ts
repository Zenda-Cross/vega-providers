import {
  EpisodeLink,
  Info,
  Link,
  Post,
  ProviderContext,
  Stream,
  TextTracks,
} from "./types";
import { getBaseUrl } from "./getBaseUrl";

export type NetMirrorOtt = "" | "pv" | "hs";

export const getNetMirrorBaseUrl = async (): Promise<string> => {
  try {
    const url = await getBaseUrl("nfMirror");
    if (url && !url.includes("net22.cc")) {
      return url.replace(/\/+$/, "");
    }
  } catch (err) {
    console.error("Error reading nfMirror baseUrl:", err);
  }
  return "https://net52.cc";
};

export const getNetMirrorMobileHeaders = (baseUrl: string, cookieStr?: string) => {
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/144.0.7559.132 Safari/537.36 /OS.Gatu v3.0",
    Referer: `${baseUrl}/home`,
    Origin: baseUrl,
    Accept: "application/json, text/plain, */*",
  };
  if (cookieStr) {
    headers["Cookie"] = cookieStr;
  }
  return headers;
};

export const getNetMirrorCookie = async (
  providerContext: ProviderContext,
  ott: NetMirrorOtt
): Promise<string> => {
  const { axios, kvStore } = providerContext;
  const baseUrl = await getNetMirrorBaseUrl();
  const ottCookie = ott === "hs" ? "dp" : ott === "pv" ? "pv" : "nf";

  let t_hash_t: string | undefined;
  try {
    if (kvStore) {
      const cached = await kvStore.get<{ token: string; ts: number }>("t_hash_t_data");
      if (cached && cached.token && Date.now() - cached.ts < 43200000) {
        t_hash_t = cached.token;
      }
    }
  } catch {}

  if (!t_hash_t) {
    try {
      const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

      const verifyRes = await axios.post(
        `${baseUrl}/verify.php`,
        `g-recaptcha-response=${uuid}`,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Origin: baseUrl,
            Referer: `${baseUrl}/verify2`,
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/144.0.7559.132 Safari/537.36 /OS.Gatu v3.0",
            "Upgrade-Insecure-Requests": "1",
          },
          maxRedirects: 0,
          validateStatus: (status: number) => status >= 200 && status < 400,
        }
      );

      const setCookie = verifyRes.headers?.["set-cookie"];
      if (setCookie) {
        const cookiesArr = Array.isArray(setCookie) ? setCookie : [setCookie];
        for (const sc of cookiesArr) {
          if (sc.includes("t_hash_t=")) {
            t_hash_t = sc.split("t_hash_t=")[1].split(";")[0];
            break;
          }
        }
      }

      if (t_hash_t && kvStore) {
        await kvStore.set("t_hash_t_data", { token: t_hash_t, ts: Date.now() });
      }
    } catch (err) {
      console.error("Error bypassing NetMirror verify.php:", err);
    }
  }

  return `t_hash_t=${t_hash_t || ""}; hd=on; ott=${ottCookie}`;
};

export const resolveNewTvApiBase = async (
  providerContext: ProviderContext
): Promise<string> => {
  const { axios, kvStore } = providerContext;
  try {
    if (kvStore) {
      const cached = await kvStore.get<{ apiBase: string; ts: number }>("newtv_api_base");
      if (cached && cached.apiBase && Date.now() - cached.ts < 86400000) {
        return cached.apiBase;
      }
    }
  } catch {}

  const domains = [
    "https://mobiledetects.com",
    "https://mobiledetect.app",
    "https://mobidetect.art",
    "https://mobidetect.cc",
    "https://mobidetect.shop",
    "https://mobidetects.top",
  ];

  for (const domain of domains) {
    try {
      const res = await axios.get(`${domain}/checknewtv.php`, {
        headers: {
          "X-Requested-With": "NetmirrorNewTV v1.0",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0 /OS.GatuNewTV v1.0",
          Accept: "application/json, text/plain, */*",
        },
        timeout: 4000,
      });

      const tokenHash = res.data?.token_hash;
      if (tokenHash) {
        const decoded =
          typeof atob === "function"
            ? atob(tokenHash)
            : Buffer.from(tokenHash, "base64").toString("utf-8");
        const apiBase = decoded.trim().replace(/\/+$/, "");
        if (apiBase.startsWith("http")) {
          if (kvStore) {
            await kvStore.set("newtv_api_base", { apiBase, ts: Date.now() });
          }
          return apiBase;
        }
      }
    } catch {}
  }

  return "https://tv.imgcdn.kim";
};

export const getPosterUrl = (id: string, prefix: NetMirrorOtt): string => {
  if (prefix === "pv") {
    return `https://imgcdn.kim/pv/341/${id}.jpg`;
  }
  if (prefix === "hs") {
    return `https://imgcdn.kim/hs/v/${id}.jpg`;
  }
  return `https://imgcdn.kim/poster/v/${id}.jpg`;
};

export const getEpisodePosterUrl = (id: string, prefix: NetMirrorOtt): string => {
  if (prefix === "pv") {
    return `https://img.nfmirrorcdn.top/pvepimg/${id}.jpg`;
  }
  if (prefix === "hs") {
    return `https://imgcdn.kim/hsepimg/${id}.jpg`;
  }
  return `https://imgcdn.kim/poster/v/150/${id}.jpg`;
};

export const netMirrorSearch = async ({
  searchQuery,
  page,
  prefix,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  prefix: NetMirrorOtt;
  providerValue?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> => {
  try {
    if (page > 1) return [];
    const { axios } = providerContext;
    const baseUrl = await getNetMirrorBaseUrl();
    const query = searchQuery?.trim();
    if (!query) return [];

    const cookies = await getNetMirrorCookie(providerContext, prefix);
    const prefixPath = prefix ? `${prefix}/` : "";
    const t = Math.round(Date.now() / 1000);
    const url = `${baseUrl}/mobile/${prefixPath}search.php?s=${encodeURIComponent(query)}&t=${t}`;

    const res = await axios.get(url, {
      signal,
      headers: getNetMirrorMobileHeaders(baseUrl, cookies),
    });

    const results = res.data?.searchResult || [];
    const catalog: Post[] = [];

    for (const item of results) {
      const id = item?.id;
      const title = item?.t || "";
      if (!id) continue;

      const image = getPosterUrl(id, prefix);
      const link = `${id}|${prefix}|${encodeURIComponent(title)}`;

      catalog.push({
        title,
        link,
        image,
        tag: item?.y || (item?.r && item.r !== "Series" ? item.r : undefined),
        aspectRatio: prefix === "pv" ? 16 / 9 : undefined,
      });
    }

    return catalog;
  } catch (err) {
    console.error(`netMirrorSearch error [${prefix}]:`, err);
    return [];
  }
};

export const netMirrorGetPosts = async ({
  filter,
  page,
  prefix,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  prefix: NetMirrorOtt;
  providerValue?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> => {
  try {
    if (page > 1) return [];
    const { axios } = providerContext;
    const baseUrl = await getNetMirrorBaseUrl();
    const cookies = await getNetMirrorCookie(providerContext, prefix);
    const prefixPath = prefix ? `${prefix}/` : "";
    const t = Math.round(Date.now() / 1000);

    let url = "";
    if (!filter || filter === "popular" || filter === "top" || filter === "trending") {
      url = `${baseUrl}/mobile/${prefixPath}search.php?t=${t}`;
    } else {
      url = `${baseUrl}/mobile/${prefixPath}search.php?s=${encodeURIComponent(filter)}&t=${t}`;
    }

    const res = await axios.get(url, {
      signal,
      headers: getNetMirrorMobileHeaders(baseUrl, cookies),
    });

    const results = res.data?.searchResult || [];
    const catalog: Post[] = [];

    for (const item of results) {
      const id = item?.id;
      const title = item?.t || "";
      if (!id) continue;

      const image = getPosterUrl(id, prefix);
      const link = `${id}|${prefix}|${encodeURIComponent(title)}`;

      catalog.push({
        title,
        link,
        image,
        tag: item?.y || (item?.r && item.r !== "Series" ? item.r : undefined),
        aspectRatio: prefix === "pv" ? 16 / 9 : undefined,
      });
    }

    return catalog;
  } catch (err) {
    console.error(`netMirrorGetPosts error [${prefix}]:`, err);
    return [];
  }
};

export const netMirrorGetMeta = async ({
  link,
  prefix: defaultPrefix,
  providerContext,
}: {
  link: string;
  prefix: NetMirrorOtt;
  providerContext: ProviderContext;
}): Promise<Info> => {
  const { axios } = providerContext;
  const baseUrl = await getNetMirrorBaseUrl();

  let id = "";
  let prefix: NetMirrorOtt = defaultPrefix;
  let titleFromLink = "";

  if (link.includes("|")) {
    const parts = link.split("|");
    id = parts[0];
    prefix = (parts[1] as NetMirrorOtt) || defaultPrefix;
    if (parts[2]) {
      try {
        titleFromLink = decodeURIComponent(parts[2]);
      } catch {
        titleFromLink = parts[2];
      }
    }
  } else if (link.includes("id=")) {
    try {
      id = link.split("id=")[1].split("&")[0];
      if (link.includes("title=")) {
        titleFromLink = decodeURIComponent(link.split("title=")[1].split("&")[0]);
      }
    } catch {}
  } else {
    id = link;
  }

  const cookies = await getNetMirrorCookie(providerContext, prefix);
  const prefixPath = prefix ? `${prefix}/` : "";
  const t = Math.round(Date.now() / 1000);

  let title = titleFromLink;
  let synopsis = "";
  let image = getPosterUrl(id, prefix);
  let poster = prefix === "pv" ? `https://imgcdn.kim/pv/v/${id}.jpg` : undefined;
  let cast: string[] = [];
  const tags: string[] = [];
  let imdbId = "";
  let type = "movie";
  const linkList: Link[] = [];

  try {
    const postUrl = `${baseUrl}/mobile/${prefixPath}post.php?id=${id}&t=${t}`;
    const res = await axios.get(postUrl, {
      headers: getNetMirrorMobileHeaders(baseUrl, cookies),
    });
    const data = res.data;

    if (data) {
      title = data.title || title;
      synopsis = data.desc || "";
      if (data.year) tags.push(data.year);
      if (data.genre) {
        data.genre.split(",").forEach((g: string) => {
          const trimmed = g.trim();
          if (trimmed) tags.push(trimmed);
        });
      }
      if (data.match?.includes("IMDb")) {
        tags.push(data.match);
      }
      if (data.cast) {
        cast = data.cast.split(",").map((c: string) => c.trim()).filter(Boolean);
      }

      if (Array.isArray(data.season) && data.season.length > 0) {
        type = "series";
        data.season.forEach((s: any) => {
          linkList.push({
            title: `Season ${s.s || s.name || "1"}`,
            episodesLink: `${s.id}|${id}|${prefix}`,
          });
        });
      } else if (Array.isArray(data.episodes) && data.episodes.length > 0) {
        type = "series";
        linkList.push({
          title: "Season 1",
          episodesLink: `${id}|${id}|${prefix}`,
        });
      } else {
        type = "movie";
        linkList.push({
          title: title || "Movie",
          directLinks: [{ title: title || "Movie", link: `${id}|${prefix}`, type: "movie" }],
        });
      }
    }
  } catch (err) {
    console.error(`netMirrorGetMeta post.php error [${prefix}]:`, err);
  }

  // Fallback to Cinemeta for synopsis if missing
  if (!synopsis && title) {
    try {
      const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cmRes = await axios.get(
        `https://v3-cinemeta.strem.io/catalog/${type === "series" ? "series" : "movie"}/top/search=${encodeURIComponent(title)}.json`,
        { timeout: 3500 }
      );
      const cmMeta = cmRes.data?.metas?.find(
        (m: any) => (m.name || "").toLowerCase().replace(/[^a-z0-9]/g, "") === cleanTitle
      ) || cmRes.data?.metas?.[0];

      if (cmMeta) {
        imdbId = imdbId || cmMeta.imdb_id || "";
        synopsis = synopsis || cmMeta.description || "";
        if (!image) image = cmMeta.poster || "";
      }
    } catch {}
  }

  if (linkList.length === 0) {
    linkList.push({
      title: title || "Movie",
      directLinks: [{ title: title || "Movie", link: `${id}|${prefix}`, type: "movie" }],
    });
  }

  return {
    title: title || "Unknown Title",
    synopsis: synopsis || "",
    image: image || "",
    poster,
    imdbId,
    type,
    cast: cast.length > 0 ? cast : undefined,
    tags: tags.length > 0 ? tags : undefined,
    linkList,
  };
};

export const netMirrorGetEpisodes = async ({
  seasonId,
  prefix: defaultPrefix,
  signal,
  providerContext,
}: {
  seasonId: string;
  prefix: NetMirrorOtt;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> => {
  const { axios } = providerContext;
  const baseUrl = await getNetMirrorBaseUrl();
  const t = Math.round(Date.now() / 1000);

  let sid = seasonId;
  let seriesId = seasonId;
  let prefix = defaultPrefix;

  if (seasonId.includes("|")) {
    const parts = seasonId.split("|");
    sid = parts[0];
    seriesId = parts[1] || sid;
    prefix = (parts[2] as NetMirrorOtt) || defaultPrefix;
  }

  const cookies = await getNetMirrorCookie(providerContext, prefix);
  const prefixPath = prefix ? `${prefix}/` : "";
  const episodeList: EpisodeLink[] = [];

  let page = 1;
  let hasMorePages = true;

  while (hasMorePages && page <= 6) {
    try {
      const url = `${baseUrl}/mobile/${prefixPath}episodes.php?s=${sid}&series=${seriesId}&t=${t}&page=${page}`;
      const res = await axios.get(url, {
        signal,
        headers: getNetMirrorMobileHeaders(baseUrl, cookies),
      });
      const data = res.data;

      if (Array.isArray(data?.episodes) && data.episodes.length > 0) {
        data.episodes.forEach((episode: any) => {
          const epNum = (episode?.ep || "").replace("E", "").trim() || `${episodeList.length + 1}`;
          const epTitle = episode?.t ? `Episode ${epNum}: ${episode.t}` : `Episode ${epNum}`;
          episodeList.push({
            title: epTitle,
            link: `${episode?.id}|${prefix}`,
            description: episode?.ep_desc || undefined,
          });
        });

        if (data?.nextPageShow && data.nextPageShow > 0) {
          page++;
        } else {
          hasMorePages = false;
        }
      } else {
        hasMorePages = false;
      }
    } catch (err) {
      console.error(`netMirrorGetEpisodes error [${prefix}]:`, err);
      break;
    }
  }

  if (episodeList.length === 0 && sid) {
    episodeList.push({
      title: "Episode 1",
      link: `${sid}|${prefix}`,
    });
  }

  return episodeList;
};

export const netMirrorGetStream = async ({
  id: rawId,
  prefix: defaultPrefix,
  signal,
  providerContext,
  isDownload,
}: {
  id: string;
  prefix: NetMirrorOtt;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> => {
  const { axios } = providerContext;
  const baseUrl = await getNetMirrorBaseUrl();

  let id = rawId;
  let prefix = defaultPrefix;
  if (rawId.includes("|")) {
    const parts = rawId.split("|");
    id = parts[0];
    prefix = (parts[1] as NetMirrorOtt) || defaultPrefix;
  }

  const ottHeader = prefix === "hs" ? "hs" : prefix === "pv" ? "pv" : "nf";
  const serverName = prefix === "hs" ? "Disney+" : prefix === "pv" ? "Prime Video" : "Netflix";
  const streamLinks: Stream[] = [];

  // 1. Official NewTV player API
  try {
    const apiBase = await resolveNewTvApiBase(providerContext);
    const playerUrl = `${apiBase}/newtv/player.php?id=${id}`;

    const res = await axios.get(playerUrl, {
      signal,
      headers: {
        Ott: ottHeader,
        "X-Requested-With": "NetmirrorNewTV v1.0",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0 /OS.GatuNewTV v1.0",
        Accept: "application/json, text/plain, */*",
      },
    });

    const data = res.data;
    if (data && data.video_link) {
      streamLinks.push({
        server: `${serverName} HD (Auto)`,
        link: data.video_link,
        type: "m3u8",
        quality: "1080",
        headers: {
          Referer: data.referer || baseUrl,
          Origin: baseUrl,
        },
      });
    }
  } catch (err) {
    console.error(`NewTV player API failed for ${id}:`, err);
  }

  // 2. Fallback: native playlist.php
  if (streamLinks.length === 0) {
    try {
      const cookies = await getNetMirrorCookie(providerContext, prefix);
      const prefixPath = prefix ? `${prefix}/` : "";
      const t = Math.round(Date.now() / 1000);
      const playlistUrl = `${baseUrl}/mobile/${prefixPath}playlist.php?id=${id}&t=${t}`;

      const res = await axios.get(playlistUrl, {
        signal,
        headers: getNetMirrorMobileHeaders(baseUrl, cookies),
      });

      const playData = Array.isArray(res.data) ? res.data[0] : res.data;
      if (playData && Array.isArray(playData.sources)) {
        const subtitles: TextTracks = [];
        if (Array.isArray(playData.tracks)) {
          playData.tracks.forEach((track: any) => {
            let uri = track.file || "";
            if (uri.startsWith("//")) uri = "https:" + uri;
            if (!uri) return;

            const isVtt = uri.endsWith(".vtt");
            subtitles.push({
              title: track.label || "Subtitle",
              language: track.label || "English",
              type: isVtt ? "text/vtt" : "application/x-subrip",
              uri,
            });
          });
        }

        playData.sources.forEach((source: any) => {
          let fileUrl = source.file || "";
          if (!fileUrl) return;
          if (!fileUrl.startsWith("http")) {
            fileUrl = `${baseUrl}${fileUrl}`;
          }

          let quality: Stream["quality"] = undefined;
          const label = (source.label || "").toLowerCase();
          if (label.includes("full hd") || fileUrl.includes("1080p")) quality = "1080";
          else if (label.includes("mid hd") || fileUrl.includes("720p")) quality = "720";
          else if (label.includes("low hd") || fileUrl.includes("480p")) quality = "480";
          else if (label.includes("360p")) quality = "360";

          streamLinks.push({
            server: `${serverName} ${source.label || "HD"}`,
            link: fileUrl,
            type: "m3u8",
            quality,
            subtitles: subtitles.length > 0 ? subtitles : undefined,
            headers: {
              Referer: `${baseUrl}/`,
              Origin: baseUrl,
              Cookie: "hd=on",
            },
          });
        });
      }
    } catch (err) {
      console.error(`native playlist.php fallback failed for ${id}:`, err);
    }
  }

  if (isDownload) {
    streamLinks.sort((a, b) => {
      const qA = parseInt(a.quality || "0", 10);
      const qB = parseInt(b.quality || "0", 10);
      return qB - qA;
    });
  }

  return streamLinks;
};
