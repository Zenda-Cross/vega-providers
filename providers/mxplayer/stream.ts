import { ProviderContext, Stream } from "../types";

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


export const getStream = async function ({
  link,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    const { axios } = providerContext;
    const parts = link.split("*");
    const id = parts[0];
    const type = parts[1] || "episode";

    const url = `https://api.mxplayer.in/v1/web/detail/video?id=${id}&type=${type}&platform=com.mxplay.desktop&userid=${getUserId()}&device-density=2&content-languages=hi,en&kids-mode-enabled=false`;
    const headers = {
      "User-Agent": USER_AGENT,
      "Referer": "https://www.mxplayer.in/",
      "Origin": "https://www.mxplayer.in",
    };

    const res = await axios.get(url, { headers });
    const videoData = res.data || {};
    const stream = videoData.stream || {};

    const hlsData = stream.hls || {};
    const dashData = stream.dash || {};
    const thirdParty = stream.thirdParty || {};
    const altBalaji = stream.altBalaji || {};
    const mxplay = stream.mxplay || {};

    let hls = hlsData.high || hlsData.base || hlsData.main ||
              thirdParty.hlsUrl || altBalaji.hlsUrl ||
              (mxplay.hls || {}).high;
              
    if (hls && !hls.startsWith("http")) {
      hls = `https://d3sgzbosmwirao.cloudfront.net/${hls}`;
    }

    let dash = dashData.high || dashData.base || dashData.main ||
               thirdParty.dashUrl || altBalaji.dashUrl ||
               (mxplay.dash || {}).high;

    if (dash && !dash.startsWith("http")) {
      dash = `https://d3sgzbosmwirao.cloudfront.net/${dash}`;
    }

    const streamsList: Stream[] = [];

    if (hls) {
      streamsList.push({
        server: "MXPlayer-HLS",
        link: hls,
        type: "m3u8",
      });
    }

    if (dash) {
      streamsList.push({
        server: "MXPlayer-DASH",
        link: dash,
        type: "mpd",
      });
    }

    return streamsList;
  } catch (err) {
    console.error("MXPlayer getStream error:", err);
    return [];
  }
};
