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
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
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
    } catch (err: any) {
      console.log("NetMirror verify notice:", err?.message || "unavailable");
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
    const t = Math.round(Date.now() / 1000);
    const url = `${baseUrl}/mobile/search.php?s=${encodeURIComponent(query)}&t=${t}`;

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

interface HomeTrayItem {
  id: string;
  image: string;
  alt?: string;
}

interface HomeTray {
  title: string;
  items: HomeTrayItem[];
}

const homeTrayCache = new Map<string, { trays: HomeTray[]; timestamp: number }>();
const titleCache = new Map<string, string>();

export const getCachedHomeTrays = async (
  providerContext: ProviderContext,
  prefix: NetMirrorOtt
): Promise<HomeTray[]> => {
  const cached = homeTrayCache.get(prefix);
  if (cached && Date.now() - cached.timestamp < 900000) {
    return cached.trays;
  }

  try {
    const { axios, cheerio } = providerContext;
    const baseUrl = await getNetMirrorBaseUrl();
    const cookies = await getNetMirrorCookie(providerContext, prefix);
    const url = `${baseUrl}/mobile/home.php`;

    const res = await axios.get(url, {
      headers: getNetMirrorMobileHeaders(baseUrl, cookies),
      timeout: 10000,
    });

    const html = res.data;
    if (!html || typeof html !== "string") {
      return cached ? cached.trays : [];
    }

    const $ = cheerio.load(html);
    const trays: HomeTray[] = [];

    $(".tray-container").each((_i: number, el: any) => {
      const title = $(el).find("h2").first().text().trim();
      const items: HomeTrayItem[] = [];

      $(el).find("article").each((_j: number, art: any) => {
        const a = $(art).find("a[data-post]").first();
        const id = a.attr("data-post") || $(art).attr("data-post");
        const img =
          $(art).find("img").attr("data-src") || $(art).find("img").attr("src");
        const alt = $(art).find("img").attr("alt") || "";
        if (id) {
          items.push({ id, image: img || "", alt });
        }
      });

      if (title && items.length > 0) {
        trays.push({ title, items });
      }
    });

    if (prefix === "hs") {
      try {
        const hsCookies = cookies.replace("ott=dp", "ott=hs").replace("ott=nf", "ott=hs");
        const hsRes = await axios.get(url, {
          headers: getNetMirrorMobileHeaders(baseUrl, hsCookies),
          timeout: 10000,
        });
        if (hsRes.data && typeof hsRes.data === "string") {
          const $hs = cheerio.load(hsRes.data);
          $hs(".tray-container").each((_i: number, el: any) => {
            const title = $hs(el).find("h2").first().text().trim();
            const items: HomeTrayItem[] = [];
            $hs(el).find("article").each((_j: number, art: any) => {
              const a = $hs(art).find("a[data-post]").first();
              const id = a.attr("data-post") || $hs(art).attr("data-post");
              const img =
                $hs(art).find("img").attr("data-src") || $hs(art).find("img").attr("src");
              const alt = $hs(art).find("img").attr("alt") || "";
              if (id) {
                items.push({ id, image: img || "", alt });
              }
            });
            if (title && items.length > 0 && !trays.some((t) => t.title.toLowerCase() === title.toLowerCase())) {
              trays.push({ title, items });
            }
          });
        }
      } catch {}
    }

    if (trays.length > 0) {
      homeTrayCache.set(prefix, { trays, timestamp: Date.now() });
      return trays;
    }
  } catch (err) {
    console.error(`getCachedHomeTrays error [${prefix}]:`, err);
  }

  return cached ? cached.trays : [];
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
    const prefixPath = prefix ? `${prefix}/` : "";
    const t = Math.round(Date.now() / 1000);
    const cleanFilter = (filter || "").trim().toLowerCase();

    // 1. Trending / Top Searches row
    if (
      !cleanFilter ||
      cleanFilter === "popular" ||
      cleanFilter === "top" ||
      cleanFilter === "trending" ||
      cleanFilter === "trending & top searches"
    ) {
      const cookies = await getNetMirrorCookie(providerContext, prefix);
      const url = `${baseUrl}/mobile/search.php?t=${t}`;
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

        titleCache.set(String(id), title);
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
    }

    // 2. Check if filter matches a tray from mobile/home.php
    const trays = await getCachedHomeTrays(providerContext, prefix);

    // Map common aliases to tray names
    const aliasMap: Record<string, string> = {
      "us tv shows": "international tv shows dubbed in hindi",
      "us & international tv shows": "international tv shows dubbed in hindi",
      "action": prefix === "pv" ? "action films" : "get in on the action",
      "action & adventure": prefix === "pv" ? "action films" : "get in on the action",
      "action films": "action films",
      "drama": prefix === "pv" ? "drama series" : "tv dramas",
      "tv dramas": "tv dramas",
      "sci-fi": prefix === "pv" ? "sci-fi films" : "tv sci-fi & fantasy",
      "sci-fi & fantasy": prefix === "pv" ? "sci-fi films" : "tv sci-fi & fantasy",
      "mystery & thriller": prefix === "pv" ? "mystery and thriller movies" : "tv thrillers & mysteries",
      "suspense & thriller": prefix === "pv" ? "suspense series" : "tv thrillers & mysteries",
      "comedy": "comedy movies",
      "comedy movies": "comedy movies",
      "kids & family": prefix === "pv" ? "kids and family movies" : "children & family tv",
      "kids & family movies": "kids and family movies",
      "children & family tv": "children & family tv",
      "korean": "korean",
      "korean dramas": "korean",
      "hotstar specials": "hotstar specials",
      "latest releases": "latest releases",
      "horror": prefix === "pv" ? "horror films" : "horror stories",
      "horror films": "horror films",
      "horror stories": "horror stories",
      "only on netflix": "only on netflix",
      "new on netflix": "new on netflix",
      "top movies": "top movies",
      "featured originals: series": "featured originals: series",
      "featured originals: movies": "featured originals: movies",
      "latest movies": "latest movies",
    };

    let matchedTray = trays.find(
      (tr) => tr.title.toLowerCase() === cleanFilter
    );

    if (!matchedTray && aliasMap[cleanFilter]) {
      const alias = aliasMap[cleanFilter];
      matchedTray = trays.find(
        (tr) => tr.title.toLowerCase() === alias
      );
    }

    if (!matchedTray) {
      matchedTray = trays.find((tr) => {
        const trTitle = tr.title.toLowerCase();
        return trTitle.includes(cleanFilter) || cleanFilter.includes(trTitle);
      });
    }

    if (matchedTray && matchedTray.items.length > 0) {
      const cookies = await getNetMirrorCookie(providerContext, prefix);

      // Fetch titles in parallel for items missing from titleCache
      const itemsToFetch = matchedTray.items.filter(
        (it) => !titleCache.has(it.id)
      );

      if (itemsToFetch.length > 0) {
        await Promise.all(
          itemsToFetch.map(async (it) => {
            try {
              const postUrl = `${baseUrl}/mobile/${prefixPath}post.php?id=${it.id}&t=${t}`;
              const postRes = await axios.get(postUrl, {
                headers: getNetMirrorMobileHeaders(baseUrl, cookies),
                timeout: 6000,
              });
              const tData = postRes.data;
              if (tData && tData.title) {
                titleCache.set(it.id, tData.title);
              }
            } catch {}
          })
        );
      }

      const catalog: Post[] = [];
      for (const it of matchedTray.items) {
        const title = titleCache.get(it.id) || it.alt?.trim() || `Item ${it.id}`;
        const image = it.image || getPosterUrl(it.id, prefix);
        const link = `${it.id}|${prefix}|${encodeURIComponent(title)}`;

        catalog.push({
          title,
          link,
          image,
          aspectRatio: prefix === "pv" ? 16 / 9 : undefined,
        });
      }

      return catalog;
    }

    // 3. Fallback: query search.php?s=
    const cookies = await getNetMirrorCookie(providerContext, prefix);
    const url = `${baseUrl}/mobile/search.php?s=${encodeURIComponent(filter)}&t=${t}`;

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

      titleCache.set(String(id), title);
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
      if (data.year) tags.push(String(data.year));
      if (typeof data.genre === "string") {
        data.genre.split(",").forEach((g: string) => {
          const trimmed = g.trim();
          if (trimmed) tags.push(trimmed);
        });
      }
      if (typeof data.match === "string" && data.match.includes("IMDb")) {
        tags.push(data.match);
      }
      if (typeof data.cast === "string") {
        cast = data.cast.split(",").map((c: string) => c.trim()).filter(Boolean);
      }

      if (Array.isArray(data.season) && data.season.length > 0) {
        type = "series";
        data.season.forEach((s: any) => {
          const sNum = String(s.s || s.name || "1").replace(/[^0-9]/g, "") || "1";
          linkList.push({
            title: `Season ${s.s || s.name || "1"}`,
            episodesLink: `${s.id}|${id}|${prefix}|${encodeURIComponent(title)}|${sNum}`,
          });
        });
      } else if (Array.isArray(data.episodes) && data.episodes.length > 0) {
        type = "series";
        linkList.push({
          title: "Season 1",
          episodesLink: `${id}|${id}|${prefix}|${encodeURIComponent(title)}|1`,
        });
      } else {
        type = "movie";
        linkList.push({
          title: title || "Movie",
          directLinks: [
            {
              title: title || "Movie",
              link: `${id}|${prefix}|${encodeURIComponent(title)}`,
              type: "movie",
            },
          ],
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
      const cmMeta =
        cmRes.data?.metas?.find(
          (m: any) =>
            (m.name || "").toLowerCase().replace(/[^a-z0-9]/g, "") ===
            cleanTitle
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
      directLinks: [
        {
          title: title || "Movie",
          link: `${id}|${prefix}|${encodeURIComponent(title)}`,
          type: "movie",
        },
      ],
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
  let seriesTitle = "";
  let seasonNumber = 1;

  if (seasonId.includes("|")) {
    const parts = seasonId.split("|");
    sid = parts[0];
    seriesId = parts[1] || sid;
    prefix = (parts[2] as NetMirrorOtt) || defaultPrefix;
    if (parts[3]) {
      try {
        seriesTitle = decodeURIComponent(parts[3]);
      } catch {
        seriesTitle = parts[3];
      }
    }
    if (parts[4]) {
      seasonNumber = parseInt(parts[4], 10) || 1;
    }
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
          const epNum =
            String(episode?.ep || "").replace(/[^0-9]/g, "").trim() ||
            `${episodeList.length + 1}`;
          const sNum =
            String(episode?.s || "").replace(/[^0-9]/g, "").trim() ||
            `${seasonNumber}`;
          const epTitle = episode?.t
            ? `Episode ${epNum}: ${episode.t}`
            : `Episode ${epNum}`;
          episodeList.push({
            title: epTitle,
            link: `${episode?.id}|${prefix}|${encodeURIComponent(seriesTitle)}|${sNum}|${epNum}`,
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
      link: `${sid}|${prefix}|${encodeURIComponent(seriesTitle)}|${seasonNumber}|1`,
    });
  }

  return episodeList;
};

export const netMirrorGetStream = async ({
  id: rawId,
  type,
  prefix: defaultPrefix,
  signal,
  providerContext,
  isDownload,
}: {
  id: string;
  type?: string;
  prefix: NetMirrorOtt;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> => {
  const { axios } = providerContext;
  const baseUrl = await getNetMirrorBaseUrl();

  let id = rawId;
  let prefix = defaultPrefix;
  let title = "";
  let seasonNum: number | undefined;
  let episodeNum: number | undefined;

  if (rawId.includes("|")) {
    const parts = rawId.split("|");
    id = parts[0];
    prefix = (parts[1] as NetMirrorOtt) || defaultPrefix;
    if (parts[2]) {
      try {
        title = decodeURIComponent(parts[2]);
      } catch {
        title = parts[2];
      }
    }
    if (parts[3]) seasonNum = parseInt(parts[3], 10) || undefined;
    if (parts[4]) episodeNum = parseInt(parts[4], 10) || undefined;
  }

  // Fallback title lookup if missing
  if (!title) {
    const cachedTitle = titleCache.get(id);
    if (cachedTitle) {
      title = cachedTitle;
    } else {
      try {
        const cookies = await getNetMirrorCookie(providerContext, prefix);
        const prefixPath = prefix ? `${prefix}/` : "";
        const t = Math.round(Date.now() / 1000);
        const postRes = await axios.get(
          `${baseUrl}/mobile/${prefixPath}post.php?id=${id}&t=${t}`,
          {
            headers: getNetMirrorMobileHeaders(baseUrl, cookies),
            timeout: 3000,
          }
        );
        const pData = postRes.data;
        if (pData?.title) {
          title = pData.title;
          titleCache.set(id, title);
          if (pData.s && seasonNum === undefined) {
            seasonNum = parseInt(String(pData.s).replace(/[^0-9]/g, ""), 10) || undefined;
          }
          if (pData.ep && episodeNum === undefined) {
            episodeNum = parseInt(String(pData.ep).replace(/[^0-9]/g, ""), 10) || undefined;
          }
        }
      } catch {}
    }
  }

  const ottHeader = prefix === "hs" ? "hs" : prefix === "pv" ? "pv" : "nf";
  const serverName =
    prefix === "hs" ? "Disney+" : prefix === "pv" ? "Prime Video" : "Netflix";
  const streamLinks: Stream[] = [];

  // 1. Primary: NetMirror TMDB Direct Stream Flow (net27.cc)
  if (title) {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/search/multi?api_key=cfe422613b250f702980a3bbf9e90716&query=${encodeURIComponent(title)}`;
      const tmdbRes = await axios.get(tmdbUrl, { timeout: 4000 });
      const candidate = tmdbRes.data?.results?.[0];
      if (candidate && candidate.id) {
        const isTv =
          candidate.media_type === "tv" ||
          type === "series" ||
          (seasonNum !== undefined && episodeNum !== undefined);
        const embedUrl = isTv
          ? `https://net27.cc/api/embed-tmdb/${candidate.id}?type=tv&s=${seasonNum || 1}&e=${episodeNum || 1}`
          : `https://net27.cc/api/embed-tmdb/${candidate.id}`;

        const nRes = await axios.get(embedUrl, {
          signal,
          headers: {
            Accept: "application/json",
            Referer: "https://videodownloader.site/",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
          timeout: 4000,
          validateStatus: (status: number) => status >= 200 && status < 400,
        });

        const nData = nRes.data;
        if (nData?.ok && Array.isArray(nData.streams)) {
          const subtitles: TextTracks = [];
          if (Array.isArray(nData.captions)) {
            nData.captions.forEach((cap: any) => {
              if (cap.url && cap.name) {
                subtitles.push({
                  title: cap.name,
                  language: cap.name,
                  type: "text/vtt",
                  uri: cap.url,
                });
              }
            });
          }

          for (const s of nData.streams) {
            if (!s.url) continue;
            const resStr = String(s.resolution || "1080");
            const qualityVal = (resStr === "1080" ||
            resStr === "720" ||
            resStr === "480" ||
            resStr === "360"
              ? resStr
              : "1080") as Stream["quality"];

            streamLinks.push({
              server: `${serverName} Direct (${resStr}p)`,
              link: s.url,
              type: "mp4",
              quality: qualityVal,
              subtitles: subtitles.length > 0 ? subtitles : undefined,
              headers: {
                Referer: "https://videodownloader.site/",
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              },
            });
          }
        }
      }
    } catch (err: any) {
      console.log(`net27 embed TMDB notice for ${title}:`, err?.message || "unavailable");
    }
  }

  // 2. Native NetMirror play.php -> playlist.php handshake with the SAME token (t_hash_t)
  try {
    const cookies = await getNetMirrorCookie(providerContext, prefix);
    const nativeHost = "https://net77.cc";
    const playRes = await axios.post(
      `${nativeHost}/play.php`,
      `id=${id}`,
      {
        signal,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Origin: nativeHost,
          Referer: `${nativeHost}/home`,
          Cookie: cookies,
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
        },
        timeout: 5000,
      }
    );

    const playData = playRes.data;
    if (playData && playData.h) {
      const tm = Math.round(Date.now() / 1000);
      const playlistUrl = `${nativeHost}/playlist.php?id=${id}&t=${encodeURIComponent(
        title || "Title"
      )}&tm=${tm}&h=${encodeURIComponent(playData.h)}`;

      const plRes = await axios.get(playlistUrl, {
        signal,
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          Referer: `${nativeHost}/home`,
          Origin: nativeHost,
          Cookie: cookies,
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 5000,
      });

      const plData = Array.isArray(plRes.data) ? plRes.data[0] : plRes.data;
      if (plData && Array.isArray(plData.sources)) {
        const subtitles: TextTracks = [];
        if (Array.isArray(plData.tracks)) {
          plData.tracks.forEach((track: any) => {
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

        plData.sources.forEach((source: any) => {
          let fileUrl = source.file || "";
          if (!fileUrl || fileUrl.includes("220884")) return;
          if (!fileUrl.startsWith("http")) {
            fileUrl = `${nativeHost}${fileUrl}`;
          }

          let quality: Stream["quality"] = "1080";
          const label = (source.label || "").toLowerCase();
          if (label.includes("full hd") || fileUrl.includes("1080p")) quality = "1080";
          else if (label.includes("mid hd") || fileUrl.includes("720p")) quality = "720";
          else if (label.includes("low hd") || fileUrl.includes("480p")) quality = "480";
          else if (label.includes("360p")) quality = "360";

          streamLinks.push({
            server: `${serverName} ${source.label || "HLS"}`,
            link: fileUrl,
            type: "m3u8",
            quality,
            subtitles: subtitles.length > 0 ? subtitles : undefined,
            headers: {
              Referer: `${nativeHost}/home`,
              Origin: nativeHost,
              Cookie: cookies,
            },
          });
        });
      }
    }
  } catch (err) {
    console.log(`Native NetMirror play.php flow for ${id}:`, err);
  }

  // 3. Official NewTV Player API (only if needed, strictly rejecting status otp / 220884)
  if (streamLinks.length === 0) {
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
        timeout: 5000,
      });

      const data = res.data;
      if (
        data &&
        data.status === "ok" &&
        data.video_link &&
        !data.video_link.includes("220884")
      ) {
        try {
          const m3u8Res = await axios.get(data.video_link, {
            signal,
            headers: { Referer: data.referer || `${baseUrl}/` },
            timeout: 4000,
          });
          const m3u8Text = typeof m3u8Res.data === "string" ? m3u8Res.data : "";
          if (!m3u8Text.includes("220884")) {
            const variantLines = m3u8Text
              .split("\n")
              .map((l: string) => l.trim())
              .filter((l: string) => l.startsWith("http") && !l.includes("220884"));

            for (const vUrl of variantLines) {
              let q: Stream["quality"] = "1080";
              if (vUrl.includes("720p")) q = "720";
              else if (vUrl.includes("480p")) q = "480";
              else if (vUrl.includes("360p")) q = "360";

              streamLinks.push({
                server: `${serverName} HLS (${q}p)`,
                link: vUrl,
                type: "m3u8",
                quality: q,
                headers: {
                  Referer: `${baseUrl}/`,
                  Origin: baseUrl,
                },
              });
            }
          }
        } catch {}
      }
    } catch (err) {
      console.error(`NewTV player API failed for ${id}:`, err);
    }
  }

  // 4. Strict filter to purge ANY fake teaser/abuse video (ID 220884)
  const cleanStreamLinks = streamLinks.filter(
    (s) => !s.link.includes("220884") && !s.server.includes("220884")
  );

  // 5. Sort streams: download-optimized if isDownload; otherwise quality descending
  cleanStreamLinks.sort((a, b) => {
    if (isDownload) {
      if (a.type === "mp4" && b.type !== "mp4") return -1;
      if (b.type === "mp4" && a.type !== "mp4") return 1;
    }
    const qA = parseInt(a.quality || "0", 10);
    const qB = parseInt(b.quality || "0", 10);
    return qB - qA;
  });

  return cleanStreamLinks;
};
