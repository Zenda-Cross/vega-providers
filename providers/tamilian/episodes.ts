import { ProviderContext } from "../types";

interface VideoLink {
  title: string;
  link: string;
}

// 🌍 CORS PROXY
const withProxy = (url: string) =>
  "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<VideoLink[]> {
  const { axios, cheerio, commonHeaders: headers } = providerContext;

  if (!url || !url.includes("watching.html")) {
    console.warn("❌ Not a watch link:", url);
    return [];
  }

  try {
    console.log("▶️ Fetching WATCH video from:", url);

    const res = await axios.get(withProxy(url), { headers });
    const $ = cheerio.load(res.data || "");

    // ✅ ONLY iframe-embed
    const videoSrc =
      $("#iframe-embed").attr("src") ||
      $("#iframe-embed").attr("data-src");

    if (!videoSrc) {
      console.warn("❌ No video iframe found");
      return [];
    }

    return [
      {
        title: "Play",
        link: videoSrc, // ✅ DIRECT VIDEO LINK
      },
    ];
  } catch (err) {
    console.error("❌ Episodes fetch error:", err);
    return [];
  }
};
