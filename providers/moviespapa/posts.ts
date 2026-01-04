import { Post, ProviderContext } from "../types";

const BASE_URL = "https://moviespapa.sale";

export async function getPosts({
  page = 1,
  filter,
  providerContext,
}: {
  page?: number;
  filter?: string;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio } = providerContext;

  // Standard WordPress pagination often uses /page/N/
  const url = page === 1 ? BASE_URL : `${BASE_URL}/page/${page}/`;

  try {
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);

    const posts: Post[] = [];

    // Updated selector to match the 'thumb' and 'figure' structure
    $(".thumb figure").each((_, el) => {
      const figure = $(el);

      // The link is inside figcaption -> a
      const link = figure.find("figcaption a").attr("href");
      if (!link) return;

      // The title is inside figcaption -> a -> p
      const title = figure.find("figcaption a p").text().trim();
      
      // The image is the direct img child of figure
      const image = figure.find("img").attr("src") || "";

      posts.push({
        title,
        link,
        image,
      });
    });

    return posts;
  } catch (e) {
    console.error("MoviesPapa getPosts error", e);
    return [];
  }
}

export async function getSearchPosts({
  searchQuery,
  page = 1,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio } = providerContext;

  // Search URL structure typically includes page number if pagination is supported
  const url = `${BASE_URL}/page/${page}/?s=${encodeURIComponent(searchQuery)}`;

  try {
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);

    const posts: Post[] = [];

    // Reusing the same selector logic as main page
    $(".thumb figure").each((_, el) => {
      const figure = $(el);

      const link = figure.find("figcaption a").attr("href");
      if (!link) return;

      const title = figure.find("figcaption a p").text().trim();
      const image = figure.find("img").attr("src") || "";

      posts.push({
        title,
        link,
        image,
      });
    });

    return posts;
  } catch (e) {
    console.error("MoviesPapa getSearchPosts error", e);
    return [];
  }
}