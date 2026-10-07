import { Post, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";

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
  return fetchPosts({
    filter: "",
    page,
    query: searchQuery,
    signal,
    providerContext,
  });
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
    const baseUrl =
      ((await getBaseUrl("movielinkbd").catch(() => "")) ||
      (await getBaseUrl("movielinkdb").catch(() => "")) ||
      "https://ex5wfv.movielinkbd.li").replace(/\/+$/, "");

    let url: string;

    // --- Build URL for category filter or search query
    if (query && query.trim()) {
      url = `${baseUrl}/search?q=${encodeURIComponent(query)}${
        page > 1 ? `&paged=${page}` : ""
      }`;
    } else if (filter) {
      url = filter.startsWith("/")
        ? `${baseUrl}${filter.replace(/\/$/, "")}${
            page > 1 ? `/page/${page}` : ""
          }`
        : `${baseUrl}/${filter}${page > 1 ? `/page/${page}` : ""}`;
    } else {
      url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
    }

    const { axios, cheerio } = providerContext;
    const res = await axios.get(url, { headers: defaultHeaders, signal });
    const $ = cheerio.load(res.data || "");

    const seen = new Set<string>();
    const catalog: Post[] = [];

    // ★ First page (page 1) → max 20 posts, otherwise up to 100
    const MAX_POSTS = page === 1 ? 20 : 100;

    // --- Parse each movie card block ---
    $(".movie-card, .ml-card").each((_, el) => {
      // Stop early once we hit the cap — saves CPU/time on big pages
      if (catalog.length >= MAX_POSTS) return false;

      const card = $(el);

      // Extract the relative or absolute link
      let rawLink =
        card.find("a.title[href]").first().attr("href")?.trim() ||
        card.find("a.ml-poster[href]").first().attr("href")?.trim() ||
        card.find("a.ml-ct[href]").first().attr("href")?.trim() ||
        card
          .find('a[data-mlbd-click-ad="movie-card"][href]')
          .first()
          .attr("href")
          ?.trim() ||
        card.find("a[href]").first().attr("href")?.trim();

      if (!rawLink) return;

      // Convert to full absolute URL
      let fullLink: string;
      try {
        fullLink = new URL(rawLink, baseUrl).href;
      } catch {
        fullLink = rawLink.startsWith("http")
          ? rawLink
          : `${baseUrl}${rawLink.startsWith("/") ? "" : "/"}${rawLink}`;
      }

      if (seen.has(fullLink)) return;

      const title =
        card.find(".title").first().text().trim() ||
        card.find(".ml-ct").first().text().trim() ||
        card.find("a.ml-poster").attr("title")?.trim() ||
        card.find("img").attr("alt")?.trim() ||
        card.find("a[title]").attr("title")?.trim() ||
        "Untitled";

      const image =
        card.find("img").attr("data-src")?.trim() ||
        card.find("img").attr("src")?.trim() ||
        "";

      seen.add(fullLink);
      catalog.push({ title, link: fullLink, image });
    });

    return catalog;
  } catch (err) {
    console.error(
      "Movielinkdb fetchPosts error:",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}