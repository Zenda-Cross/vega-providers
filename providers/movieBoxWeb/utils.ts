import { ProviderContext } from "../types";

export const providerValue = "movieBoxWeb";

export type MovieBoxSubject = {
  subjectId?: string;
  subjectType?: number;
  title?: string;
  description?: string;
  releaseDate?: string;
  genre?: string;
  cover?: { url?: string };
  countryName?: string;
  imdbRatingValue?: string;
  subtitles?: string;
  hasResource?: boolean;
  detailPath?: string;
  stars?: Array<{ name?: string }>;
  dubs?: MovieBoxDub[];
};

export type MovieBoxDub = {
  subjectId?: string;
  lanName?: string;
  lanCode?: string;
  original?: boolean;
  detailPath?: string;
};

export type MovieBoxResource = {
  seasons?: Array<{
    se?: number;
    maxEp?: number;
    allEp?: string;
    resolutions?: Array<{ resolution?: number; epNum?: number }>;
  }>;
};

export type MovieBoxDetail = {
  subject: MovieBoxSubject;
  resource: MovieBoxResource;
};

export type PlaybackLink = {
  subjectId: string;
  detailPath: string;
  language: string;
  season?: number;
  episode?: number;
  resolution?: number;
  seasons?: MovieBoxResource["seasons"];
};

export function parseNuxtDetail(
  html: string,
  cheerio: ProviderContext["cheerio"],
): MovieBoxDetail | null {
  return findDetail(parseNuxtData(html, cheerio));
}

export function parseNuxtData(
  html: string,
  cheerio: ProviderContext["cheerio"],
): unknown {
  const $ = cheerio.load(html);
  const serialized = $("#__NUXT_DATA__").text();
  if (!serialized) return null;

  return decodeNuxtData(JSON.parse(serialized));
}

function decodeNuxtData(values: unknown): unknown {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Invalid Nuxt data");
  }

  const entries = values as unknown[];
  const hydrated: unknown[] = new Array(entries.length);

  function hydrate(index: unknown): unknown {
    if (index === -1 || index === -2) return undefined;
    if (index === -3) return NaN;
    if (index === -4) return Infinity;
    if (index === -5) return -Infinity;
    if (index === -6) return -0;
    if (typeof index !== "number" || index < 0 || index >= entries.length) {
      throw new Error("Invalid Nuxt data index");
    }
    if (Object.prototype.hasOwnProperty.call(hydrated, index)) {
      return hydrated[index];
    }

    const value = entries[index];
    if (!value || typeof value !== "object") {
      hydrated[index] = value;
      return value;
    }

    if (Array.isArray(value)) {
      const type = value[0];
      if (
        type === "Reactive" ||
        type === "ShallowReactive" ||
        type === "Ref" ||
        type === "ShallowRef"
      ) {
        const result = hydrate(value[1]);
        hydrated[index] = result;
        return result;
      }
      if (type === "Set") {
        const result = new Set<unknown>();
        hydrated[index] = result;
        for (let item = 1; item < value.length; item++) {
          result.add(hydrate(value[item]));
        }
        return result;
      }
      if (typeof type === "string") {
        throw new Error(`Unsupported Nuxt data type: ${type}`);
      }

      const result: unknown[] = [];
      hydrated[index] = result;
      for (const item of value) {
        result.push(item === -2 ? undefined : hydrate(item));
      }
      return result;
    }

    const result: Record<string, unknown> = {};
    hydrated[index] = result;
    for (const [key, item] of Object.entries(value)) {
      if (key === "__proto__") throw new Error("Invalid Nuxt data key");
      result[key] = hydrate(item);
    }
    return result;
  }

  return hydrate(0);
}

function findDetail(value: unknown): MovieBoxDetail | null {
  if (!value || typeof value !== "object") return null;
  if (
    "subject" in value &&
    "resource" in value &&
    typeof value.subject === "object" &&
    typeof value.resource === "object"
  ) {
    return value as MovieBoxDetail;
  }

  for (const child of Object.values(value)) {
    const result = findDetail(child);
    if (result) return result;
  }
  return null;
}

export function encodeLink(value: PlaybackLink): string {
  return JSON.stringify(value);
}

export function decodeLink(value: string): PlaybackLink {
  return JSON.parse(value) as PlaybackLink;
}

export function detailPath(link: string): string {
  return link.replace(/^https?:\/\/[^/]+/, "").replace(/^\/moviesDetail\//, "");
}

export function absoluteUrl(baseUrl: string, path: string): string {
  return new URL(path, `${baseUrl}/`).toString();
}
