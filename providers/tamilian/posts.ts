import { Post, ProviderContext } from "../types";

const defaultHeaders = {
  Referer: "https://www.google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
};

// ------------------------------------------------------
// Normal Catalog Posts
// ------------------------------------------------------
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

// ------------------------------------------------------
// Search Posts
// ------------------------------------------------------
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
    query: searchQuery,
    page,
    signal,
    providerContext,
  });
}

// ------------------------------------------------------
// CORE FUNCTION
// ------------------------------------------------------
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
    const baseUrl = "https://tamilian.io";

    const wrapWithProxy = (url: string) =>
      "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);

    let url: string;

    // ---------------------------
    // Build URL
    // ---------------------------
    if (query && query.trim()) {
      url = `${baseUrl}/search/${encodeURIComponent(query)}${
        page > 1 ? `&paged=${page}` : ""
      }`;
    } else if (filter) {
      url = filter.startsWith("/")
        ? `${baseUrl}${filter}${page > 1 ? `/page/${page}` : ""}`
        : `${baseUrl}/${filter}${page > 1 ? `/page/${page}` : ""}`;
    } else {
      url = `${baseUrl}/home${page > 1 ? `/page/${page}` : ""}`;
    }

    const { axios, cheerio } = providerContext;

    const res = await axios.get(wrapWithProxy(url), {
      headers: defaultHeaders,
      signal,
    });

    const $ = cheerio.load(res.data || "");

    const resolveUrl = (href: string) =>
      href.startsWith("http") ? href : new URL(href, baseUrl).href;

    const seen = new Set<string>();
    const catalog: Post[] = [];

    // --------------------------------------------------
    // Parse posts (NO cheerio.Element typing needed)
    // --------------------------------------------------
    $(".ml-item").each((_, el) => {
      const item = $(el);

      const anchor = item.find("a.ml-mask").first();
      if (!anchor.length) return;

      // 🎬 Movie page link
      let pageLink = anchor.attr("href") || "";
      if (!pageLink) return;

      pageLink = resolveUrl(pageLink);
      if (seen.has(pageLink)) return;

      // 🧠 AJAX path
      const ajaxPath = anchor.attr("data-url") || "";

      // 👉 Combine both into ONE link
      const finalLink = ajaxPath
        ? `${pageLink}?ajax=${encodeURIComponent(ajaxPath)}`
        : pageLink;

      // 🎬 Title
      const title =
        anchor.attr("title")?.trim() ||
        item.find("img").attr("alt")?.trim() ||
        "";

      if (!title) return;

      // 🖼️ Image
      const img =
        item.find("img").attr("data-original") ||
        item.find("img").attr("src") ||
        "";

      const image = img ? resolveUrl(img) : "";

      seen.add(pageLink);

      catalog.push({
        title,
        link: finalLink, // ✅ page + ajax together
        image,
      });
    });

    return catalog.slice(0, 100);
  } catch (err) {
    console.error(
      "Tamilian fetchPosts error:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}
