import { Post, ProviderContext } from "../types";

const BASE = "https://toonhub4u.co";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: BASE,
};

// =====================================================
// 📌 GET POSTS (Category / Latest / Pagination)
// =====================================================
export async function getPosts({
  filter,
  page = 1,
  providerContext,
}: {
  filter: string;
  page?: number;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio } = providerContext;

  const cleanFilter = filter.replace(/^\/|\/$/g, "");
  const url = `${BASE}/${cleanFilter}/page/${page}/`;

  const res = await axios.get(url, { headers });
  const $ = cheerio.load(res.data);

  const posts: Post[] = [];

  $("li.post-item").each((_, el) => {
    // ✅ TITLE + LINK (correct element)
    const titleAnchor = $(el).find("h2.post-title a");
    const title = titleAnchor.text().trim();
    const link = titleAnchor.attr("href");

    if (!title || !link) return;

    // ✅ IMAGE
    let image =
      $(el).find(".post-thumb img").attr("data-src") ||
      $(el).find(".post-thumb img").attr("src") ||
      "";

    if (image.startsWith("//")) image = "https:" + image;

    posts.push({
      title,
      link,
      image,
    });
  });

  return posts;
}

// =====================================================
// 🔍 SEARCH POSTS
// =====================================================
export async function getSearchPosts({
  searchQuery,
  providerContext,
}: {
  searchQuery: string;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio } = providerContext;

  const url = `${BASE}/?s=${encodeURIComponent(searchQuery)}`;
  const res = await axios.get(url, { headers });
  const $ = cheerio.load(res.data);

  const posts: Post[] = [];

  $("li.post-item").each((_, el) => {
    const titleAnchor = $(el).find("h2.post-title a");
    const title = titleAnchor.text().trim();
    const link = titleAnchor.attr("href");

    if (!title || !link) return;

    let image =
      $(el).find(".post-thumb img").attr("data-src") ||
      $(el).find(".post-thumb img").attr("src") ||
      "";

    if (image.startsWith("//")) image = "https:" + image;

    posts.push({
      title,
      link,
      image,
    });
  });

  return posts;
}
