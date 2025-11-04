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

// --- Helper: Extract clean movie name ---
function extractMovieName(title: string): string {
  const match = title.match(/^(.*?)\s*\(/);
  return match ? match[1].trim() : title.split("Hindi")[0].trim();
}

// --- Fetch poster from IMDb Suggestion API ---
async function fetchPoster(movieName: string): Promise<string> {
  try {
    if (!movieName) return "";
    const firstLetter = movieName.charAt(0).toLowerCase();
    const url = `https://v2.sg.media-imdb.com/suggestion/${firstLetter}/${encodeURIComponent(
      movieName
    )}.json`;
    const res = await fetch(url);
    const data = await res.json();

    if (data && data.d && data.d.length > 0) {
      const movie = data.d.find((item: any) => item.i && item.i.imageUrl);
      if (movie && movie.i && movie.i.imageUrl) return movie.i.imageUrl;
    }
  } catch (e) {
    console.error("IMDb poster fetch error:", e);
  }
  return "";
}

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
  return fetchPosts({ query: searchQuery, page, signal, providerContext });
}

// --- Core fetch logic ---
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
    const baseUrl = "https://www.ofilmyzilla.com.ng";
    let url: string;

    // ✅ FIXED search parameter (q instead of search)
    if (query && query.trim()) {
      url = `${baseUrl}/search.php?q=${encodeURIComponent(query)}`;
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

    // 🔹 Parse movie links (search result or homepage)
    $("a[href*='.html']").each((_, el) => {
      const anchor = $(el);
      let link = anchor.attr("href") || "";
      if (!link) return;

      link = resolveUrl(link);
      if (seen.has(link)) return;

      const text = anchor.text().trim();
      if (!text || text.length < 3) return; // Skip short text

      // Ignore irrelevant links like navigation/menu
      if (!/\d{4}/.test(text) && !text.toLowerCase().includes("hindi")) return;

      seen.add(link);
      catalog.push({
        title: text
          .replace(/Download|Full Movie|Watch Online|Free/gi, "")
          .trim(),
        link,
        image: "",
      });
    });

    // 🔹 Fetch IMDb posters for each movie asynchronously
    for (const post of catalog) {
      const movieName = extractMovieName(post.title);
      post.image = await fetchPoster(movieName);
    }

    return catalog.slice(0, 100);
  } catch (err) {
    console.error("fetchPosts error:", err instanceof Error ? err.message : String(err));
    return [];
  }
}
