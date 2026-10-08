import { Post, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";

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
  return fetchPosts({ filter: "", page, query: searchQuery, signal, providerContext });
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
    if (page > 1) return [];

    const { axios, cheerio } = providerContext;

    // Use Animesalt's real base URL
    const baseUrl =
      ((await getBaseUrl("animesalt").catch(() => "")) || "https://animesalt.in").replace(/\/+$/, "");

    let url = baseUrl;
    if (query && query.trim()) {
      url = `${baseUrl}/search.php?search=${encodeURIComponent(query.trim())}`;
    }

    const res = await axios.get(url, { headers: defaultHeaders, signal });
    const $ = cheerio.load(res.data || "");

    const resolveUrl = (href: string) =>
      href?.startsWith("http") ? href : new URL(href, baseUrl).href;

    let container = $("body");
    if (!query) {
      if (filter && /series/i.test(filter)) {
        const sec = $("h2")
          .filter((_, el) => /series/i.test($(el).text()))
          .closest("section");
        if (sec.length) container = sec;
      } else if (filter && /movie/i.test(filter)) {
        const sec = $("h2")
          .filter((_, el) => /movie/i.test($(el).text()))
          .closest("section");
        if (sec.length) container = sec;
      } else {
        const sec = $("h2")
          .filter((_, el) => /recent/i.test($(el).text()))
          .closest("section");
        if (sec.length) container = sec;
      }
    }

    const seen = new Set<string>();
    const catalog: Post[] = [];

    const POST_SELECTORS = [
      ".anime-blog",
      "article",
      "li.post",
      ".swiper-slide li",
      ".latest-movies-series-swiper-slide li",
      "ul.post-lst li",
    ].join(",");

    container.find(POST_SELECTORS).each((_, el) => {
      const card = $(el);

      let link =
        card.find(".action-overlay a[href]").attr("href") ||
        card.find("a.lnk-blk[href]").attr("href") ||
        card.find("a[href*='/series/'], a[href*='/movies/']").first().attr("href") ||
        card.find("a[href]").first().attr("href") ||
        "";
      if (!link) return;

      link = resolveUrl(link);
      if (seen.has(link)) return;

      let title =
        card.find("img").attr("alt")?.trim() ||
        card.find("h2.entry-title").first().text().trim() ||
        card.find(".entry-title").first().text().trim() ||
        card.find("p[style*='medium']").first().text().trim() ||
        card.find("a[href]").last().text().trim() ||
        "";

      title = title.replace(/^Play Now\s*/i, "").replace(/^Image\s+/i, "").trim();
      if (!title) return;

      let img =
        card.find("img").attr("data-src") ||
        card.find("img").attr("src") ||
        "";

      const image = img ? resolveUrl(img) : "";

      seen.add(link);
      catalog.push({ title, link, image });
    });

    return catalog;
  } catch (err) {
    console.error(
      "Animesalt fetchPosts error:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}