import { Post, ProviderContext } from "../types";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

let cachedUserId: string | null = null;

const getUserId = () => {
  if (!cachedUserId) {
    cachedUserId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  return cachedUserId;
};


const parseImage = (imageInfo: any[]): string => {
  if (!imageInfo || imageInfo.length === 0) return "";
  const landscape = imageInfo.find((img: any) => img.type === "landscape");
  const path = landscape ? landscape.url : imageInfo[0].url;
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `https://isa-1.mxplay.com/${path}`;
};

export const getPosts = async function ({
  filter,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    const { axios } = providerContext;
    const url = `https://api.mxplayer.in/v1/web${filter}?pageSize=20&platform=com.mxplay.desktop&userid=${getUserId()}&device-density=2&content-languages=hi,en&kids-mode-enabled=false`;
    
    const headers = {
      "User-Agent": USER_AGENT,
      "Referer": "https://www.mxplayer.in/",
      "Origin": "https://www.mxplayer.in",
    };

    const res = await axios.get(url, { headers });
    const sections = res.data?.sections || res.data?.data?.sections || [];
    const postsList: Post[] = [];

    sections.forEach((sec: any) => {
      const items = sec.items || [];
      items.forEach((item: any) => {
        const title = item.title;
        const link = `${item.id}*${item.type}*${item.webUrl || ""}`;
        const image = parseImage(item.imageInfo);
        
        if (title && item.id) {
          postsList.push({
            title,
            link,
            image,
          });
        }
      });
    });

    return postsList;
  } catch (err) {
    console.error("MXPlayer getPosts error:", err);
    return [];
  }
};

export const getSearchPosts = async function ({
  searchQuery,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    const { axios } = providerContext;
    const url = `https://api.mxplayer.in/v1/web/search/resultv2?query=${encodeURIComponent(searchQuery)}&platform=com.mxplay.desktop&userid=${getUserId()}&device-density=2&content-languages=hi,en&kids-mode-enabled=false`;
    
    const headers = {
      "User-Agent": USER_AGENT,
      "Referer": "https://www.mxplayer.in/",
      "Origin": "https://www.mxplayer.in",
    };

    const res = await axios.post(url, {}, { headers });
    const sections = res.data?.sections || res.data?.data?.sections || [];
    const postsList: Post[] = [];

    sections.forEach((sec: any) => {
      const items = sec.items || [];
      items.forEach((item: any) => {
        const title = item.title;
        const link = `${item.id}*${item.type}*${item.webUrl || ""}`;
        const image = parseImage(item.imageInfo);
        
        if (title && item.id) {
          postsList.push({
            title,
            link,
            image,
          });
        }
      });
    });

    return postsList;
  } catch (err) {
    console.error("MXPlayer getSearchPosts error:", err);
    return [];
  }
};
