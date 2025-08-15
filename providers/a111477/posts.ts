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
  const result = await posts({ baseUrl, url, signal, axios, cheerio });
  return result.slice(0, 50); // Limit only for getPosts
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

  // Filter posts based on search query with improved matching
  const filteredPosts = allPosts.filter((post) => {
    const title = post.title.toLowerCase();
    const query = searchQuery.toLowerCase();

    // Direct substring match
    if (title.includes(query)) {
      return true;
    }

    // Word boundary matching
    const queryWords = query.split(/\s+/).filter((word) => word.length > 0);
    const titleWords = title
      .split(/[\s\-\.\(\)\[\]]+/)
      .filter((word) => word.length > 0);

    // Check if all query words are found in title words
    const allWordsMatch = queryWords.every((queryWord) =>
      titleWords.some((titleWord) => titleWord.includes(queryWord))
    );

    if (allWordsMatch) {
      return true;
    }

    // Fuzzy matching for single word queries
    if (queryWords.length === 1) {
      const queryWord = queryWords[0];
      if (queryWord.length >= 3) {
        // Check if any title word starts with the query
        const startsWithMatch = titleWords.some((titleWord) =>
          titleWord.startsWith(queryWord)
        );

        if (startsWithMatch) {
          return true;
        }

        // Levenshtein distance for close matches
        const hasCloseMatch = titleWords.some((titleWord) => {
          if (Math.abs(titleWord.length - queryWord.length) > 2) return false;
          const distance = levenshteinDistance(titleWord, queryWord);
          return distance <= Math.max(1, Math.floor(queryWord.length * 0.2));
        });

        if (hasCloseMatch) {
          return true;
        }
      }
    }

    return false;
  });

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

    // Only limit for regular getPosts, not for search
    return catalog;
  } catch (err) {
    console.error("111477 directory listing error:", err);
    return [];
  }
}

// Levenshtein distance function for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}
