import { Post, ProviderContext } from "../types";

const MAIN_URL = "https://www.mxplayer.in";
const API_URL = "https://api.mxplayer.in/v1/web";
const IMAGE_URL = "https://qqcdnpictest.mxplay.com/";

const defaultHeaders = {
  Referer: `${MAIN_URL}/`,
  Origin: MAIN_URL,
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

// Helper to ensure we have a UserID (mimicking Kotlin's cookie logic)
async function getUserID(axios: any): Promise<string> {
  try {
    const res = await axios.get(MAIN_URL, { headers: defaultHeaders });
    // Attempt to extract UserID from set-cookie headers
    // Note: In some environments axios handles cookies automatically in the jar.
    // If we need to read it explicitly:
    const cookies = res.headers["set-cookie"];
    if (cookies) {
      for (const c of cookies) {
        if (c.includes("UserID=")) {
          const match = c.match(/UserID=([^;]+)/);
          return match ? match[1] : "";
        }
      }
    }
    // Fallback: MXPlayer sometimes works with just a random UUID or the cookie jar implicitly
    return ""; 
  } catch (e) {
    return "";
  }
}

// Helper to construct end params
const getEndParam = (userId: string) => 
  `&device-density=2&userid=${userId}&platform=com.mxplay.desktop&content-languages=hi,en&kids-mode-enabled=false`;

export async function getPosts({
  filter,
  page = 1,
  providerContext,
}: {
  filter?: string;
  page?: number;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;
  
  const userId = await getUserID(axios);
  const endParam = getEndParam(userId);
  
  // Default to Hindi Movies if no filter
  const queryParams = filter || "browseLangFilterIds=hi&type=1";
  
  // Pagination logic from Kotlin: pageNum and pageSize
  const url = `${API_URL}/detail/browseItem?pageNum=${page}&pageSize=20&isCustomized=true&${queryParams}${endParam}`;

  try {
    const res = await axios.get(url, { headers: defaultHeaders });
    const items = res.data?.items || [];
    return items.map((item: any) => mapItemToPost(item));
  } catch (err) {
    console.error("MPlayer getPosts error", err);
    return [];
  }
}

export async function getSearchPosts({
  searchQuery,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;
  const userId = await getUserID(axios);
  const endParam = getEndParam(userId);

  const url = `${API_URL}/search/resultv2?query=${encodeURIComponent(searchQuery)}${endParam}`;

  try {
    const res = await axios.post(url, {}, { headers: defaultHeaders });
    const sections = res.data?.sections || [];
    const posts: Post[] = [];

    for (const section of sections) {
      const items = section.items || [];
      for (const item of items) {
        posts.push(mapItemToPost(item));
      }
    }
    return posts;
  } catch (err) {
    console.error("MPlayer search error", err);
    return [];
  }
}

function mapItemToPost(item: any): Post {
  // Image extraction logic
  let image = "";
  if (item.imageInfo) {
    const portrait = item.imageInfo.find((i: any) => i.type === "portrait_large");
    if (portrait && portrait.url) {
      image = IMAGE_URL + portrait.url;
    } else {
       // fallback
       image = item.imageInfo[0]?.url ? IMAGE_URL + item.imageInfo[0].url : "";
    }
  }

  return {
    title: item.title || "",
    image: image,
    // We use the shareUrl as the link, or build a web link. 
    // Kotlin passes the whole JSON, but here we pass the URL to be scraped in meta.
    link: item.shareUrl ? `${MAIN_URL}${item.shareUrl}` : "", 
  };
}