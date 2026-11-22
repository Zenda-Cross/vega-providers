// meta.ts
import { Info, Link, ProviderContext } from "../types";

const BASE_URL = "https://cd2735efc006-orangestream.baby-beamup.club";

const headers = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  Referer: `${BASE_URL}/`,
};

const emptyResult: Info = {
  title: "",
  synopsis: "",
  image: "",
  imdbId: "",
  type: "movie",
  linkList: [],
};

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios } = providerContext;

  try {
    // link format: "series::toonix:123" or "movie::toonix:456"
    const sepIdx = link.indexOf("::");
    if (sepIdx < 0) return emptyResult;

    const type = link.slice(0, sepIdx);
    const id = link.slice(sepIdx + 2).replace(/^v\d+:/, ""); // strip optional vN: prefix

    const url = `${BASE_URL}/meta/${encodeURIComponent(
      type,
    )}/${encodeURIComponent(id)}.json`;

    console.log("[orangestream] meta:", url);
    const res = await axios.get(url, { headers, timeout: 30_000 });
    const meta = res.data?.meta;
    if (!meta) return emptyResult;

    const videos: any[] = Array.isArray(meta.videos) ? meta.videos : [];
    const isSeries = type === "series" || videos.length > 0;

    // ─── Movies (or metas without episodes) ────────────────────
    if (!isSeries) {
      return {
        title: meta.name ?? "",
        synopsis: meta.description ?? "",
        image: meta.poster ?? meta.background ?? "",
        imdbId: /^tt\d+$/i.test(meta.imdb_id ?? "") ? meta.imdb_id : "",
        type: "movie",
        linkList: [
          {
            title: meta.name ?? "Movie",
            quality: "",
            directLinks: [
              { title: "▶ Play", link: `${type}::${id}`, type: "movie" },
            ],
          } as Link,
        ],
      };
    }

    // ─── Series → group by season ──────────────────────────────
    const buckets = groupBySeason(videos);

    const linkList: Link[] =
      buckets.length <= 1
        ? [
            {
              title:
                buckets[0]?.season > 0
                  ? `Season ${buckets[0].season} · ${buckets[0].videos.length} eps`
                  : `${meta.name ?? "All"} · ${videos.length} eps`,
              quality: "",
              episodesLink: `${type}::${id}::t=all`,
            } as Link,
          ]
        : buckets.map(b => ({
            title: `Season ${b.season} · ${b.videos.length} eps`,
            quality: "",
            episodesLink: `${type}::${id}::s=${b.season}`,
          })) as Link[];

    return {
      title: meta.name ?? "",
      synopsis: meta.description ?? "",
      image: meta.poster ?? meta.background ?? "",
      imdbId: /^tt\d+$/i.test(meta.imdb_id ?? "") ? meta.imdb_id : "",
      type: "series",
      linkList,
      // ← keep the raw array; UI can display total episode count
      videos,
    } as Info;
  } catch (err: any) {
    console.error("[orangestream] getMeta error:", err?.message ?? err);
    return emptyResult;
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────

interface SeasonBucket {
  season: number;
  videos: any[];
}

function groupBySeason(videos: any[]): SeasonBucket[] {
  const map = new Map<number, any[]>();
  let hasSeason = false;

  for (const v of videos) {
    const s = Number(v?.season);
    if (Number.isFinite(s)) hasSeason = true;
    const key = Number.isFinite(s) ? s : 0;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  }

  if (!hasSeason) return [{ season: 0, videos }];

  return Array.from(map.entries())
    .map(([season, vs]) => ({ season, videos: vs }))
    .sort((a, b) => a.season - b.season);
}