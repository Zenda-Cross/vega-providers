import { getBaseUrl } from "../getBaseUrl";
import { EpisodeLink, ProviderContext } from "../types";
import { decodeSeroval, encodeSeroval } from "./seroval";

export const DEFAULT_BASE_URL = "https://anidream.to";

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const SERVER_FNS = {
  HOME: "03002968e86885bf64557e9fb459d6bb0d98fea020c558136eb9de8f45bb88ea",
  TRENDING: "769b1066a89e7c2e96b77880d3599750e0dda45a77a2a2cceb036c2f51621453",
  NEW_EPISODES: "5ced21715baaf026c35a78606e27cd072ff1fc628ad7627c9fe1bce74a2d3333",
  RELEASES: "16f5ac63d067ae5829f4620e30502fcc0843ef786cf98a644531ccf5f1aac149",
  BROWSE: "106b82f7a2b5783e3a3aed32e330e18e28a5006cded7804c38ebc41464230772",
  FACETS: "7dd851f9f94b2ba5d7b440193467da2d51e23e56e6b8cd5aceca6b64b1c0f780",
  INFO: "505b30ac55cdb92c6321f682548d2934b45f693f37b62f9b91007a836ebda9f9",
  EPISODES: "33c4f1e3d3bb451ddccfbb87aeb0d7e52f86a1c8954c61f38d31ea4527593190",
  PLAYBACK: "5ebed94ee2be52c6280fe2b832298a7f8a78c1dc67d7f28b42231743b2ebde1a",
} as const;

export async function resolveBaseUrl(): Promise<string> {
  try {
    const resolved = await getBaseUrl("aniDream");
    if (resolved && /^https?:\/\//i.test(resolved.trim())) {
      return resolved.trim().replace(/\/+$/, "");
    }
  } catch {
    // Fall back to default URL when urls.json does not have aniDream yet
  }
  return DEFAULT_BASE_URL;
}

export async function callServerFn<T = any>(
  fnHash: string,
  data: Record<string, unknown>,
  options: {
    providerContext: ProviderContext;
    signal?: AbortSignal;
    referer?: string;
    baseUrl?: string;
    timeout?: number;
  },
): Promise<T> {
  const { providerContext, signal, referer, timeout = 15000 } = options;
  const baseUrl = (options.baseUrl || (await resolveBaseUrl())).replace(/\/+$/, "");
  const payload = encodeSeroval({ data });
  const url = `${baseUrl}/_serverFn/${fnHash}?payload=${encodeURIComponent(payload)}`;

  const res = await providerContext.axios.get(url, {
    headers: {
      ...(providerContext.commonHeaders || {}),
      Origin: baseUrl,
      Referer: referer || `${baseUrl}/`,
      "x-tsr-serverFn": "true",
      Accept: "application/json",
      "User-Agent":
        providerContext.commonHeaders?.["User-Agent"] ||
        providerContext.commonHeaders?.["user-agent"] ||
        DEFAULT_USER_AGENT,
    },
    signal,
    timeout,
  });

  const raw = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  const decoded = decodeSeroval(raw);

  if (decoded?.error) {
    const msg =
      typeof decoded.error === "string"
        ? decoded.error
        : decoded.error?.message || JSON.stringify(decoded.error);
    throw new Error(msg);
  }

  return (decoded && typeof decoded === "object" && "result" in decoded
    ? decoded.result
    : decoded) as T;
}

export function extractMediaTitle(title: any): string {
  if (!title) return "";
  if (typeof title === "string") return title.trim();
  return (title.english || title.romaji || title.native || "").trim();
}

export function extractMediaImage(media: any): string {
  const cover = media?.cover_image;
  return (
    cover?.large ||
    cover?.medium ||
    cover?.small ||
    media?.banner_image ||
    media?.backdrop_image ||
    ""
  );
}

export function cleanSynopsis(raw: unknown): string {
  if (typeof raw !== "string" || !raw) return "";
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseAnimeId(link: string): number {
  const raw = String(link || "").trim();
  if (/^\d+$/.test(raw)) {
    return Number.parseInt(raw, 10);
  }

  const pathMatch = raw.match(/\/anime\/(\d+)/i);
  if (pathMatch) {
    return Number.parseInt(pathMatch[1], 10);
  }

  const queryMatch = raw.match(/[?&]id=(\d+)/i);
  if (queryMatch) {
    return Number.parseInt(queryMatch[1], 10);
  }

  const tailMatch = raw.match(/(\d+)(?:[/?#].*)?$/);
  if (tailMatch) {
    return Number.parseInt(tailMatch[1], 10);
  }

  throw new Error(`Invalid AniDream anime link: ${link}`);
}

export function buildAnimeUrl(baseUrl: string, animeId: number): string {
  return `${baseUrl.replace(/\/+$/, "")}/anime/${animeId}`;
}

export function buildWatchUrl(
  baseUrl: string,
  animeId: number,
  episode: number,
  hasDub?: boolean,
): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  return `${cleanBase}/watch?id=${animeId}&n=${episode}${hasDub ? "&dub=1" : ""}`;
}

export function parseWatchUrl(link: string): {
  anilistId: number;
  episode: number;
  hasDub: boolean;
} {
  const raw = String(link || "").trim();

  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      const anilistId = Number(parsed.anilistId || parsed.id);
      const episode = Number(parsed.episode || parsed.n || 1);
      if (Number.isFinite(anilistId) && anilistId > 0) {
        return {
          anilistId,
          episode: Number.isFinite(episode) && episode > 0 ? episode : 1,
          hasDub: Boolean(parsed.hasDub || parsed.dub),
        };
      }
    } catch {
      // Fall through to URL/string parsing
    }
  }

  const idMatch = raw.match(/[?&]id=(\d+)/i);
  const epMatch = raw.match(/[?&]n=(\d+(?:\.\d+)?)/i);
  if (idMatch) {
    const dubMatch = raw.match(/[?&]dub=([^&#]+)/i);
    return {
      anilistId: Number.parseInt(idMatch[1], 10),
      episode: epMatch ? Number.parseFloat(epMatch[1]) : 1,
      hasDub: dubMatch ? dubMatch[1] === "1" || dubMatch[1] === "true" : false,
    };
  }

  const colonMatch = raw.match(/^(\d+):(\d+(?:\.\d+)?)$/);
  if (colonMatch) {
    return {
      anilistId: Number.parseInt(colonMatch[1], 10),
      episode: Number.parseFloat(colonMatch[2]),
      hasDub: false,
    };
  }

  const anilistId = parseAnimeId(raw);
  return { anilistId, episode: 1, hasDub: false };
}

export function mapEpisodesToLinks(
  episodes: any[],
  options: {
    baseUrl: string;
    animeId: number;
    isMovie?: boolean;
  },
): (EpisodeLink & { type?: "movie" | "series" })[] {
  if (!Array.isArray(episodes)) return [];
  const { baseUrl, animeId, isMovie } = options;

  return episodes
    .filter((ep) => ep && typeof ep.number === "number")
    .sort((a, b) => a.number - b.number)
    .map((ep) => {
      const epTitle = extractMediaTitle(ep.title);
      const title =
        isMovie && episodes.length === 1
          ? epTitle || "Movie"
          : epTitle
            ? `Episode ${ep.number}: ${epTitle}`
            : `Episode ${ep.number}`;

      return {
        title,
        link: buildWatchUrl(baseUrl, animeId, ep.number, Boolean(ep.has_dub)),
        type: isMovie ? "movie" : "series",
        ...(ep.thumbnail ? { image: ep.thumbnail } : {}),
      };
    });
}
