import { Post, ProviderContext } from "../types";

const defaultHeaders = {
  Referer: "https://www.google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
};

// Base URL (can be updated if domain changes)
const baseUrl = "https://vegamovies.or.ke";

// --- Normal catalog posts ---
export async function getPosts({
  filter,
  page = 1,
  signal,
  providerContext,
}: {
  filter?: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  return fetchPosts({ filter, page, query: "", signal, providerContext });
}

// --- Search posts ---
export async function getSearchPosts({
  searchQuery,
  page = 1,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  return fetchPosts({ filter: "", page, query: searchQuery, signal, providerContext });
}

// --- Core function ---
async function fetchPosts({
  filter,
  query,
  page = 1,
  signal,
  providerContext,
}: {
  filter?: string;
  query?: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    let url: string;

    // Handle search or category filtering
    if (query && query.trim()) {
      const params = new URLSearchParams();
      params.append("s", query);
      if (page > 1) params.append("page", page.toString());
      url = `${baseUrl}/?${params.toString()}`;
    } else if (filter) {
      url = filter.startsWith("/")
        ? `${baseUrl}${filter.replace(/\/$/, "")}${page > 1 ? `/page/${page}` : ""}`
        : `${baseUrl}/${filter}${page > 1 ? `/page/${page}` : ""}`;
    } else {
      url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
    }

    const { axios, cheerio } = providerContext;
    const res = await axios.get(url, { headers: defaultHeaders, signal });
    const $ = cheerio.load(res.data || "");

    const resolveUrl = (href: string) =>
      href?.startsWith("http") ? href : new URL(href, baseUrl).href;

    const seen = new Set<string>();
    const catalog: Post[] = [];

    // Multiple selectors for better coverage
    const POST_SELECTORS = [
      ".pstr_box",
      "article",
      ".result-item",
      ".post-item",
      ".movie-item",
      ".item",
      ".thumbnail",
      ".latest-movies",
    ].join(",");

    $(POST_SELECTORS).each((_, el) => {
      const card = $(el);
      let link = card.find("a[href]").first().attr("href") || "";
      if (!link) return;
      link = resolveUrl(link);
      if (seen.has(link)) return;

      // --- Title extraction and cleanup ---
      let title =
        card.find("h2").first().text().trim() ||
        card.find("h3").first().text().trim() ||
        card.find("a[title]").first().attr("title")?.trim() ||
        card.text().trim();

      // Remove unwanted patterns like [1080p], (2025), "Download", etc.
      title = title
        .replace(/\[.*?\]/g, "")
        .replace(/\(.*?\)/g, "")
        .replace(/\bDownload\b/gi, "")
        .replace(/\bWEB[-\s]?DL\b/gi, "")
        .replace(/\bBluRay\b/gi, "")
        .replace(/\bHDRip\b/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      if (!title) return;

      // --- Fix image extraction ---
      const img =
        card.find("img").attr("data-src") ||
        card.find("img").attr("data-original") ||
        card.find("img").attr("src") ||
        "";
      const image = img ? resolveUrl(img) : "";

      seen.add(link);
      catalog.push({ title, link, image });
    });

    return catalog.slice(0, 100);
  } catch (err) {
    console.error("fetchPosts error:", err instanceof Error ? err.message : String(err));
    return [];
  }
}
