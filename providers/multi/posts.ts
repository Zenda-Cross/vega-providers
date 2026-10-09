
import { Post, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";

// ─── Headers (mobile browser) ──────────────────────────────────────────
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8,hi;q=0.7",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "sec-ch-ua": '"Not;A=Brand";v="8", "Chromium";v="150", "Google Chrome";v="150"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "same-origin",
  "sec-fetch-user": "?1",
};

// ─── Helpers ────────────────────────────────────────────────────────────
function resolveUrl(href: string | undefined, baseUrl: string): string {
  if (!href) return "";
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return "https:" + href;
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return "";
  }
}

function getPosterSrc(imgElement: any): string {
  if (!imgElement || !imgElement.length) return "";
  const src =
    imgElement.attr("src") ||
    imgElement.attr("data-src") ||
    imgElement.attr("data-lazy-src") ||
    "";
  return String(src).trim();
}

function isContentLink(link: string): boolean {
  if (!link) return false;
  if (link.includes("#")) return false;
  if (link.includes("/genre/")) return false;
  if (link.includes("/category/")) return false;
  if (link.includes("/tag/")) return false;
  if (link.includes("/provider/")) return false;
  if (link.includes("/collection/")) return false;
  if (link.includes("/watchlist")) return false;
  if (link.includes("/contact")) return false;
  if (link.includes("/dmca")) return false;
  if (link.includes("/privacy")) return false;
  return true;
}

function normaliseTitle(t: string): string {
  return String(t || "").replace(/\s+/g, " ").replace("Download", "").trim();
}

// =====================================================================
//  getPosts (catalog / browse)
// =====================================================================
export async function getPosts({
  filter,
  page = 1,
  signal,
  providerValue,
  providerContext,
}: {
  filter?: string;
  page?: number;
  signal?: AbortSignal;
  providerValue?: string;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio } = providerContext;

  
  const baseUrl = (await getBaseUrl("multi")).replace(/\/+$/, "");

  const route = (filter || "trending").replace(/^\/+/, "").replace(/\/+$/, "");
  const url =
    page > 1
      ? `${baseUrl}/${route}/page/${page}/`
      : `${baseUrl}/${route}`;

  console.log(`[MultiMovies] Fetching: ${url}`);

  try {
    const res = await axios.get(url, {
      headers: { ...HEADERS, Referer: baseUrl },
      signal,
      timeout: 15000,
      maxRedirects: 5,
    });
    const $ = cheerio.load(res.data);
    const posts: Post[] = [];

    // ── Primary: poster-card grid ──
    $("article.poster-card").each((_: number, element: any) => {
      const card = $(element);
      const linkA = card.find("a.poster-art").first();
      const captionA = card.find(".poster-caption a").first();

      const rawHref = linkA.attr("href") || captionA.attr("href");
      if (!rawHref || !isContentLink(rawHref)) return;

      const link = resolveUrl(rawHref, baseUrl);
      if (!link || posts.some((p) => p.link === link)) return;

      const img = card.find("img").first();
      const title = normaliseTitle(
        captionA.text() || img.attr("alt") || "",
      );
      if (!title) return;

      const image = resolveUrl(getPosterSrc(img), baseUrl);
      posts.push({ title, link, image });
    });

    // ── Fallback 1: hero slides ──
    if (posts.length === 0) {
      console.log("[MultiMovies] No poster-card found, trying hero slides...");
      $("article.cinema-slide").each((_: number, element: any) => {
        const slide = $(element);
        const linkA = slide.find("a.button-light, a.button-glass").first();
        const rawHref = linkA.attr("href");
        if (!rawHref || !isContentLink(rawHref)) return;

        const link = resolveUrl(rawHref, baseUrl);
        if (!link || posts.some((p) => p.link === link)) return;

        const img = slide.find("img.cinema-backdrop").first();
        const title = normaliseTitle(
          slide.find("h1").first().text() || img.attr("alt") || "",
        );
        if (!title) return;

        const image = resolveUrl(getPosterSrc(img), baseUrl);
        posts.push({ title, link, image });
      });
    }

    // ── Fallback 2: generic selector ──
    if (posts.length === 0) {
      console.log("[MultiMovies] Trying generic fallback selector...");
      $("article, .poster-card, .item").each((_: number, element: any) => {
        const card = $(element);
        const rawHref = card.find("a[href]").first().attr("href");
        if (!rawHref || !isContentLink(rawHref)) return;

        const link = resolveUrl(rawHref, baseUrl);
        if (!link || posts.some((p) => p.link === link)) return;

        const img = card.find("img").first();
        const title = normaliseTitle(
          card.find("h1, h2, h3, .poster-caption a").first().text() ||
            img.attr("alt") ||
            "",
        );
        if (!title) return;

        const image = resolveUrl(getPosterSrc(img), baseUrl);
        posts.push({ title, link, image });
      });
    }

    console.log(`[MultiMovies] Found ${posts.length} posts for ${route}`);
    return posts.slice(0, 100);
  } catch (error) {
    throwProviderError("MultiMovies", "posts", error);
  }
}

// =====================================================================
//  getSearchPosts
// =====================================================================
export async function getSearchPosts({
  searchQuery,
  page = 1,
  signal,
  providerValue,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  signal?: AbortSignal;
  providerValue?: string;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio } = providerContext;

  // ✅ Same import pattern as Vega
  const baseUrl = (await getBaseUrl("multimovies")).replace(/\/+$/, "");

  // ✅ Correct search endpoint
  const url = `${baseUrl}/search?q=${encodeURIComponent(searchQuery)}`;

  console.log(`[MultiMovies] Searching: ${url}`);

  try {
    const res = await axios.get(url, {
      headers: { ...HEADERS, Referer: baseUrl },
      signal,
      timeout: 15000,
      maxRedirects: 5,
    });
    const $ = cheerio.load(res.data);
    const posts: Post[] = [];

    // ── Primary: poster-card ──
    $("article.poster-card").each((_: number, element: any) => {
      const card = $(element);
      const linkA = card.find("a.poster-art").first();
      const captionA = card.find(".poster-caption a").first();

      const rawHref = linkA.attr("href") || captionA.attr("href");
      if (!rawHref || !isContentLink(rawHref)) return;

      const link = resolveUrl(rawHref, baseUrl);
      if (!link || posts.some((p) => p.link === link)) return;

      const img = card.find("img").first();
      const title = normaliseTitle(
        captionA.text() || img.attr("alt") || "",
      );
      if (!title) return;

      const image = resolveUrl(getPosterSrc(img), baseUrl);
      posts.push({ title, link, image });
    });

    // ── Fallback ──
    if (posts.length === 0) {
      console.log("[MultiMovies] No poster-card in search, trying fallback...");
      $("article, .result-item, .item").each((_: number, element: any) => {
        const card = $(element);
        const rawHref = card.find("a[href]").first().attr("href");
        if (!rawHref || !isContentLink(rawHref)) return;

        const link = resolveUrl(rawHref, baseUrl);
        if (!link || posts.some((p) => p.link === link)) return;

        const img = card.find("img").first();
        const title = normaliseTitle(
          card.find("h1, h2, h3, .poster-caption a, .title a").first().text() ||
            img.attr("alt") ||
            "",
        );
        if (!title) return;

        const image = resolveUrl(getPosterSrc(img), baseUrl);
        posts.push({ title, link, image });
      });
    }

    console.log(
      `[MultiMovies] Search found ${posts.length} results for "${searchQuery}"`,
    );
    return posts.slice(0, 100);
  } catch (error) {
    throwProviderError("MultiMovies", "search posts", error);
  }
}