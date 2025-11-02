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

// --- Core fetch function ---
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
    const baseUrl = await providerContext.getBaseUrl("skymovieshd");
    let url: string;

    if (
      query &&
      query.trim() &&
      query.trim().toLowerCase() !== "what are you looking for?"
    ) {
      const params = new URLSearchParams();
      params.append("s", query.trim());
      if (page > 1) params.append("paged", page.toString());
      url = `${baseUrl}/?${params.toString()}`;
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

    const resolveUrl = (href: string) =>
      href?.startsWith("http") ? href : new URL(href, baseUrl).href;

    const seen = new Set<string>();
    const catalog: Post[] = [];

    // ✅ Scrape posts
    $("article.latestpost").each((_, el) => {
      const card = $(el);

      // Link
      let link =
        card
          .find(
            "header.entry-header h2.entry-title a, header.entry-header h1.entry-title a"
          )
          .attr("href") || "";
      if (!link) return;
      link = resolveUrl(link);
      if (seen.has(link)) return;

      // Title: remove "Download"
      let title = card
        .find(
          "header.entry-header h2.entry-title a, header.entry-header h1.entry-title a"
        )
        .text()
        .replace(/^Download\s*/i, "")
        .trim();
      if (!title) return;

      // Image
      let img =
        card.find("a#featured-thumbnail img").attr("data-src") ||
        card.find("a#featured-thumbnail img").attr("src") ||
        "";
      const image = img ? resolveUrl(img) : "";

      seen.add(link);
      catalog.push({ title, link, image });
    });

    return catalog.slice(0, 100);
  } catch (err) {
    console.error(
      "fetchPosts error:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}
