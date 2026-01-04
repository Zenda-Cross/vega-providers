import { ProviderContext } from "../types";

const API_URL = "https://api.mxplayer.in/v1/web";
const IMAGE_URL = "https://qqcdnpictest.mxplay.com/";
const ENDPOINT_URL = "https://d3sgzbosmwirao.cloudfront.net/";

const defaultHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  Referer: "https://www.mxplayer.in/",
};

interface EpisodeLink {
  title: string;
  link: string; // This will contain the JSON stringified streams or direct URL
  image?: string;
}

export const getEpisodes = async function ({
  url, // This is either a Season ID (from meta) or a Web URL (for movies)
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios } = providerContext;

  // Determine if URL is a Web URL (Movie) or ID (Season)
  const isWebUrl = url.startsWith("http");

  if (isWebUrl) {
    // --- MOVIE LOGIC ---
    // For movies, we usually need to hit the page or search API to get the stream object.
    // However, the cleanest way without re-searching is often extracting from the page state 
    // or calling the detail API if we had the ID. 
    // Let's assume we fetch the page to get the internal ID, then call detail API, 
    // OR simpy try to find the stream info in the HTML (window.initialState).
    
    // Simplification for this port: Return a single episode entry.
    // The actual stream resolution will happen in stream.ts using this URL.
    return [{
        title: "Full Movie",
        link: url, // Pass the web URL to stream.ts
        image: ""
    }];
  } 
  
  // --- TV SERIES LOGIC ---
  // Url is the Season ID (e.g. "a234...")
  const seasonId = url;
  const episodes: EpisodeLink[] = [];
  let page = 0; // MX uses pagination tokens, but Kotlin implementation uses loop logic
  let nextQuery: string | null = null;
  const userid = ""; // Cookie jar handles this usually, or empty

  const endParam = `&device-density=2&userid=${userid}&platform=com.mxplay.desktop&content-languages=hi,en&kids-mode-enabled=false`;

  // Loop to fetch all episodes in season
  do {
    let apiUrl = `${API_URL}/detail/tab/tvshowepisodes?type=season&id=${seasonId}&sortOrder=0${endParam}`;
    if (nextQuery) {
        apiUrl = `${API_URL}/detail/tab/tvshowepisodes?type=season&${nextQuery}&id=${seasonId}&sortOrder=0${endParam}`;
    }

    try {
        const res = await axios.get(apiUrl, { headers: defaultHeaders });
        const data = res.data;
        const items = data.items || [];

        for (const item of items) {
            const title = item.title || `Episode ${item.sequence}`;
            const imgPath = item.imageInfo?.[0]?.url;
            const image = imgPath ? IMAGE_URL + imgPath : "";
            
            // Extract streams directly here to pass to stream.ts
            // We serialize the 'stream' object or the necessary URLs to pass to stream.ts
            const streamData = JSON.stringify({
                stream: item.stream,
                videoHash: item.videoHash // sometimes needed
            });

            episodes.push({
                title,
                link: streamData, // We pass data, not a URL
                image
            });
        }

        nextQuery = data.next; // Pagination token
    } catch (e) {
        console.error("Error fetching episodes", e);
        break; 
    }
  } while (nextQuery);

  return episodes;
};