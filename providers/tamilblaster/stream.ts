import { ProviderContext, Stream } from "../types";

const STREAM_HG = "https://tryzendm.com";
const CAVANHA_BG = "https://cavanhabg.com";

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
  Accept: "*/*",
};

export async function getStream({
  link,
  signal,
  providerContext,
}: {
  link: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios } = providerContext;

  try {
    let iframeUrl = link;

    // =========================
    // ✅ HG rewrite (old logic)
    // =========================
    if (iframeUrl.includes("hglink.to")) {
      const id = iframeUrl.split("/e/")[1];
      iframeUrl = `${CAVANHA_BG}/e/${id}`;
    }

    if (iframeUrl.includes("hg")) {
      const part = iframeUrl.split("/e")[1];
      iframeUrl = `${STREAM_HG}/e/${part}`;
    }

    // =========================
    // 1️⃣ Load iframe page
    // =========================
    const res = await axios.get(iframeUrl, {
      signal,
      headers: {
        ...COMMON_HEADERS,
        Referer: iframeUrl,
      },
    });

    const html = res.data as string;
    let m3u8: string | null = null;

    // =========================
    // 2️⃣ Direct m3u8 (if exists)
    // =========================
    const directMatch =
      html.match(/https?:\/\/[^"' ]+\.m3u8[^"' ]*/i);

    if (directMatch) {
      m3u8 = directMatch[0];
    }

    // =================================================
    // 3️⃣ cavanhabg JS/XHR based stream extraction
    // =================================================
    if (!m3u8 && iframeUrl.includes("cavanhabg.com")) {
      const idMatch = iframeUrl.match(/\/e\/([a-zA-Z0-9]+)/);
      const tokenMatch = html.match(/stream\/([A-Za-z0-9_-]+)\//);
      const expiryMatch = html.match(/\/(\d{10})\/\d+\/master\.m3u8/);

      if (idMatch && tokenMatch && expiryMatch) {
        const id = idMatch[1];
        const token = tokenMatch[1];
        const expires = expiryMatch[1];

        // same format as Network tab
        m3u8 = `${CAVANHA_BG}/stream/${token}/kjhhiuahiuhgihdf/${expires}/${id}/master.m3u8`;
      }
    }

    if (!m3u8) {
      console.log("❌ No m3u8 found");
      return [];
    }

    // =========================
    // 4️⃣ Return playable HLS
    // =========================
   return [
  {
    server: "CavanhaBG",
    link: m3u8,
    type: "hls",
    headers: {
      Referer: iframeUrl, // 🔥 MUST
      Origin: "https://cavanhabg.com",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br",
    },
  },
];
  } catch (err) {
    console.log("getStream error:", err);
    return [];
  }
}
