import { Post, ProviderContext } from "../types";

const defaultHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

function extractVideosFromData(data: any): Post[] {
  const posts: Post[] = [];
  const seenIds = new Set<string>();

  function walk(obj: any) {
    if (!obj || typeof obj !== "object") return;

    if (obj.videoRenderer) {
      const vr = obj.videoRenderer;
      const videoId = vr.videoId;

      if (videoId && !seenIds.has(videoId)) {
        seenIds.add(videoId);
        const title =
          vr.title?.runs?.map((r: any) => r.text).join("") ||
          vr.title?.simpleText ||
          "";
        const channel =
          vr.ownerText?.runs?.map((r: any) => r.text).join("") ||
          vr.shortBylineText?.runs?.map((r: any) => r.text).join("") ||
          "";
        const views =
          vr.shortViewCountText?.simpleText ||
          vr.viewCountText?.simpleText ||
          "";
        const duration = vr.lengthText?.simpleText || "";

        // High resolution landscape thumbnail (16:9)
        const image = `https://i.ytimg.com/vi/${videoId}/hq720.jpg`;

        const tag = channel ? `${channel}${views ? ` • ${views}` : ""}` : views || undefined;

        posts.push({
          title: title.trim(),
          link: `https://www.youtube.com/watch?v=${videoId}`,
          image,
          aspectRatio: 16 / 9,
          borderRadius: 8,
          tag,
          cornerTag: duration || undefined,
        });
      }
    }

    for (const key of Object.keys(obj)) {
      walk(obj[key]);
    }
  }

  walk(data);
  return posts;
}

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
  const { axios } = providerContext;

  try {
    const query = filter || "trending";
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      query
    )}`;

    const res = await axios.get(searchUrl, {
      headers: defaultHeaders,
    });

    const match =
      res.data.match(/var ytInitialData\s*=\s*({.+?});<\/script>/) ||
      res.data.match(/ytInitialData\s*=\s*({.+?});/);

    if (!match) return [];
    const data = JSON.parse(match[1]);
    const posts = extractVideosFromData(data);

    // Pagination slice if needed
    const pageSize = 20;
    const startIndex = (page - 1) * pageSize;
    if (startIndex >= posts.length) {
      return posts.slice(0, pageSize);
    }
    return posts.slice(startIndex, startIndex + pageSize);
  } catch (err) {
    console.error("YouTube getPosts error:", err);
    return [];
  }
};

export const getSearchPosts = async function ({
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
  const { axios } = providerContext;

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      searchQuery
    )}`;

    const res = await axios.get(searchUrl, {
      headers: defaultHeaders,
    });

    const match =
      res.data.match(/var ytInitialData\s*=\s*({.+?});<\/script>/) ||
      res.data.match(/ytInitialData\s*=\s*({.+?});/);

    if (!match) return [];
    const data = JSON.parse(match[1]);
    const posts = extractVideosFromData(data);

    const pageSize = 20;
    const startIndex = (page - 1) * pageSize;
    if (startIndex >= posts.length) {
      return posts.slice(0, pageSize);
    }
    return posts.slice(startIndex, startIndex + pageSize);
  } catch (err) {
    console.error("YouTube getSearchPosts error:", err);
    return [];
  }
};
