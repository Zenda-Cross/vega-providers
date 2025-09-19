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

// 🔑 OMDb API Key
const OMDB_API_KEY = "90b37ad0";

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
    const baseUrl = "https://www.ofilmyzilla.store";
    let url: string;

    if (query && query.trim()) {
      url = `${baseUrl}/search.php?q=${encodeURIComponent(query)}${
        page > 1 ? `&page=${page}` : ""
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

    const resolveUrl = (href: string) =>
      href?.startsWith("http") ? href : new URL(href, url).href;

    const seen = new Set<string>();
    const catalog: Post[] = [];

    const POST_SELECTORS = [".list div", ".post", "article"].join(",");

    $(POST_SELECTORS).each((_, el) => {
      const card = $(el);

      let link = card.find("a[href]").first().attr("href") || "";
      if (!link) return;
      link = resolveUrl(link);
      if (seen.has(link)) return;

      let title =
        card.find("h2").first().text().trim() ||
        card.find("a[title]").first().attr("title")?.trim() ||
        card.find("span").first().text().trim() ||
        card.text().trim();
      title = title
        .replace(/\[.*?\]/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      if (!title) return;

      const img =
        card.find("img").first().attr("src") ||
        card.find("img").first().attr("data-src") ||
        card.find("img").first().attr("data-original") ||
        "";
      const image = img ? resolveUrl(img) : "";

      seen.add(link);
      catalog.push({ title, link, image });
    });

    // --- Step 2: OMDb fallback for missing posters ---
    for (const post of catalog) {
      if ((!post.image || post.image.trim() === "") && OMDB_API_KEY) {
        try {
          // Year निकालो (e.g., "Movie Name (2025)")
          const yearMatch = post.title.match(/\b(19|20)\d{2}\b/);
          const year = yearMatch ? yearMatch[0] : "";

          // साफ title (brackets हटाओ, लेकिन year अलग से रखो)
          const cleanTitle = post.title
            .replace(/\[.*?\]/g, "")
            .replace(/\(.+?\)/g, "")
            .trim();

          let omdbUrl = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(
            cleanTitle
          )}`;
          if (year) {
            omdbUrl += `&y=${year}`;
          }

          console.log(`🔎 OMDb lookup: ${omdbUrl}`);

          const omdbRes = await providerContext.axios.get(omdbUrl);

          if (
            omdbRes.data &&
            omdbRes.data.Poster &&
            omdbRes.data.Poster !== "N/A"
          ) {
            post.image = omdbRes.data.Poster;
            console.log(`✅ Poster found for "${cleanTitle}" → ${post.image}`);
          } else {
            console.warn(
              `⚠️ OMDb: No poster for "${cleanTitle}" ${
                year ? "(" + year + ")" : ""
              }`
            );
          }
        } catch (err) {
          console.warn(`❌ OMDb lookup failed for "${post.title}" → ${err}`);
        }
      }
    }

    return catalog.slice(0, 100);
  } catch (err) {
    console.error(
      "OFilmyZilla fetchPosts error:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}
