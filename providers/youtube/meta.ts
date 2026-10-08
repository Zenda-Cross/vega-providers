import { Info, ProviderContext } from "../types";

const defaultHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

function extractVideoId(link: string): string {
  const match =
    link.match(/(?:v=|\/watch\?v=|\/embed\/|\/v\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/i) ||
    link.match(/([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : link;
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;

  const videoId = extractVideoId(link);
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const res = await axios.get(watchUrl, { headers: defaultHeaders });
    const $ = cheerio.load(res.data);

    let title = $('meta[name="title"]').attr("content") || $('meta[property="og:title"]').attr("content") || $("title").text().replace(/ - YouTube$/, "").trim();
    let synopsis = $('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content") || "";
    let channel = $('link[itemprop="name"]').attr("content") || $('span[itemprop="author"] link[itemprop="name"]').attr("content") || "";
    let tags: string[] = [];
    let rating = "";

    // Parse ytInitialPlayerResponse if present
    const prMatch =
      res.data.match(/var ytInitialPlayerResponse\s*=\s*({.+?});(?:var|<\/script>)/) ||
      res.data.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);

    if (prMatch) {
      try {
        const pr = JSON.parse(prMatch[1]);
        const details = pr.videoDetails;
        if (details) {
          title = details.title || title;
          synopsis = details.shortDescription || synopsis;
          channel = details.author || channel;
          if (Array.isArray(details.keywords)) {
            tags = details.keywords.slice(0, 8);
          }
          if (details.viewCount) {
            const views = parseInt(details.viewCount, 10);
            if (!isNaN(views)) {
              rating = `${(views / 1000000).toFixed(1)}M views`;
            }
          }
        }
      } catch {
        // ignore JSON parse error
      }
    }

    // High quality landscape image (16:9)
    const landscapeImage = `https://i.ytimg.com/vi/${videoId}/hq720.jpg`;
    const fallbackImage = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return {
      title: title || "YouTube Video",
      synopsis,
      image: landscapeImage || fallbackImage,
      poster: landscapeImage || fallbackImage,
      imdbId: "",
      type: "movie",
      cast: channel ? [channel] : undefined,
      tags: tags.length > 0 ? tags : undefined,
      rating: rating || undefined,
      linkList: [
        {
          title: "Watch Video",
          quality: "HD",
          directLinks: [
            {
              title: "Play Video",
              link: `https://www.youtube.com/watch?v=${videoId}`,
              type: "movie",
              image: landscapeImage,
            },
          ],
        },
      ],
      webUrl: watchUrl,
    };
  } catch (err) {
    console.error("YouTube getMeta error:", err);
    const landscapeImage = `https://i.ytimg.com/vi/${videoId}/hq720.jpg`;
    return {
      title: "YouTube Video",
      synopsis: "",
      image: landscapeImage,
      poster: landscapeImage,
      imdbId: "",
      type: "movie",
      linkList: [
        {
          title: "Watch Video",
          quality: "HD",
          directLinks: [
            {
              title: "Play Video",
              link: `https://www.youtube.com/watch?v=${videoId}`,
              type: "movie",
            },
          ],
        },
      ],
      webUrl: watchUrl,
    };
  }
};
