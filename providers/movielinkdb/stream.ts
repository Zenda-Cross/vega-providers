import { ProviderContext, Stream } from "../types";
import { hubcloudExtractor } from "../extractors/hubcloud";

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Cache-Control": "no-store",
  "Accept-Language": "en-US,en;q=0.9",
  DNT: "1",
  "sec-ch-ua":
    '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  Cookie:
    "xla=s4t; _ga=GA1.1.1081149560.1756378968; _ga_BLZGKYN5PF=GS2.1.s1756378968$o1$g1$t1756378984$j44$l0$h0",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

function resolveRelative(href: string, base: string): string {
  if (!href) return "";
  if (isHttpUrl(href)) return href;
  if (href.startsWith("//")) return "https:" + href;
  try {
    return new URL(href, base).href;
  } catch {
    try {
      const origin = new URL(base).origin;
      return `${origin}${href.startsWith("/") ? "" : "/"}${href}`;
    } catch {
      return href;
    }
  }
}

function ensureAbsolute(link: string): string {
  if (isHttpUrl(link)) return link;
  return link;
}

async function fetchPage(
  url: string,
  providerContext: ProviderContext,
  signal: AbortSignal,
) {
  const { axios, cheerio } = providerContext;
  console.log(`[getStream] Fetching page: ${url}`);
  const res = await axios.get(url, {
    headers: { ...headers, Referer: url },
    signal,
  });
  console.log(
    `[getStream] Received status ${res.status}, length ${
      res.data?.length || 0
    }`,
  );
  return cheerio.load(res.data || "");
}

/* ------------------------------------------------------------------ */
/*  FSL extractor — handles both intermediate /file page and the      */
/*  final fsldownload.com page.                                       */
/* ------------------------------------------------------------------ */
async function extractFsl(
  link: string,
  signal: AbortSignal,
  providerContext: ProviderContext,
): Promise<Stream | null> {
  const { cheerio } = providerContext;
  try {
    const $ = await fetchPage(link, providerContext, signal);

    // 1. Preferred selector used on fsldownload.com final page
    let href = $("a.fsl-download").attr("href")?.trim();

    // 2. Fallback: any anchor pointing at fsldownload.com
    if (!href) {
      $("a[href*='fsldownload']").each((_, el) => {
        const h = $(el).attr("href")?.trim();
        if (h) {
          href = h;
          return false;
        }
      });
    }

    // 3. Fallback: data-host="fsl"
    if (!href) {
      $("a[data-host='fsl']").each((_, el) => {
        const h = $(el).attr("href")?.trim();
        if (h && h !== "#") {
          href = h;
          return false;
        }
      });
    }

    if (!href) {
      console.warn(`[getStream] FSL: no download link found on ${link}`);
      return null;
    }

    const full = resolveRelative(href, link);
    console.log(`[getStream] FSL direct link: ${full}`);
    return { server: "fsl", link: full, type: "mp4" };
  } catch (e) {
    console.warn(`[getStream] FSL extraction failed: ${(e as Error).message}`);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  GP (Google Photos / googleusercontent) extractor — handles both   */
/*  intermediate /file page and the final dlh-cta page.               */
/* ------------------------------------------------------------------ */
async function extractGp(
  link: string,
  signal: AbortSignal,
  providerContext: ProviderContext,
): Promise<Stream | null> {
  const { cheerio } = providerContext;
  try {
    const $ = await fetchPage(link, providerContext, signal);

    // 1. Movielinkbd "GP High-Speed" CTA (page-2 style)
    let href =
      $("a.dlh-cta.green[href*='googleusercontent']").attr("href")?.trim() ||
      $("a.dlh-cta[href*='googleusercontent']").attr("href")?.trim() ||
      $("a.dlh-cta").attr("href")?.trim();

    // 2. Old selector
    if (!href) href = $("a.gpx-btn").attr("href")?.trim();

    // 3. Any googleusercontent link
    if (!href) {
      $("a[href*='googleusercontent']").each((_, el) => {
        const h = $(el).attr("href")?.trim();
        if (h) {
          href = h;
          return false;
        }
      });
    }

    // 4. data-host="gphotos"
    if (!href) {
      $("a[data-host='gphotos']").each((_, el) => {
        const h = $(el).attr("href")?.trim();
        if (h && h !== "#") {
          href = h;
          return false;
        }
      });
    }

    if (!href) {
      console.warn(`[getStream] GP: no download link found on ${link}`);
      return null;
    }

    const full = resolveRelative(href, link);
    console.log(`[getStream] GP direct link: ${full}`);
    return { server: "gp", link: full, type: "mp4" };
  } catch (e) {
    console.warn(`[getStream] GP extraction failed: ${(e as Error).message}`);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Generic fallback extractor                                        */
/* ------------------------------------------------------------------ */
async function extractGeneric(
  link: string,
  signal: AbortSignal,
  providerContext: ProviderContext,
  server: string,
): Promise<Stream | null> {
  const { cheerio } = providerContext;
  try {
    const $ = await fetchPage(link, providerContext, signal);
    const href =
      $("a[href*='.mkv']").first().attr("href") ||
      $("a[href*='.mp4']").first().attr("href") ||
      $("a[href*='download']").first().attr("href") ||
      $("a.btn-primary").first().attr("href") ||
      $("a.dlh-cta").first().attr("href") ||
      $("a.fsl-download").first().attr("href");
    if (!href) {
      console.warn(`[getStream] ${server}: no download link found on ${link}`);
      return null;
    }
    const full = resolveRelative(href, link);
    console.log(`[getStream] ${server} direct link: ${full}`);
    return { server, link: full, type: "mp4" };
  } catch (e) {
    console.warn(
      `[getStream] ${server} extraction failed: ${(e as Error).message}`,
    );
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Main entry                                                        */
/* ------------------------------------------------------------------ */
export async function getStream({
  link,
  type,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, cheerio } = providerContext;
  const streamLinks: Stream[] = [];

  if (!link) {
    console.warn("[getStream] Empty link provided");
    return [];
  }

  const absoluteLink = ensureAbsolute(link);
  if (!isHttpUrl(absoluteLink)) {
    console.warn(`[getStream] Link is not an absolute URL: ${link}`);
    return [];
  }

  console.log(`[getStream] Starting extraction for: ${absoluteLink}`);

  try {
    const $ = await fetchPage(absoluteLink, providerContext, signal);

    /* -------------------------------------------------------------- */
    /* Case A: The given link already IS an FSL final page            */
    /* -------------------------------------------------------------- */
    const isFslPage =
      $("a.fsl-download").length > 0 ||
      $("a[href*='fsldownload.com']").length > 0;
    if (isFslPage) {
      console.log("[getStream] Detected FSL page directly");
      const s = await extractFsl(absoluteLink, signal, providerContext);
      if (s) streamLinks.push(s);
      if (streamLinks.length > 0) return streamLinks;
    }

    /* -------------------------------------------------------------- */
    /* Case B: The given link already IS a GP final page              */
    /* -------------------------------------------------------------- */
    const isGpPage =
      $("a.dlh-cta[href*='googleusercontent']").length > 0 ||
      $("a.gpx-btn").length > 0 ||
      $("a[href*='video-downloads.googleusercontent.com']").length > 0;
    if (isGpPage) {
      console.log("[getStream] Detected GP page directly");
      const s = await extractGp(absoluteLink, signal, providerContext);
      if (s) streamLinks.push(s);
      if (streamLinks.length > 0) return streamLinks;
    }

    /* -------------------------------------------------------------- */
    /* Case C: Intermediate /file page with server buttons            */
    /*         (dlh-arow, gdl-action-wrap, mlbd-download-button-wrap) */
    /* -------------------------------------------------------------- */
    const candidates: { href: string; host: string }[] = [];
    const seen = new Set<string>();

    const selector = [
      ".gdl-action-wrap a",
      ".mlbd-download-button-wrap a",
      "a.dlh-arow",
      "a.dlh-cta",
      "a[data-host]",
    ].join(", ");

    $(selector).each((_, el) => {
      const anchor = $(el);
      const rawHref = anchor.attr("href")?.trim();
      if (!rawHref || rawHref === "#") return;
      const host = (anchor.attr("data-host") || "").toLowerCase();
      const key = `${host}|${rawHref}`;
      if (seen.has(key)) return;
      seen.add(key);
      candidates.push({ href: rawHref, host });
    });

    console.log(`[getStream] Found ${candidates.length} candidate link(s)`);

    for (const { href: rawHref, host } of candidates) {
      const fullHref = resolveRelative(rawHref, absoluteLink);
      console.log(`[getStream] Candidate: host="${host}", href="${fullHref}"`);

      /* ---------- FSL ---------- */
      if (
        host === "fsl" ||
        host === "fsl-promo" ||
        fullHref.includes("fsldownload")
      ) {
        console.log(`[getStream] -> Routing to FSL extractor`);
        const s = await extractFsl(fullHref, signal, providerContext);
        if (s) streamLinks.push(s);
        continue;
      }

      /* ---------- GP / gphotos ---------- */
      if (
        host === "gphotos" ||
        host === "gphotos-promo" ||
        host.startsWith("gphotos") ||
        fullHref.includes("googleusercontent") ||
        fullHref.includes("?gp=1")
      ) {
        console.log(`[getStream] -> Routing to GP extractor`);
        const s = await extractGp(fullHref, signal, providerContext);
        if (s) streamLinks.push(s);
        continue;
      }

      /* ---------- InstantCloud ---------- */
      if (host === "instantcloud" || fullHref.includes("instantcloud.org")) {
        console.log(`[getStream] -> Routing to InstantCloud extractor`);
        const s = await extractGeneric(
          fullHref,
          signal,
          providerContext,
          "instantcloud",
        );
        if (s) streamLinks.push(s);
        continue;
      }

      /* ---------- HubCloud ---------- */
      if (fullHref.includes("hubcloud")) {
        console.log(`[getStream] -> Routing to HubCloud extractor`);
        const hubStreams = await hubcloudExtractor(
          fullHref,
          signal,
          axios,
          cheerio,
          headers,
        );
        if (Array.isArray(hubStreams)) {
          streamLinks.push(...hubStreams);
        } else if (hubStreams) {
          streamLinks.push({
            server: "hubcloud",
            link: hubStreams as string,
            type: "mp4",
          });
        }
        continue;
      }

      /* ---------- Generic fallback ---------- */
      console.log(`[getStream] -> Unknown host, trying generic extractor`);
      const s = await extractGeneric(
        fullHref,
        signal,
        providerContext,
        host || "unknown",
      );
      if (s) streamLinks.push(s);
    }

    /* -------------------------------------------------------------- */
    /* Case D: Legacy HubCloud CSRF fallback                          */
    /* -------------------------------------------------------------- */
    if (streamLinks.length === 0) {
      console.log(
        "[getStream] No links found via action wraps, trying CSRF flow",
      );
      const csrfInput = $("input[name^='_csrf']");
      const csrfName = csrfInput.attr("name");
      const csrfValue = csrfInput.val();

      if (csrfName && csrfValue) {
        console.log("[getStream] CSRF token found, attempting unlock");
        const formData = new URLSearchParams();
        formData.append(csrfName, csrfValue as string);

        const unlockRes = await axios.post(absoluteLink, formData, {
          headers: {
            ...headers,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          signal,
        });

        const unlockedHTML = unlockRes.data || "";
        const $$ = cheerio.load(unlockedHTML);

        let hubcloudLink = "";
        const match = unlockedHTML.match(
          /https?:\/\/hubcloud\.(fit|foo)\/video\/[a-zA-Z0-9_]+/i,
        );
        if (match) hubcloudLink = match[0];

        if (!hubcloudLink) {
          $$("a[href*='hubcloud']").each((_, el) => {
            const h = $$(el).attr("href");
            if (h) {
              hubcloudLink = h;
              return false;
            }
          });
        }

        if (hubcloudLink) {
          console.log(
            `[getStream] HubCloud link found after unlock: ${hubcloudLink}`,
          );
          const hubStreams = await hubcloudExtractor(
            hubcloudLink,
            signal,
            axios,
            cheerio,
            headers,
          );
          if (Array.isArray(hubStreams)) {
            streamLinks.push(...hubStreams);
          } else if (hubStreams) {
            streamLinks.push({
              server: "hubcloud",
              link: hubStreams as string,
              type: "mp4",
            });
          }
        }
      } else {
        console.log("[getStream] No CSRF token found");
      }
    }

    console.log(
      `[getStream] Extraction complete. Found ${streamLinks.length} stream(s).`,
    );
    return streamLinks;
  } catch (err) {
    console.error(`[getStream] Fatal error: ${(err as Error).message}`);
    return [];
  }
}