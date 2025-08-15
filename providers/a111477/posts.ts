import { Post, ProviderContext } from "../types";

export const getPosts = async function ({
  filter,
  page,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio } = providerContext;
  const baseUrl = "https://a.111477.xyz";
  if (page > 1) {
    return [];
  }
  const url = `${baseUrl}${filter}`;
  return posts({ baseUrl, url, signal, axios, cheerio });
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio } = providerContext;
  const baseUrl = "https://a.111477.xyz";
  if (page > 1) {
    return [];
  }

  // Search through both movies and TV shows directories
  const moviesPosts = await posts({
    baseUrl,
    url: `${baseUrl}/movies/`,
    signal,
    axios,
    cheerio,
  });
  const tvsPosts = await posts({
    baseUrl,
    url: `${baseUrl}/tvs/`,
    signal,
    axios,
    cheerio,
  });

  // Combine all posts
  const allPosts = [...moviesPosts, ...tvsPosts];

  // Filter posts based on search query
  const filteredPosts = allPosts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return filteredPosts;
};

async function posts({
  baseUrl,
  url,
  signal,
  axios,
  cheerio,
}: {
  baseUrl: string;
  url: string;
  signal: AbortSignal;
  axios: ProviderContext["axios"];
  cheerio: ProviderContext["cheerio"];
}): Promise<Post[]> {
  try {
    const res = await axios.get(url, { signal });
    const data = res.data;
    const $ = cheerio.load(data);
    const catalog: Post[] = [];

    // Parse the directory listing
    $("table tbody tr").each((i, element) => {
      const $row = $(element);
      const linkElement = $row.find("td:first-child a");
      const title = linkElement.text().trim();
      const link = linkElement.attr("href");

      // Skip parent directory and files, only get folders
      if (
        title &&
        link &&
        title !== "../" &&
        title !== "Parent Directory" &&
        title.endsWith("/")
      ) {
        const cleanTitle = title.replace(/\/$/, ""); // Remove trailing slash
        const fullLink = url + link;

        // Generate a placeholder image based on title
        const imageTitle =
          cleanTitle.length > 30
            ? cleanTitle.slice(0, 30).replace(/\./g, " ")
            : cleanTitle.replace(/\./g, " ");
        const image = `https://placehold.jp/23/000000/ffffff/200x400.png?text=${encodeURIComponent(
          imageTitle
        )}&css=%7B%22background%22%3A%22%20-webkit-gradient(linear%2C%20left%20bottom%2C%20left%20top%2C%20from(%233f3b3b)%2C%20to(%23000000))%22%2C%22text-transform%22%3A%22%20capitalize%22%7D`;

        catalog.push({
          title: cleanTitle,
          link: fullLink,
          image: image,
        });
      }
    });

    return catalog.slice(0, 50);
  } catch (err) {
    console.error("111477 directory listing error:", err);
    return [];
  }
}
