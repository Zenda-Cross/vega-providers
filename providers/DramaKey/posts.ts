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
  Cookie: "starstruck_92a51155d30383747881214f427bf36e=d9078f054cfc2c98c5a4fbd2db0765a7; _ga=GA1.1.283094789.1762600987; popup_closed=true; _ga_YHYM56T9LB=GS2.1.s1762600986$o1$g1$t1762604243$j60$l0$h0",
};

// --- Normal catalog posts (For the home page/newest/updated posts) ---
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

// --- Search posts (Refined for clarity) ---
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
  return fetchPosts({ filter: undefined, page, query: searchQuery, signal, providerContext });
}

// --- Core scraping function ---
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
    const baseUrl = "https://onlykdrama.top";
    let url: string;
    const isSearch = query && query.trim(); // Check if we are on a search page

    // 1. Handle URL construction (remains the same)
    if (isSearch) {
      url = `${baseUrl}/?s=${encodeURIComponent(query!)}${page > 1 ? `&paged=${page}` : ""}`;
    } 
    else if (filter) {
      url = filter.startsWith("/")
        ? `${baseUrl}${filter.replace(/\/$/, "")}${page > 1 ? `/page/${page}` : ""}`
        : `${baseUrl}/${filter}${page > 1 ? `/page/${page}` : ""}`;
    } 
    else {
      url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
    }

    const { axios, cheerio } = providerContext;
    const res = await axios.get(url, { headers: defaultHeaders, signal }); 
    const $ = cheerio.load(res.data || "");

    const resolveUrl = (href: string) =>
      href?.startsWith("http") ? href : new URL(href, url).href;

    const seen = new Set<string>();
    const catalog: Post[] = [];

    // --- SELECTOR LOGIC MODIFICATION BASED ON PAGE TYPE ---
    // If search, use the specific '.result-item' from the search template.
    // Otherwise, use the original catalog selector.
    const selector = isSearch ? ".result-item" : ".items .item.tvshows";

    // --- Parse post containers ---
    $(selector).each((_, el) => {
      const card = $(el);

        let link: string;
        let title: string;
        let image: string;
        let rating: string;
        let yearOrDate: string;

        if (isSearch) {
            // New logic based on the provided HTML structure
            link = resolveUrl(card.find(".details .title a").attr("href") || "");
            title = card.find(".details .title a").text().trim() || "";
            image = card.find(".image img").attr("src") || card.find(".image img").attr("data-src") || "";
            rating = card.find(".details .meta .rating").text().trim() || "0";
            yearOrDate = card.find(".details .meta .year").text().trim() || "";
        } else {
            // Original logic for .items .item.tvshows container (Home/Filter)
            link = resolveUrl(card.find("a").first().attr("href") || "");
            title = card.find("h3 a").text().trim() || "";
            image = card.find(".poster img").attr("src") || card.find(".poster img").attr("data-src") || "";
            rating = card.find(".rating").text().trim() || "0";
            yearOrDate = card.find(".data span").last().text().trim() || "";
        }
        
      if (!link || seen.has(link) || !title) return;
        
      const poster = image ? resolveUrl(image) : "";

      seen.add(link);
      catalog.push({
        title,
        link,
        image: poster,
        rating,
        date: yearOrDate,
      } as Post);
    });

    return catalog.slice(0, 100);
  } catch (err) {
    console.error("fetchPosts parsing error:", err instanceof Error ? err.message : String(err));
    return [];
  }
}