// extractors/abbasy.ts
import { Stream } from "../types";

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */
const UA =
  "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36";

/* ================================================================== */
/*  Playback headers — Hydrax tunnel referer works for both CDNs      */
/* ================================================================== */
function buildPlaybackHeaders(): Record<string, string> {
  return {
    "User-Agent": UA,
    Accept: "*/*",
    "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8,hi;q=0.7",
    Referer: "https://playhydrax.com/",
  };
}

function makeAbsolute(url: string, base: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const b = new URL(base);
  if (url.startsWith("/")) return `${b.protocol}//${b.host}${url}`;
  return `${b.protocol}//${b.host}/${url}`;
}

/* ================================================================== */
/*  CUID handshake (non-blocking, short timeout)                       */
/* ================================================================== */
async function fetchCuidCookie(axios: any): Promise<string> {
  try {
    const res = await axios.post(
      "https://meatusbyway.cfd/cuid/?f=https%3A%2F%2Fwatchanimeworld.one",
      "{}",
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Origin: "https://watchanimeworld.one",
          Referer: "https://watchanimeworld.one/",
          "User-Agent": UA,
        },
        timeout: 5000, // ↓ from 10s — fail fast if down
      }
    );
    const key = res?.data?.key;
    return key ? `a97fa794a0f9=${key}` : "";
  } catch {
    return "";
  }
}

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */
interface LangSlug {
  code: string;
  name: string;
  short: string;
  slug: string;
}

/* ================================================================== */
/*  Parse all ready languages from CONFIG                             */
function promiseAny<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    let rejectedCount = 0;
    if (promises.length === 0) return reject(new Error("Empty promise array"));
    promises.forEach((p) => {
      Promise.resolve(p).then(resolve, () => {
        rejectedCount++;
        if (rejectedCount === promises.length) {
          reject(new Error("All promises rejected"));
        }
      });
    });
  });
}

/* ================================================================== */
/*  Parse all ready languages from CONFIG                             */
/* ================================================================== */
function parseConfigLangs(pageHtml: string): LangSlug[] {
  const out: LangSlug[] = [];
  const m = pageHtml.match(/var CONFIG = (\{[\s\S]*?\});/);
  if (!m) return out;

  try {
    const config = JSON.parse(m[1]);
    const ready: Record<string, string> = config.ready || {};
    const langMap: Record<string, { name?: string; short?: string }> =
      config.lang || {};

    for (const code of Object.keys(ready)) {
      const info = langMap[code] || {};
      out.push({
        code,
        name: info.name || code,
        short: info.short || code.slice(0, 2).toUpperCase(),
        slug: ready[code],
      });
    }
  } catch (e) {
    console.warn("[abbasy] CONFIG parse failed", e);
  }
  return out;
}

/* ================================================================== */
/*  Fetch + decrypt a single slug — fast, isolated                     */
/* ================================================================== */
async function fetchSourcesForSlug(
  slug: string,
  cuidCookie: string,
  axios: any
): Promise<any[]> {
  const playerUrl = `https://player.abyssplayer.com/${slug}`;

  // 1. Player page
  const playerRes = await axios.get(playerUrl, {
    headers: {
      "User-Agent": UA,
      Referer: "https://watchanimeworld.one/",
      ...(cuidCookie ? { Cookie: cuidCookie } : {}),
    },
    timeout: 8000, // ↓ from default
  });
  const playerHtml: string = playerRes.data;

  const datasMatch = playerHtml.match(
    /const\s+datas\s*=\s*["']([A-Za-z0-9+/=]+)["']/
  );
  if (!datasMatch) return [];

  const datasBlob = datasMatch[1];

  // 2. Decrypt — try payloads in parallel-ish, first success wins
  const apiUrl = "https://enc-dec.app/api/dec-abyss";
  const payloads: any[] = [
    { data: datasBlob },
    { datas: datasBlob },
    { text: datasBlob },
    { url: playerUrl },
    { slug },
  ];

  const apiRes = await promiseAny(
    payloads.map((p) =>
      axios
        .post(apiUrl, p, {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": UA,
            Referer: "https://enc-dec.app/",
          },
          timeout: 10000,
        })
        .then((r: any) => {
          if (!r?.data) throw new Error("empty");
          return r;
        })
    )
  ).catch(() => null);

  if (!apiRes?.data) return [];

  const data = apiRes.data;
  const sources: any[] = [];
  if (data?.result && Array.isArray(data.result.sources)) {
    sources.push(...data.result.sources);
  } else if (Array.isArray(data?.sources)) {
    sources.push(...data.sources);
  } else if (Array.isArray(data)) {
    sources.push(...data);
  }
  return sources;
}

/* ================================================================== */
/*  ABYSS EXTRACTOR — fully parallel                                   */
/* ================================================================== */
export async function abyssExtractor(
  link: string,
  _signal: AbortSignal,
  axios: any,
  _cheerio: any,
  headers: Record<string, string>,
  _providerContext?: any
): Promise<Stream[]> {
  const streamLinks: Stream[] = [];
  const t0 = Date.now();

  try {
    // ── 1. Normalize ─────────────────────────────────────────────
    let pageUrl = link;
    if (!pageUrl.startsWith("http")) {
      pageUrl = makeAbsolute(pageUrl, "https://watchanimeworld.one/");
    }
    console.log(`[abbasy] → ${pageUrl}`);

    // ── 2. Kick off CUID in parallel with page fetch ─────────────
    const cuidPromise = fetchCuidCookie(axios);

    // ── 3. Determine language slugs ──────────────────────────────
    let langs: LangSlug[] = [];

    if (pageUrl.includes("player.abyssplayer.com")) {
      const slug = pageUrl.split("/").pop() || "";
      langs = [{ code: "und", name: "Unknown", short: "UN", slug }];
    } else {
      const pageRes = await axios.get(pageUrl, {
        headers: {
          "User-Agent": UA,
          Referer: "https://watchanimeworld.one/",
          Origin: "https://watchanimeworld.one",
        },
        timeout: 8000,
      });
      langs = parseConfigLangs(pageRes.data);
    }

    if (!langs.length) {
      return [
        {
          server: "AbyssPlayer",
          link: pageUrl,
          type: "iframe",
          headers: {},
          subtitles: [],
        },
      ];
    }

    // Wait for CUID (already started above)
    const cuidCookie = await cuidPromise;

    // ── 4. Fetch ALL languages in parallel — no sequential waits ─
    const langsWithSources = await Promise.all(
      langs.map(async (lang) => {
        try {
          const sources = await fetchSourcesForSlug(
            lang.slug,
            cuidCookie,
            axios
          );
          return { lang, sources };
        } catch (e) {
          console.warn(`[abbasy] ${lang.name} failed:`, e);
          return { lang, sources: [] as any[] };
        }
      })
    );

    // ── 5. Build the stream list ─────────────────────────────────
    const codecRank = (c: string) => (c?.toLowerCase() === "h264" ? 0 : 1);
    const resRank = (t: string) =>
      parseInt(t?.replace(/[^\d]/g, "") || "0", 10);

    const playbackHeaders = buildPlaybackHeaders();

    for (const { lang, sources } of langsWithSources) {
      if (!sources.length) continue;

      sources.sort(
        (a, b) =>
          codecRank(a.codec) - codecRank(b.codec) ||
          resRank(a.type) - resRank(b.type)
      );

      for (const src of sources) {
        if (!src?.url || src.status === false) continue;

        const srcLang: string =
          src.language || src.lang || src.audio_lang || lang.name;
        const srcLangShort: string =
          src.language_short || src.lang_short || lang.short;

        streamLinks.push({
          server: `AbyssPlayer (${srcLang})`,
          link: src.url,
          type: src.url.includes(".m3u8") ? "m3u8" : "mp4",
          headers: playbackHeaders,
          subtitles: [],
          quality: `${srcLangShort} · ${src.type || "auto"}${
            src.codec ? ` · ${src.codec}` : ""
          }`,
        });
      }
    }

    // ── 6. Fallback only if we got nothing ───────────────────────
    if (!streamLinks.length) {
      streamLinks.push({
        server: "AbyssPlayer",
        link: `https://player.abyssplayer.com/${langs[0].slug}`,
        type: "iframe",
        headers: {},
        subtitles: [],
      });
    }

    console.log(
      `[abbasy] ${streamLinks.length} streams in ${Date.now() - t0}ms`
    );
    return streamLinks;
  } catch (err: any) {
    console.error("[abbasy] error:", err?.message || err);
    return [];
  }
}

export const getAbyssStream = abyssExtractor;
export const hubcloudExtractor = abyssExtractor;