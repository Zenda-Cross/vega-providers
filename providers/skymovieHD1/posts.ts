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

// --- Your OMDb API Key ---
const OMDB_API_KEY = "90b37ad0"; // Replace with your real OMDb key

// --- Helper: Extract clean movie name ---
function extractMovieName(title: string): string {
  const match = title.match(/^(.*?)\s*\(/);
  return match ? match[1].trim() : title.split("Hindi")[0].trim();
}

// --- Fetch poster from OMDb ---
async function fetchPoster(movieName: string): Promise<string> {
  try {
    const res = await fetch(
      `https://www.omdbapi.com/?t=${encodeURIComponent(movieName)}&apikey=${OMDB_API_KEY}`
    );
    const data = await res.json();
    if (data && data.Poster && data.Poster !== "N/A") {
      return data.Poster;
    }
  } catch (e) {
    console.error("Poster fetch error:", e);
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

// --- Search posts (Fixed version) ---
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
    const baseUrl = "https://skymovieshd.mba";
    let url: string;

    if (query && query.trim()) {
      // 🔹 Fixed Search URL
      url = `${baseUrl}/search.php?search=${encodeURIComponent(query)}&cat=All`;
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

    // 🔹 Try primary movie link selectors
    $("a[href*='?id='], a[href*='.html']").each((_, el) => {
      const anchor = $(el);
      let link = anchor.attr("href") || "";
      if (!link) return;
      link = resolveUrl(link);
      if (seen.has(link)) return;

      const rawTitle = anchor.text().trim().replace(/\s{2,}/g, " ");
      if (!rawTitle) return;

      seen.add(link);
      catalog.push({ title: rawTitle, link, image: "" });
    });

    // 🔹 Fetch OMDb poster for each movie name
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
