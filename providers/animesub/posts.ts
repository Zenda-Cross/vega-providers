import { Post, ProviderContext } from "../types";

const MAL_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function cleanMalImage(src: string): string {
  if (!src) return "";
  return src.replace(/\/r\/\d+x\d+/, "");
}

function parseMalTopAnime(
  html: string,
  cheerio: ProviderContext["cheerio"],
): Post[] {
  const $ = cheerio.load(html);
  const posts: Post[] = [];

  $("tr.ranking-list").each((_, el) => {
    const titleEl = $(el).find(".anime_ranking_h3 a, h3 a").first();
    const title = titleEl.text().trim();
    const malUrl = titleEl.attr("href") || "";
    const malId = malUrl.match(/anime\/(\d+)/)?.[1];
    if (!title || !malId) return;

    const imgEl = $(el).find("td.title img, .hoverinfo_trigger img").first();
    const rawImg = imgEl.attr("data-src") || imgEl.attr("src") || "";
    const image = cleanMalImage(rawImg);

    const score = $(el).find(".score span").text().trim();
    const tag = score && score !== "N/A" ? `${score}★` : undefined;

    posts.push({
      title,
      link: JSON.stringify({ malId, title, image, type: "series" }),
      image,
      tag,
    });
  });

  return posts;
}

function parseMalSeasonal(
  html: string,
  cheerio: ProviderContext["cheerio"],
  page: number,
): Post[] {
  const $ = cheerio.load(html);
  const allSeasonal: Post[] = [];

  $(".seasonal-anime").each((_, el) => {
    const titleEl = $(el)
      .find(".title a.link-title, .title-text .link-title")
      .first();
    const title = titleEl.text().trim();
    const malUrl = titleEl.attr("href") || "";
    const malId = malUrl.match(/anime\/(\d+)/)?.[1];
    if (!title || !malId) return;

    const imgEl = $(el).find(".image img").first();
    const rawImg = imgEl.attr("data-src") || imgEl.attr("src") || "";
    const image = cleanMalImage(rawImg);

    const score = $(el).find(".score").text().trim();
    const tag = score && score !== "N/A" ? `${score}★` : undefined;

    allSeasonal.push({
      title,
      link: JSON.stringify({ malId, title, image, type: "series" }),
      image,
      tag,
    });
  });

  const pageSize = 25;
  const startIndex = (page - 1) * pageSize;
  return allSeasonal.slice(startIndex, startIndex + pageSize);
}

function parseMalGenre(
  html: string,
  cheerio: ProviderContext["cheerio"],
): Post[] {
  const $ = cheerio.load(html);
  const posts: Post[] = [];

  $(".seasonal-anime").each((_, el) => {
    const titleEl = $(el)
      .find(".title a.link-title, .title-text .link-title")
      .first();
    const title = titleEl.text().trim();
    const malUrl = titleEl.attr("href") || "";
    const malId = malUrl.match(/anime\/(\d+)/)?.[1];
    if (!title || !malId) return;

    const imgEl = $(el).find(".image img").first();
    const rawImg = imgEl.attr("data-src") || imgEl.attr("src") || "";
    const image = cleanMalImage(rawImg);

    const score = $(el).find(".score").text().trim();
    const tag = score && score !== "N/A" ? `${score}★` : undefined;

    posts.push({
      title,
      link: JSON.stringify({ malId, title, image, type: "series" }),
      image,
      tag,
    });
  });

  return posts;
}

async function fetchKitsuFallbackPosts(
  filter: string,
  page: number,
  signal: AbortSignal | undefined,
  providerContext: ProviderContext,
): Promise<Post[]> {
  try {
    const skipParam = page > 1 ? `&skip=${(page - 1) * 20}` : "";
    const filterWithSkip = filter.replace(".json", `${skipParam}.json`);
    const baseUrl = filter.startsWith("http")
      ? ""
      : "https://anime-kitsu.strem.fun";
    const url = baseUrl + filterWithSkip;
    const res = await providerContext.axios.get(url, {
      headers: providerContext.commonHeaders,
      signal,
      timeout: 10000,
    });
    const data = res.data;
    const catalog: Post[] = [];
    data?.metas?.forEach((result: any) => {
      const title = result?.name;
      const id = result?.id;
      const image = result?.poster;
      const rating = result?.kitsuRating || result?.rating;
      const tag = rating ? `${rating}★` : undefined;
      if (id) {
        catalog.push({
          title,
          link: `https://anime-kitsu.strem.fun/meta/anime/${id}.json`,
          image,
          tag,
        });
      }
    });
    return catalog;
  } catch {
    return [];
  }
}

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
  try {
    // 1. Top Airing / Popular / Favorite
    if (filter.startsWith("mal:topanime:")) {
      const type = filter.replace("mal:topanime:", "").trim();
      const offset = (page - 1) * 50;
      const url = `https://myanimelist.net/topanime.php?type=${type}&limit=${offset}`;
      const res = await providerContext.axios.get(url, {
        headers: MAL_HEADERS,
        signal,
        timeout: 10000,
      });
      return parseMalTopAnime(res.data, providerContext.cheerio);
    }

    // 2. Current Season
    if (filter === "mal:season:current") {
      const url = "https://myanimelist.net/anime/season";
      const res = await providerContext.axios.get(url, {
        headers: MAL_HEADERS,
        signal,
        timeout: 10000,
      });
      return parseMalSeasonal(res.data, providerContext.cheerio, page);
    }

    // 3. Genres
    if (filter.startsWith("mal:genre:")) {
      const parts = filter.split(":");
      const genreId = parts[2];
      const genreName = parts[3] || "Action";
      const url = `https://myanimelist.net/anime/genre/${genreId}/${genreName}?page=${page}`;
      const res = await providerContext.axios.get(url, {
        headers: MAL_HEADERS,
        signal,
        timeout: 10000,
      });
      return parseMalGenre(res.data, providerContext.cheerio);
    }

    // Fallback for legacy / kitsu paths
    return await fetchKitsuFallbackPosts(filter, page, signal, providerContext);
  } catch (err) {
    console.warn("AnimeSub getPosts error, trying Kitsu fallback:", err);
    return await fetchKitsuFallbackPosts(filter, page, signal, providerContext);
  }
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
  try {
    if (page > 1) {
      return [];
    }

    const encoded = encodeURIComponent(searchQuery);
    const searchUrl = `https://myanimelist.net/anime.php?q=${encoded}`;
    const res = await providerContext.axios.get(searchUrl, {
      headers: MAL_HEADERS,
      signal,
      timeout: 10000,
    });

    const $ = providerContext.cheerio.load(res.data);
    const posts: Post[] = [];

    $("table")
      .eq(1)
      .find("tr")
      .each((i: number, el: any) => {
        if (i === 0) return;
        const titleEl = $(el).find("a.hoverinfo_trigger strong, strong").first();
        const a = $(el).find("a.hoverinfo_trigger").first();
        const title = titleEl.text().trim() || a.text().trim();
        const href = a.attr("href") || "";
        const malId = href.match(/anime\/(\d+)/)?.[1];
        if (!title || !malId) return;

        const imgEl = $(el).find("img").first();
        const rawImg = imgEl.attr("data-src") || imgEl.attr("src") || "";
        const image = cleanMalImage(rawImg);

        const score = $(el).find("td:nth-child(5)").text().trim();
        const tag = score && score !== "N/A" ? `${score}★` : undefined;

        if (!posts.some((p) => p.title.toLowerCase() === title.toLowerCase())) {
          posts.push({
            title,
            link: JSON.stringify({ malId, title, image, type: "series" }),
            image,
            tag,
          });
        }
      });

    if (posts.length > 0) {
      return posts;
    }
  } catch (err) {
    console.warn("AnimeSub MAL search error, falling back to Kitsu search:", err);
  }

  // Fallback to Kitsu search
  try {
    const encoded = encodeURIComponent(searchQuery);
    const url = `https://anime-kitsu.strem.fun/catalog/anime/kitsu-anime-list/search=${encoded}.json`;
    const res = await providerContext.axios.get(url, {
      headers: providerContext.commonHeaders,
      signal,
      timeout: 10000,
    });
    const catalog: Post[] = [];
    res.data?.metas?.forEach((result: any) => {
      const title = result?.name || "";
      const id = result?.id;
      const image = result?.poster;
      const rating = result?.kitsuRating || result?.rating;
      const tag = rating ? `${rating}★` : undefined;
      if (id && !catalog.some((item) => item.link.includes(id))) {
        catalog.push({
          title,
          link: `https://anime-kitsu.strem.fun/meta/anime/${id}.json`,
          image,
          tag,
        });
      }
    });
    return catalog;
  } catch {
    return [];
  }
};
