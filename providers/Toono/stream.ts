import { Stream, ProviderContext, TextTracks } from "../types";

// Define the expected structure for the API response.
type ZephyrFlickApiResponse = { 
  [quality: string]: string; // e.g., "720p": "https://..."
} | string;

export const getStream = async function ({
  link: url,
  providerContext,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios } = providerContext;
  const streamLinks: Stream[] = [];

  // 1. Extract the unique 'data' parameter (the video ID/hash) from the initial URL
  // Example: https://play.zephyrflick.top/video/d8e786d674ada58984bf0a2e32807381
  const dataMatch = url.match(/\/video\/([a-fA-F0-9]+)/);
  const dataId = dataMatch ? dataMatch[1] : null;

  if (!dataId) {
    console.error("Could not extract data ID from the link:", url);
    return [];
  }

  // 2. Construct the direct API request URL (The URL remains a GET-style URL)
  const urlParts = url.split('/');
  const baseUrl = urlParts.slice(0, 3).join('/');
  
  // The API URL requires the 'data' parameter in the URL query string
  const apiUrl = `${baseUrl}/player/index.php?data=${dataId}&do=getVideo`;

  // 3. Define the REQUIRED Headers and POST Body
  const headers = {
    // Crucial headers from the provided information
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9,en-IN;q=0.8",
    "cache-control": "no-cache",
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8", // IMPORTANT
    "pragma": "no-cache",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "x-requested-with": "XMLHttpRequest",
    
    // Use the link's base URL as the Referer
    "Referer": url, 
    
    // While the exact browser user-agent and cookie might change, these are good starting points:
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    "cookie": "fireplayer_player=tlare70v164jv3taph4r8v4qer; ext_name=ojplmecpdpgccookcobabopnaifgidhf"
  };

  // The POST body containing the 'hash' (which is the dataId)
  const postBody = `hash=${dataId}&r=`; 

  try {
    // 4. Make the POST request to the API (The critical change)
    console.log("Fetching player data via POST from:", apiUrl);
    
    // axios POST with the URL-encoded body and headers
    const apiRes = await axios.post<ZephyrFlickApiResponse>(apiUrl, postBody, {
      headers,
    });

    const responseData = apiRes.data;
    let streamUrl: string | undefined;

    // 5. Parse the response data to find the M3U8 link
    
    if (typeof responseData === 'string') {
        // If the response is a simple string, use regex to find the M3U8 link
        const urlMatch = responseData.match(/https?:\/\/[^\s"]+\.m3u8[^\s"]*/);
        streamUrl = urlMatch ? urlMatch[0] : undefined;
    } else if (typeof responseData === 'object' && responseData !== null) {
        // If it's a JSON object, check common keys ('source', 'file', or object values)
        const keysToCheck = ["source", "file"];
        
        for (const key of keysToCheck) {
            // Check for direct key match
            if (typeof responseData[key] === 'string' && responseData[key].includes('.m3u8')) {
                streamUrl = responseData[key];
                break;
            }
        }
        
        // Fallback: Check if any of the object's values is the stream link
        if (!streamUrl) {
             const values = Object.values(responseData);
             for(const value of values) {
                 if (typeof value === 'string' && value.includes('.m3u8')) {
                     streamUrl = value;
                     break;
                 }
             }
        }
    }

    if (streamUrl) {
      console.log("Found stream URL:", streamUrl);
      streamLinks.push({
        server: "toon", 
        link: streamUrl,
        type: "m3u8",
        subtitles: [],
      });
    } else {
      console.log("M3U8 link not found in API response. Response Data was:", responseData);
    }

    return streamLinks;
  } catch (err) {
    console.error("Error fetching Zephyrflick stream:", err);
    return [];
  }
};