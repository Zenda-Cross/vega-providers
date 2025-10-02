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
    const baseUrl = await providerContext.getBaseUrl("joya9tv");
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

    const { cheerio } = providerContext;
    const res = await fetch(url, { headers: defaultHeaders, signal });
    const data = await res.text();
    const $ = cheerio.load(data || "");

    const resolveUrl = (href: string) =>
      href?.startsWith("http") ? href : new URL(href, baseUrl).href;

    const seen = new Set<string>();
    const catalog: Post[] = [];

    // ✅ Case 1: Normal catalog listing
    $("article.item.movies").each((_, el) => {
      const card = $(el);

      let link = card.find("div.data h3 a").attr("href") || "";
      if (!link) return;
      link = resolveUrl(link);
      if (seen.has(link)) return;

      let title = card.find("div.data h3 a").text().trim();
      if (!title) return;

      let img = card.find("div.poster img").attr("src") || "";
      const image = img ? resolveUrl(img) : "";

      seen.add(link);
      catalog.push({ title, link, image });
    });

    // ✅ Case 2: Search results
    $(".result-item article").each((_, el) => {
      const card = $(el);

      let link = card.find("a").attr("href") || "";
      if (!link) return;
      link = resolveUrl(link);
      if (seen.has(link)) return;

      let title =
        card.find("a").attr("title") || card.find("img").attr("alt") || "";
      title = title.trim();
      if (!title) return;

      let img = card.find("img").attr("src") || "";
      const image = img ? resolveUrl(img) : "";

      seen.add(link);
      catalog.push({ title, link, image });
    });

    console.log(`fetchPosts: Fetched ${catalog.length} posts from ${url}`);

    return catalog.slice(0, 100);
  } catch (err) {
    console.error(
      "fetchPosts error:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}
