import { Post, ProviderContext } from "../types";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export const getPosts = async function ({
  filter,
  page,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    const { axios, cheerio } = providerContext;
    const url = "https://www.desidubanime.me/wp-admin/admin-ajax.php";
    
    const genresList = ["action", "comedy", "adventure", "isekai"];
    
    const params = new URLSearchParams();
    params.append("action", "advanced_search");
    params.append("page", String(page));
    
    if (genresList.includes(filter)) {
      params.append("genre[]", filter);
      params.append("orderby", "date");
    } else {
      params.append("orderby", filter || "date");
    }
    params.append("order", "DESC");
    params.append("s_keyword", "");

    const headers = {
      "User-Agent": USER_AGENT,
      "Referer": "https://www.desidubanime.me/search/",
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const res = await axios.post(url, params.toString(), { headers });
    const html = res.data?.data?.html || "";
    if (!html) return [];

    const $ = cheerio.load(html);
    const postsList: Post[] = [];

    $("article.anime-card").each((_, el) => {
      const imgEl = $(el).find("img").first();
      const title = imgEl.attr("alt") || "";
      const image = imgEl.attr("src") || "";
      const link = $(el).find("a").first().attr("href") || "";

      if (title && link) {
        postsList.push({
          title: title.trim(),
          link: link.trim(),
          image: image.trim(),
        });
      }
    });

    return postsList;
  } catch (err) {
    console.error("DesiDubAnime getPosts error:", err);
    return [];
  }
};

export const search = async function ({
  searchQuery,
  page,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    const { axios, cheerio } = providerContext;
    const url = "https://www.desidubanime.me/wp-admin/admin-ajax.php";
    
    const params = new URLSearchParams();
    params.append("action", "advanced_search");
    params.append("page", String(page));
    params.append("orderby", "date");
    params.append("order", "DESC");
    params.append("s_keyword", searchQuery);

    const headers = {
      "User-Agent": USER_AGENT,
      "Referer": "https://www.desidubanime.me/search/",
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const res = await axios.post(url, params.toString(), { headers });
    const html = res.data?.data?.html || "";
    if (!html) return [];

    const $ = cheerio.load(html);
    const postsList: Post[] = [];

    $("article.anime-card").each((_, el) => {
      const imgEl = $(el).find("img").first();
      const title = imgEl.attr("alt") || "";
      const image = imgEl.attr("src") || "";
      const link = $(el).find("a").first().attr("href") || "";

      if (title && link) {
        postsList.push({
          title: title.trim(),
          link: link.trim(),
          image: image.trim(),
        });
      }
    });

    return postsList;
  } catch (err) {
    console.error("DesiDubAnime search error:", err);
    return [];
  }
};
