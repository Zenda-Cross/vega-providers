import { Stream, ProviderContext } from "../types";

const ENDPOINT_URL = "https://d3sgzbosmwirao.cloudfront.net/";
const API_URL = "https://api.mxplayer.in/v1/web";

export const getStream = async function ({
  link,
  type,
  providerContext,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios } = providerContext;
  const streamLinks: Stream[] = [];

  let streamObj: any = null;

  // Case 1: TV Series (JSON string passed from episodes.ts)
  if (link.startsWith("{")) {
    try {
        const data = JSON.parse(link);
        streamObj = data.stream;
    } catch (e) {
        console.error("Failed to parse stream data");
    }
  } 
  // Case 2: Movie (Web URL passed)
  else if (link.startsWith("http")) {
    // We need to fetch the stream info for the movie URL
    // Strategy: Scrape ID from URL, then call detail API
    // URL format: https://www.mxplayer.in/movie/movie-name-id-xyz
    try {
        const idMatch = link.match(/-id-([a-zA-Z0-9]+)/);
        if (idMatch && idMatch[1]) {
            const id = idMatch[1];
            // Fetch detail
             const endParam = `&device-density=2&userid=&platform=com.mxplay.desktop&content-languages=hi,en&kids-mode-enabled=false`;
            const apiUrl = `${API_URL}/detail/video/${id}?${endParam}`;
            const res = await axios.get(apiUrl, { 
                headers: { Referer: "https://www.mxplayer.in/" } 
            });
            streamObj = res.data?.stream;
        }
    } catch (e) {
        console.error("Error resolving movie stream", e);
    }
  }

  // --- Extract URLs from streamObj ---
  if (streamObj) {
     const extract = (obj: any, label: string) => {
         if (!obj) return;
         // MXPlayer structures: hls: { main, base, high }, dash: ...
         const qualities = ["high", "base", "main"];
         qualities.forEach(q => {
             const url = obj[q];
             if (url) {
                 streamLinks.push({
                     server: `MX ${label} ${q}`,
                     link: normalizeUrl(url),
                     type: label === "hls" ? "m3u8" : "dash",
                     headers: {
                        Referer: "https://www.mxplayer.in/"
                     }
                 });
             }
         });
     };

     // Direct streams
     if (streamObj.hls) extract(streamObj.hls, "hls");
     if (streamObj.dash) extract(streamObj.dash, "dash");

     // Third party
     if (streamObj.thirdParty) {
         if (streamObj.thirdParty.hlsUrl) {
             streamLinks.push({
                 server: "ThirdParty HLS",
                 link: normalizeUrl(streamObj.thirdParty.hlsUrl),
                 type: "m3u8"
             });
         }
         if (streamObj.thirdParty.dashUrl) {
            streamLinks.push({
                server: "ThirdParty DASH",
                link: normalizeUrl(streamObj.thirdParty.dashUrl),
                type: "dash"
            });
        }
     }
     
     // MXPlay specific
     if (streamObj.mxplay) {
        if (streamObj.mxplay.hls) extract(streamObj.mxplay.hls, "hls");
        if (streamObj.mxplay.dash) extract(streamObj.mxplay.dash, "dash");
     }
  }

  return streamLinks;
};

// Logic from Kotlin: private val endpointurl="https://d3sgzbosmwirao.cloudfront.net/"
function normalizeUrl(url: string): string {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return ENDPOINT_URL + url;
}