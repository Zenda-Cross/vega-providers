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

export const getNetMirrorBaseUrl = async (
  providerContext?: ProviderContext
): Promise<string> => {
  try {
    if (providerContext?.kvStore) {
      const override = await providerContext.kvStore.get<string>("baseUrlOverride");
      if (override && override.trim().startsWith("http")) {
        return override.trim().replace(/\/+$/, "");
      }
    }
  } catch {}

  try {
    const url = await getBaseUrl("nfMirror");
    if (
      url &&
      !url.includes("net22.cc") &&
      !url.includes("net77.cc") &&
      !url.includes("net50.cc")
    ) {
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

export const unlockNetMirrorMobileSession = async (
  providerContext: ProviderContext,
  baseUrl: string
): Promise<string | undefined> => {
  const { axios, kvStore } = providerContext;
  try {
    const appUa =
      "Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/144.0.7559.132 Safari/537.36 /OS.Gatu v3.0";

    const homeRes = await axios.get(`${baseUrl}/mobile/home?app=1`, {
      headers: {
        "User-Agent": appUa,
        "X-Requested-With": "com.netmirror.app",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 8000,
    });

    const setCookies =
      homeRes.headers?.["set-cookie"] ||
      homeRes.headers?.["x-set-cookie"] ||
      [];
    const cookiesArr = Array.isArray(setCookies) ? setCookies : [setCookies];
    const initialCookie = cookiesArr
      .map((c: string) => String(c).split(";")[0])
      .filter(Boolean)
      .join("; ");

    const html = typeof homeRes.data === "string" ? homeRes.data : "";
    const matchAddHash = html.match(/data-addhash=["']([^"']+)["']/);
    const addhash = matchAddHash ? matchAddHash[1] : null;

    if (!addhash) return undefined;

    // Trigger the ad visit via userver
    const hostDomain = baseUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const userverUrl = `https://userver.${hostDomain}/?hee5=${addhash}&a=y&t=${Math.random()}`;
    await axios
      .get(userverUrl, {
        headers: {
          "User-Agent": appUa,
          Referer: `${baseUrl}/mobile/home?app=1`,
          Cookie: initialCookie,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        maxRedirects: 0,
        validateStatus: () => true,
        timeout: 5000,
      })
      .catch(() => {});

    // Poll mobile/verify2.php until verified (server timer runs ~20-25 seconds)
    const pollCookie = [
      "ext_name=ojplmecpdpgccookcobabopnaifgidhf",
      `addhash=${encodeURIComponent(addhash)}`,
      initialCookie,
    ]
      .filter(Boolean)
      .join("; ");

    const startTime = Date.now();
    let verifiedToken: string | undefined;

    while (Date.now() - startTime < 45000) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        const vRes = await axios.post(
          `${baseUrl}/mobile/verify2.php`,
          `verify=${encodeURIComponent(addhash)}`,
          {
            headers: {
              "User-Agent": appUa,
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              Referer: `${baseUrl}/mobile/home`,
              Origin: baseUrl,
              Cookie: pollCookie,
            },
            validateStatus: () => true,
            timeout: 5000,
          }
        );

        const vSetCookies =
          vRes.headers?.["set-cookie"] ||
          vRes.headers?.["x-set-cookie"] ||
          [];
        const vCookiesArr = Array.isArray(vSetCookies) ? vSetCookies : [vSetCookies];
        for (const sc of vCookiesArr) {
          if (typeof sc === "string" && sc.includes("t_hash_t=")) {
            const tokenMatch = sc.match(/t_hash_t=([^;]+)/);
            if (tokenMatch && !tokenMatch[1].includes("::99")) {
              verifiedToken = decodeURIComponent(tokenMatch[1]);
              break;
            }
          }
        }

        if (verifiedToken) {
          break;
        }

        if (vRes.data?.statusup === "All Done") {
          // In the browser, 'location.reload()' is called upon 'All Done', which refreshes the cookie
          const reloadRes = await axios
            .get(`${baseUrl}/mobile/home?app=1`, {
              headers: {
                "User-Agent": appUa,
                "X-Requested-With": "com.netmirror.app",
                Cookie: pollCookie,
              },
              timeout: 6000,
            })
            .catch(() => null);

          const rSetCookies =
            reloadRes?.headers?.["set-cookie"] ||
            reloadRes?.headers?.["x-set-cookie"] ||
            [];
          const rCookiesArr = Array.isArray(rSetCookies) ? rSetCookies : [rSetCookies];
          for (const sc of rCookiesArr) {
            if (typeof sc === "string" && sc.includes("t_hash_t=")) {
              const tokenMatch = sc.match(/t_hash_t=([^;]+)/);
              if (tokenMatch && !tokenMatch[1].includes("::99")) {
                verifiedToken = decodeURIComponent(tokenMatch[1]);
                break;
              }
            }
          }
          break;
        }
      } catch {}
    }

    if (verifiedToken && kvStore) {
      await kvStore.set("t_hash_t", verifiedToken);
      await kvStore.set("t_hash_t_data", { token: verifiedToken, ts: Date.now() });
    }

    return verifiedToken;
  } catch (err: any) {
    console.log("Mobile ad verification notice:", err?.message || err);
    return undefined;
  }
};

let unlockPromise: Promise<string | undefined> | null = null;

export const getNetMirrorCookie = async (
  providerContext: ProviderContext,
  ott: NetMirrorOtt
): Promise<string> => {
  const { kvStore } = providerContext;
  const baseUrl = await getNetMirrorBaseUrl(providerContext);
  const ottCookie = ott === "hs" ? "dp" : ott === "pv" ? "pv" : "nf";

  let t_hash_t: string | undefined;
  try {
    if (kvStore) {
      const cached = await kvStore.get<{ token: string; ts: number }>("t_hash_t_data");
      if (
        cached &&
        cached.token &&
        !cached.token.includes("::99") &&
        Date.now() - cached.ts < 43200000
      ) {
        t_hash_t = cached.token;
      }

      if (!t_hash_t) {
        const userToken = await kvStore.get<string>("t_hash_t");
        if (userToken && userToken.trim() && !userToken.includes("::99")) {
          const parts = userToken.trim().split("::");
          if (parts.length >= 3) {
            const tokenSec = parseInt(parts[2], 10);
            if (!isNaN(tokenSec) && Date.now() / 1000 - tokenSec < 43200) {
              t_hash_t = userToken.trim();
            }
          }
        }
      }

      if (!t_hash_t) {
        try {
          await kvStore.delete("t_hash_t");
          await kvStore.delete("t_hash_t_data");
        } catch {}
      }
    }
  } catch {}

  if (!t_hash_t) {
    if (!unlockPromise) {
      unlockPromise = unlockNetMirrorMobileSession(providerContext, baseUrl).finally(() => {
        unlockPromise = null;
      });
    }
    t_hash_t = await unlockPromise;
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
    return id.length > 10
      ? `https://imgcdn.kim/pv/v/350/${id}.jpg`
      : `https://imgcdn.kim/pv/341/${id}.jpg`;
  }
  if (prefix === "hs") {
    return `https://imgcdn.kim/hs/v/166/${id}.jpg`;
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
    const baseUrl = await getNetMirrorBaseUrl(providerContext);
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

const parseHtmlTrays = (html: string, cheerio: any): HomeTray[] => {
  const trays: HomeTray[] = [];
  if (!html || typeof html !== "string") return trays;

  if (cheerio && typeof cheerio.load === "function") {
    try {
      const $ = cheerio.load(html);
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

      $("#top10, .top10").each((_i: number, el: any) => {
        const title = $(el).find("span").first().text().trim() || "Top 10 Today";
        const items: HomeTrayItem[] = [];
        $(el).find(".top10-post, article").each((_j: number, art: any) => {
          const a = $(art).find("a[data-post]").first();
          const id = a.attr("data-post") || $(art).attr("data-post");
          const img =
            $(art).find("img").attr("data-src") || $(art).find("img").attr("src");
          if (id) {
            items.push({ id, image: img || "", alt: "" });
          }
        });
        if (title && items.length > 0 && !trays.some((t) => t.title.toLowerCase() === title.toLowerCase())) {
          trays.push({ title, items });
        }
      });
      if (trays.length > 0) return trays;
    } catch {}
  }

  // Regex fallback
  const traySections = html.split(/class="[^"]*tray-container[^"]*"/);
  for (let i = 1; i < traySections.length; i++) {
    const sec = traySections[i];
    const h2Match = sec.match(/<h2[^>]*>([^<]+)<\/h2>/);
    const title = h2Match ? h2Match[1].trim() : "";
    const items: HomeTrayItem[] = [];
    const artMatches = sec.match(/<article[\s\S]*?<\/article>/g) || [];
    for (const art of artMatches) {
      const idMatch = art.match(/data-post="([^"]+)"/);
      const imgMatch = art.match(/data-src="([^"]+)"/) || art.match(/src="([^"]+)"/);
      const altMatch = art.match(/alt="([^"]*)"/);
      if (idMatch) {
        items.push({
          id: idMatch[1],
          image: imgMatch ? imgMatch[1] : "",
          alt: altMatch ? altMatch[1] : "",
        });
      }
    }
    if (title && items.length > 0 && !trays.some((t) => t.title.toLowerCase() === title.toLowerCase())) {
      trays.push({ title, items });
    }
  }

  return trays;
};

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
    const baseUrl = await getNetMirrorBaseUrl(providerContext);
    const cookies = await getNetMirrorCookie(providerContext, prefix);
    const url = `${baseUrl}/mobile/home?app=1`;

    const homeHeaders = {
      ...getNetMirrorMobileHeaders(baseUrl, cookies),
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${baseUrl}/mobile/home?app=1`,
    };

    const res = await axios.get(url, {
      headers: homeHeaders,
      timeout: 10000,
    });

    const html = typeof res.data === "string" ? res.data : "";
    let trays: HomeTray[] = parseHtmlTrays(html, cheerio);

    // If home page returned the ad verification screen (data-addhash) or 0 trays because session is unverified:
    if (
      trays.length === 0 &&
      (html.includes("data-addhash") ||
        html.includes("verify2.php") ||
        !cookies.includes("t_hash_t=") ||
        cookies.includes("t_hash_t=;"))
    ) {
      if (providerContext.kvStore) {
        try {
          await providerContext.kvStore.delete("t_hash_t");
          await providerContext.kvStore.delete("t_hash_t_data");
        } catch {}
      }

      if (!unlockPromise) {
        unlockPromise = unlockNetMirrorMobileSession(providerContext, baseUrl).finally(() => {
          unlockPromise = null;
        });
      }
      const newCookie = await unlockPromise;

      if (newCookie && !newCookie.includes("::99")) {
        const freshCookies = `t_hash_t=${newCookie}; hd=on; ott=${prefix === "hs" ? "dp" : prefix === "pv" ? "pv" : "nf"}`;
        const retryRes = await axios.get(url, {
          headers: {
            ...getNetMirrorMobileHeaders(baseUrl, freshCookies),
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
            "X-Requested-With": "XMLHttpRequest",
            Referer: `${baseUrl}/mobile/home?app=1`,
          },
          timeout: 10000,
        });
        trays = parseHtmlTrays(retryRes.data, cheerio);
      }
    }

    if (prefix === "hs") {
      try {
        const hsCookies = cookies.replace("ott=dp", "ott=hs").replace("ott=nf", "ott=hs");
        const hsRes = await axios.get(url, {
          headers: {
            ...homeHeaders,
            Cookie: hsCookies,
          },
          timeout: 10000,
        });
        const hsTrays = parseHtmlTrays(hsRes.data, cheerio);
        for (const ht of hsTrays) {
          if (!trays.some((t) => t.title.toLowerCase() === ht.title.toLowerCase())) {
            trays.push(ht);
          }
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
    const baseUrl = await getNetMirrorBaseUrl(providerContext);
    const prefixPath = prefix ? `${prefix}/` : "";
    const t = Math.round(Date.now() / 1000);
    const cleanFilter = (filter || "").trim().toLowerCase();

    // 1. Get OTT-specific trays from mobile/home
    const trays = await getCachedHomeTrays(providerContext, prefix);

    // Map common aliases to tray names
    const aliasMap: Record<string, string> = {
      "us tv shows": "us tv shows",
      "us & international tv shows": "us tv shows dubbed in hindi",
      "action": prefix === "pv" ? "action films" : "blockbuster movies",
      "action & adventure": prefix === "pv" ? "action films" : "blockbuster movies",
      "get in on the action": prefix === "pv" ? "action films" : "blockbuster movies",
      "action films": "action films",
      "drama": prefix === "pv" ? "drama series" : "emotional tv shows",
      "tv dramas": prefix === "pv" ? "drama series" : "emotional tv shows",
      "drama series": "drama series",
      "sci-fi": prefix === "pv" ? "science fiction movies" : "exciting tv shows",
      "sci-fi & fantasy": prefix === "pv" ? "science fiction movies" : "exciting tv shows",
      "tv sci-fi & fantasy": prefix === "pv" ? "science fiction movies" : "exciting tv shows",
      "mystery & thriller": prefix === "pv" ? "mystery and thriller movies" : "crime tv shows",
      "tv thrillers & mysteries": prefix === "pv" ? "mystery and thriller movies" : "crime tv shows",
      "suspense & thriller": prefix === "pv" ? "mystery and thriller movies" : "crime tv shows",
      "comedy": prefix === "pv" ? "comedy movies" : "casual viewing",
      "comedy movies": "comedy movies",
      "kids & family": prefix === "pv" ? "kids and family movies" : "teen tv shows",
      "kids & family movies": "kids and family movies",
      "children & family tv": prefix === "pv" ? "kids and family movies" : "teen tv shows",
      "asian movies & tv": "hindi movies & tv",
      "exciting movies": "exciting tv shows",
      "your next watch": "crowd pleasers",
      "gems for you": "gems for you",
      "international tv shows": "us tv shows dubbed in hindi",
      "korean": "korean",
      "korean dramas": "korean",
      "hotstar specials": "hotstar specials",
      "latest releases": "latest releases",
      "horror": prefix === "pv" ? "horror films" : "horror stories",
      "horror films": "horror films",
      "horror stories": "horror stories",
      "only on netflix": "only on netflix",
      "new on netflix": "new on netflix",
      "top movies": "top 10 movies in netflix today",
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

    // Default to the first tray if no filter match, keeping it 100% OTT-specific
    if (!matchedTray && trays.length > 0) {
      matchedTray = trays[0];
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

    // Ultimate fallback if search returned 0 results: use first OTT tray
    if (catalog.length === 0 && trays.length > 0 && trays[0].items.length > 0) {
      for (const it of trays[0].items) {
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
  const baseUrl = await getNetMirrorBaseUrl(providerContext);

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
  const baseUrl = await getNetMirrorBaseUrl(providerContext);
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
  const baseUrl = await getNetMirrorBaseUrl(providerContext);

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
  let cookies = "";

  try {
    cookies = await getNetMirrorCookie(providerContext, prefix);
    const tm = Math.round(Date.now() / 1000);

    const prefixPath = prefix === "hs" ? "hs/" : prefix === "pv" ? "pv/" : "";

    // 1. Primary Native Mobile App Playlist flow: try with prefixPath first, then generic fallback
    let plData: any = null;
    const plUrlsToTry = [
      ...(prefixPath ? [`${baseUrl}/mobile/${prefixPath}playlist.php?id=${id}&t=${encodeURIComponent(title || "Title")}&tm=${tm}`] : []),
      `${baseUrl}/mobile/playlist.php?id=${id}&t=${encodeURIComponent(title || "Title")}&tm=${tm}`,
    ];

    for (const plUrl of plUrlsToTry) {
      try {
        const mPlRes = await axios.get(plUrl, {
          signal,
          headers: getNetMirrorMobileHeaders(baseUrl, cookies),
          timeout: 6000,
        });
        const resData = Array.isArray(mPlRes.data) ? mPlRes.data[0] : mPlRes.data;
        if (resData && Array.isArray(resData.sources) && resData.sources.length > 0) {
          plData = resData;
          break;
        }
      } catch {}
    }

    // 2. Secondary Native play.php -> playlist.php flow on net77.cc
    if (!plData || !Array.isArray(plData.sources)) {
      try {
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

          plData = Array.isArray(plRes.data) ? plRes.data[0] : plRes.data;
        }
      } catch {}
    }

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

      // Quick check of the first source to detect unverified session / 220884
      let hadAbuseVideo = false;
      const firstSource = plData.sources[0];
      if (firstSource && firstSource.file) {
        let testUrl = firstSource.file;
        if (!testUrl.startsWith("http")) testUrl = `${baseUrl}${testUrl}`;
        try {
          const checkRes = await axios.get(testUrl, {
            signal,
            headers: getNetMirrorMobileHeaders(baseUrl, cookies),
            timeout: 2500,
          });
          const content = typeof checkRes.data === "string" ? checkRes.data : "";
          if (content.includes("220884") || content.includes("Only Valid Users Allowed")) {
            hadAbuseVideo = true;
          }
        } catch {}
      }

      let validSources: any[] = [];
      if (!hadAbuseVideo) {
        for (const s of plData.sources) {
          let fUrl = s.file || "";
          if (!fUrl) continue;
          if (!fUrl.startsWith("http")) fUrl = `${baseUrl}${fUrl}`;
          validSources.push({ ...s, file: fUrl });
        }
      }

      // If NetMirror returned the STOP Abuse screen due to unverified session:
      // Run automated mobile ad verification directly in background
      if (hadAbuseVideo) {
        if (providerContext.kvStore) {
          try {
            await providerContext.kvStore.delete("t_hash_t");
            await providerContext.kvStore.delete("t_hash_t_data");
          } catch {}
        }

        const newCookie = await unlockNetMirrorMobileSession(providerContext, baseUrl);

        if (newCookie && !newCookie.includes("::99")) {
          if (providerContext.kvStore) {
            await providerContext.kvStore.set("t_hash_t", newCookie);
            await providerContext.kvStore.set("t_hash_t_data", {
              token: newCookie,
              ts: Date.now(),
            });
          }
          cookies = `t_hash_t=${newCookie}; hd=on; ott=${ottHeader === "hs" ? "dp" : ottHeader}`;

          // Re-fetch playlist with the newly verified session
          const retryUrls = [
            ...(prefixPath ? [`${baseUrl}/mobile/${prefixPath}playlist.php?id=${id}&t=${encodeURIComponent(title || "Title")}&tm=${Math.round(Date.now() / 1000)}`] : []),
            `${baseUrl}/mobile/playlist.php?id=${id}&t=${encodeURIComponent(title || "Title")}&tm=${Math.round(Date.now() / 1000)}`,
          ];
          for (const rUrl of retryUrls) {
            try {
              const newMPlRes = await axios.get(rUrl, {
                signal,
                headers: getNetMirrorMobileHeaders(baseUrl, cookies),
                timeout: 5000,
              });
              const newPlData = Array.isArray(newMPlRes.data) ? newMPlRes.data[0] : newMPlRes.data;
              if (newPlData && Array.isArray(newPlData.sources) && newPlData.sources.length > 0) {
                validSources = [];
                for (const s of newPlData.sources) {
                  let fUrl = s.file || "";
                  if (!fUrl) continue;
                  if (!fUrl.startsWith("http")) fUrl = `${baseUrl}${fUrl}`;
                  validSources.push({ ...s, file: fUrl });
                }
                break;
              }
            } catch {}
          }
        }
      }

      validSources.forEach((source: any) => {
        const fileUrl = source.file;
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
          headers: getNetMirrorMobileHeaders(baseUrl, cookies),
        });
      });
    }
  } catch (err) {
    console.log(`Native NetMirror playlist flow for ${id}:`, err);
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

  // Fallback stream if all parsed variants were filtered
  if (cleanStreamLinks.length === 0) {
    cleanStreamLinks.push({
      server: `${serverName} HLS`,
      link: `${baseUrl}/mobile/hls/${id}.m3u8`,
      type: "m3u8",
      quality: "1080",
      headers: getNetMirrorMobileHeaders(baseUrl, cookies),
    });
  }

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
