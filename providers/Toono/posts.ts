import { Post, ProviderContext } from "../types";

const defaultHeaders = {
  Referer: "https://toonstream.one",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

// ------------------------------------------------------
// NORMAL CATALOG
// ------------------------------------------------------
export function getPosts({
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
  return fetchPosts({
    filter,
    page,
    query: "",
    signal,
    providerContext,
  });
}

// ------------------------------------------------------
// SEARCH
// ------------------------------------------------------
export function getSearchPosts({
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
// CORE FETCH
// ------------------------------------------------------
function fetchPosts({
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
  const { axios, cheerio } = providerContext;
  const baseUrl = "https://toonstream.one";

  let url = baseUrl;

  // --------------------------------------------------
  // URL BUILD
  // --------------------------------------------------
  if (query && query.trim()) {
    // Search uses /home/?s=searchQuery
    const searchStr = encodeURIComponent(query.trim());
    url = `${baseUrl}/home/?s=${searchStr}`;

    // pagination on search pages
    if (page > 1) {
      url += `&paged=${page}`;
    }
  } else if (filter) {
    const clean = filter.startsWith("/")
      ? filter.replace(/\/$/, "")
      : `/${filter}`;
    url = `${baseUrl}${clean}${page > 1 ? `/page/${page}` : ""}`;
  } else {
    url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
  }

  return axios
    .get(url, { headers: defaultHeaders, signal })
    .then((res: any) => {
      const $ = cheerio.load(res.data || "");
      const posts: Post[] = [];
      const seen = new Set<string>();

      const resolveUrl = (href: string) =>
        href?.startsWith("http") ? href : new URL(href, baseUrl).href;

      // --------------------------------------------------
      // 🔥 MAIN POST SELECTOR (SEARCH + NORMAL)
      // --------------------------------------------------
      $("ul.post-lst > li").each((_, el) => {
        const li = $(el);

        // ---------------------------
        // LINK
        // ---------------------------
        let link = li.find("a.lnk-blk").attr("href") || "";
        if (!link) return;

        link = resolveUrl(link);
        if (seen.has(link)) return;

        // ---------------------------
        // TITLE
        // ---------------------------
        let title =
          li.find("h2.entry-title").text().trim() ||
          li.find("img").attr("alt")?.trim() ||
          "";

        if (!title) return;

        title = title.replace(/^Image\s+/i, "").trim();

        // ---------------------------
        // IMAGE
        // ---------------------------
        let img =
          li.find("img").attr("data-src") ||
          li.find("img").attr("src") ||
          "";

        if (img.startsWith("//")) img = "https:" + img;
        const image = img ? resolveUrl(img) : "";

        seen.add(link);

        posts.push({
          title,
          link,
          image,
        });
      });

      return posts.slice(0, 100);
    })
    .catch((err: any) => {
      console.error("ToonStream search/posts error:", err?.message || err);
      return [];
    });
}
