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

export const getNetMirrorHeaders = (baseUrl: string) => {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Referer: `${baseUrl}/`,
    Origin: baseUrl,
    Accept: "application/json, text/plain, */*",
  };
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
  prefix: "" | "pv";
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

    const url = `${baseUrl}${prefix ? `/${prefix}` : ""}/search.php?s=${encodeURIComponent(query)}`;
    const res = await axios.get(url, {
      signal,
      headers: getNetMirrorHeaders(baseUrl),
    });

    const results = res.data?.searchResult || [];
    const catalog: Post[] = [];

    for (const item of results) {
      const id = item?.id;
      const title = item?.t || "";
      if (!id) continue;

      const image =
        prefix === ""
          ? `https://img.nfmirrorcdn.top/poster/v/${id}.jpg`
          : `https://imgcdn.kim/poster/v/${id}.jpg`;

      const link = `${baseUrl}${prefix ? `/${prefix}` : ""}/post.php?id=${id}&title=${encodeURIComponent(title)}&t=${Math.round(Date.now() / 1000)}`;

      catalog.push({
        title,
        link,
        image,
        tag: item?.y || (item?.r && item.r !== "Series" ? item.r : undefined),
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
  prefix: "" | "pv";
  providerValue?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> => {
  try {
    if (page > 1) return [];
    const { axios } = providerContext;
    const baseUrl = await getNetMirrorBaseUrl();

    let url = "";
    if (prefix === "") {
      url = `${baseUrl}/mobile/search.php`;
    } else {
      const q = filter && filter.length > 1 && !filter.startsWith("/") ? filter : "the";
      url = `${baseUrl}/pv/search.php?s=${encodeURIComponent(q)}`;
    }

    const res = await axios.get(url, {
      signal,
      headers: getNetMirrorHeaders(baseUrl),
    });

    const results = res.data?.searchResult || [];
    const catalog: Post[] = [];

    for (const item of results) {
      const id = item?.id;
      const title = item?.t || "";
      if (!id) continue;

      const image =
        prefix === ""
          ? `https://img.nfmirrorcdn.top/poster/v/${id}.jpg`
          : `https://imgcdn.kim/poster/v/${id}.jpg`;

      const link = `${baseUrl}${prefix ? `/${prefix}` : ""}/post.php?id=${id}&title=${encodeURIComponent(title)}&t=${Math.round(Date.now() / 1000)}`;

      catalog.push({
        title,
        link,
        image,
        tag: item?.y || (item?.r && item.r !== "Series" ? item.r : undefined),
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
  prefix,
  providerContext,
}: {
  link: string;
  prefix: "" | "pv";
  providerContext: ProviderContext;
}): Promise<Info> => {
  const { axios } = providerContext;
  const baseUrl = await getNetMirrorBaseUrl();

  let id = "";
  let titleFromLink = "";
  try {
    if (link.includes("id=")) {
      id = link.split("id=")[1].split("&")[0];
    } else {
      id = link;
    }
    if (link.includes("title=")) {
      titleFromLink = decodeURIComponent(link.split("title=")[1].split("&")[0]);
    }
  } catch {}

  const t = Math.round(Date.now() / 1000);
  let title = titleFromLink;
  let synopsis = "";
  let image = prefix === "" ? `https://img.nfmirrorcdn.top/poster/v/${id}.jpg` : "";
  const cast: string[] = [];
  const tags: string[] = [];
  let imdbId = "";
  let type = "movie";
  const linkList: Link[] = [];

  if (prefix === "pv") {
    try {
      const postUrl = `${baseUrl}/pv/post.php?id=${id}&t=${t}`;
      const res = await axios.get(postUrl, {
        headers: getNetMirrorHeaders(baseUrl),
      });
      const data = res.data;
      if (data && data.status === "y") {
        title = data.title || title;
        synopsis = data.desc || "";
        if (data.year) tags.push(data.year);
        if (data.hdsd) tags.push(data.hdsd);
        if (data.director) cast.push(data.director);
        if (data.match?.includes("IMDb")) {
          tags.push(data.match);
        }

        if (Array.isArray(data.season) && data.season.length > 0) {
          type = "series";
          data.season.forEach((s: any) => {
            linkList.push({
              title: `Season ${s.s}`,
              episodesLink: s.id,
            });
          });
        } else {
          type = "movie";
          linkList.push({
            title: title || "Movie",
            directLinks: [{ title: "Movie", link: id, type: "movie" }],
          });
        }
      }
    } catch (e) {
      console.error("Error fetching pv/post.php:", e);
    }
  }

  if (prefix === "" || !synopsis) {
    if (title) {
      try {
        const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");

        const cmRes = await axios.get(
          `https://v3-cinemeta.strem.io/catalog/series/top/search=${encodeURIComponent(title)}.json`,
          { timeout: 4000 }
        );
        const cmMeta = cmRes.data?.metas?.find(
          (m: any) =>
            (m.name || "").toLowerCase().replace(/[^a-z0-9]/g, "") === cleanTitle
        );

        if (cmMeta) {
          imdbId = cmMeta.imdb_id || "";
          synopsis = synopsis || cmMeta.description || "";
          image = image || cmMeta.poster || "";
          type = "series";
          if (linkList.length === 0) {
            linkList.push({
              title: "Season 1",
              episodesLink: id,
            });
          }
        } else {
          const cmMovieRes = await axios.get(
            `https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(title)}.json`,
            { timeout: 4000 }
          );
          const cmMovie =
            cmMovieRes.data?.metas?.find(
              (m: any) =>
                (m.name || "").toLowerCase().replace(/[^a-z0-9]/g, "") === cleanTitle
            ) || cmMovieRes.data?.metas?.[0];

          if (cmMovie) {
            imdbId = cmMovie.imdb_id || "";
            synopsis = synopsis || cmMovie.description || "";
            image = image || cmMovie.poster || "";
            type = "movie";
            if (linkList.length === 0) {
              linkList.push({
                title: title || "Movie",
                directLinks: [{ title: "Movie", link: id, type: "movie" }],
              });
            }
          }
        }
      } catch (e) {}
    }
  }

  if (linkList.length === 0) {
    linkList.push({
      title: title || "Movie",
      directLinks: [{ title: "Movie", link: id, type: "movie" }],
    });
  }

  return {
    title: title || "Unknown Title",
    synopsis: synopsis || "",
    image: image || "",
    imdbId,
    type,
    cast: cast.length > 0 ? cast : undefined,
    tags: tags.length > 0 ? tags : undefined,
    linkList,
  };
};

export const netMirrorGetEpisodes = async ({
  seasonId,
  prefix,
  signal,
  providerContext,
}: {
  seasonId: string;
  prefix: "" | "pv";
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> => {
  const { axios } = providerContext;
  const baseUrl = await getNetMirrorBaseUrl();
  const t = Math.round(Date.now() / 1000);

  const url = `${baseUrl}${prefix ? `/${prefix}` : ""}/episodes.php?s=${seasonId}&t=${t}`;
  let page = 1;
  let hasMorePages = true;
  const episodeList: EpisodeLink[] = [];

  while (hasMorePages && page <= 5) {
    try {
      const res = await axios.get(`${url}&page=${page}`, {
        signal,
        headers: getNetMirrorHeaders(baseUrl),
      });
      const data = res.data;

      if (Array.isArray(data?.episodes) && data.episodes.length > 0) {
        data.episodes.forEach((episode: any) => {
          const epNum = (episode?.ep || "").replace("E", "").trim();
          episodeList.push({
            title: episode?.t ? `Episode ${epNum}: ${episode.t}` : `Episode ${epNum}`,
            link: episode?.id,
            description: episode?.ep_desc || undefined,
          });
        });
      }

      if (data?.nextPageShow && data.nextPageShow > 0) {
        page++;
      } else {
        hasMorePages = false;
      }
    } catch (err) {
      console.error(`netMirrorGetEpisodes error [${prefix}]:`, err);
      break;
    }
  }

  if (episodeList.length === 0 && seasonId) {
    episodeList.push({
      title: "Episode 1",
      link: seasonId,
    });
  }

  return episodeList;
};

export const netMirrorGetStream = async ({
  id,
  prefix,
  signal,
  providerContext,
  isDownload,
}: {
  id: string;
  prefix: "" | "pv";
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> => {
  try {
    const { axios } = providerContext;
    const baseUrl = await getNetMirrorBaseUrl();
    const t = Math.round(Date.now() / 1000);

    const url = `${baseUrl}${prefix ? `/${prefix}` : ""}/playlist.php?id=${id}&t=${t}`;
    const res = await axios.get(url, {
      signal,
      headers: getNetMirrorHeaders(baseUrl),
    });

    const playData = res.data?.[0];
    if (!playData || !Array.isArray(playData.sources)) {
      return [];
    }

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

    const streamLinks: Stream[] = [];
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
        server: `${prefix === "pv" ? "Prime" : "Netflix"} ${source.label || "HD"}`,
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

    if (isDownload) {
      streamLinks.sort((a, b) => {
        const qA = parseInt(a.quality || "0", 10);
        const qB = parseInt(b.quality || "0", 10);
        return qB - qA;
      });
    }

    return streamLinks;
  } catch (err) {
    console.error(`netMirrorGetStream error [${prefix}]:`, err);
    return [];
  }
};
