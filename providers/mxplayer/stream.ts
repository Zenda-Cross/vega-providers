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

  // ===============================
  // CASE 1: TV / Episode (JSON link)
  // ===============================
  if (link.startsWith("{")) {
    try {
      const data = JSON.parse(link);
      streamObj = data.stream;
    } catch (e) {
      console.error("Failed to parse stream JSON");
    }
  }

  // ===============================
  // CASE 2: MOVIE (MX Player URL)
  // ===============================
  else if (link.startsWith("http") && link.includes("mxplayer.in")) {
    try {
      // ✔ Extract ID from URL
      // https://www.mxplayer.in/detail/movie/<ID>
      const idMatch = link.match(/movie\/([a-zA-Z0-9]+)/);
      if (idMatch && idMatch[1]) {
        const id = idMatch[1];

        const apiUrl =
          `${API_URL}/detail/tab/movierecommended?type=movie&id=${id}`;

        const res = await axios.get(apiUrl, {
          headers: {
            Referer: "https://www.mxplayer.in/",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          },
        });

        // ✔ items[0].stream
        streamObj = res.data?.items?.[0]?.stream || null;
      }
    } catch (e) {
      console.error("MX Movie API error", e);
    }
  }

  // ===============================
  // STREAM EXTRACTION (COMMON)
  // ===============================
  if (streamObj) {
    const extract = (obj: any, label: string) => {
      if (!obj) return;

      ["high", "base", "main"].forEach((q) => {
        const url = obj[q];
        if (url) {
          streamLinks.push({
            server: `MX ${label.toUpperCase()} ${q}`,
            link: normalizeUrl(url),
            type: label === "hls" ? "m3u8" : "dash",
            headers: {
              Referer: "https://www.mxplayer.in/",
            },
          });
        }
      });
    };

    // Direct
    if (streamObj.hls) extract(streamObj.hls, "hls");
    if (streamObj.dash) extract(streamObj.dash, "dash");

    // MXPlay nested
    if (streamObj.mxplay) {
      if (streamObj.mxplay.hls) extract(streamObj.mxplay.hls, "hls");
      if (streamObj.mxplay.dash) extract(streamObj.mxplay.dash, "dash");
    }

    // Third-party (safety)
    if (streamObj.thirdParty) {
      if (streamObj.thirdParty.hlsUrl) {
        streamLinks.push({
          server: "ThirdParty HLS",
          link: normalizeUrl(streamObj.thirdParty.hlsUrl),
          type: "m3u8",
        });
      }
      if (streamObj.thirdParty.dashUrl) {
        streamLinks.push({
          server: "ThirdParty DASH",
          link: normalizeUrl(streamObj.thirdParty.dashUrl),
          type: "dash",
        });
      }
    }
  }

  return streamLinks;
};

// ===============================
// URL NORMALIZER
// ===============================
function normalizeUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return ENDPOINT_URL + url;
}
