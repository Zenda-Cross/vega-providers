import { Stream, ProviderContext, TextTracks } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { decryptVidbasicAes } from "./aes";

const DEFAULT_BASE_URL = "https://asianc.id";

async function resolveBaseUrl(
  providerContext?: ProviderContext
): Promise<string> {
  try {
    if (
      providerContext &&
      typeof (providerContext as any).getBaseUrl === "function"
    ) {
      const resolved =
        (await (providerContext as any).getBaseUrl("dramacool")) ||
        (await (providerContext as any).getBaseUrl("asianc"));
      if (resolved) {
        return resolved.replace(/\/+$/, "");
      }
    }
  } catch {}
  try {
    const resolved =
      (await getBaseUrl("dramacool")) || (await getBaseUrl("asianc"));
    if (resolved) {
      return resolved.replace(/\/+$/, "");
    }
  } catch {}
  return DEFAULT_BASE_URL;
}

function resolveFullUrl(path: string, base: string): string {
  if (path.startsWith("http")) return path;
  if (path.startsWith("//")) return `https:${path}`;
  return `${base.replace(/\/+$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function extractVidbasicPlayer(
  playerUrl: string,
  embedUrl: string,
  providerContext: ProviderContext,
  signal?: AbortSignal
): Promise<Stream | null> {
  const { axios, cheerio } = providerContext;
  const playerRes = await axios.get(playerUrl, {
    headers: {
      Referer: embedUrl,
      Origin: "https://vidbasic.top",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    },
    signal,
    timeout: 10000,
  });

  const $player = cheerio.load(playerRes.data);
  const cryptoData =
    $player("script[data-name='crypto']").attr("data-value") || "";

  if (!cryptoData) {
    return null;
  }

  const streamUrl = await decryptVidbasicAes(cryptoData);
  if (!streamUrl || !streamUrl.startsWith("http")) {
    return null;
  }

  const subtitles: TextTracks = [];
  try {
    const parsedPlayer = new URL(playerUrl);
    const subParam = parsedPlayer.searchParams.get("sub");
    if (subParam) {
      const subUrl = await decryptVidbasicAes(decodeURIComponent(subParam));
      if (subUrl && subUrl.startsWith("http")) {
        subtitles.push({
          title: "English",
          language: "en",
          type: "text/vtt",
          uri: subUrl,
        });
      }
    }
  } catch {}

  const isM3u8 = streamUrl.includes(".m3u8");
  return {
    server: "Standard Server (VidBasic)",
    link: streamUrl,
    type: isM3u8 ? "m3u8" : "mp4",
    quality: "auto",
    subtitles,
    headers: {
      Referer: "https://vidbasic.top/",
      Origin: "https://vidbasic.top",
    },
  };
}

export const getStream = async function ({
  link,
  signal,
  providerContext,
}: {
  link: string;
  type?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  try {
    const { axios, cheerio, commonHeaders } = providerContext;
    const baseUrl = await resolveBaseUrl(providerContext);
    const streamLinks: Stream[] = [];

    const headers = {
      ...(commonHeaders || {}),
      Referer: `${baseUrl}/`,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    };

    let embedUrl = "";
    if (link.includes("/embed/") || link.includes("vidbasic.top")) {
      embedUrl = link;
    } else {
      const episodeUrl = resolveFullUrl(link, baseUrl);
      const epRes = await axios.get(episodeUrl, {
        headers,
        signal,
        timeout: 10000,
      });
      const $ep = cheerio.load(epRes.data);
      const iframeSrc = $ep("iframe").first().attr("src") || "";
      if (iframeSrc) {
        embedUrl = resolveFullUrl(iframeSrc, "https://vidbasic.top");
      }
    }

    if (!embedUrl) {
      return [];
    }

    const embedRes = await axios.get(embedUrl, {
      headers: {
        ...headers,
        Referer: `${baseUrl}/`,
        Origin: baseUrl,
      },
      signal,
      timeout: 10000,
    });

    const $embed = cheerio.load(embedRes.data);

    // 1. Try Standard Server via 3rdplayer.html
    const standardLi = $embed(
      "li[data-video*='3rdplayer'], a[data-video*='3rdplayer']"
    ).first();
    let playerPath = standardLi.attr("data-video") || "";

    if (!playerPath) {
      $embed("li[data-video], a[data-video]").each((_, el) => {
        const dv = $embed(el).attr("data-video") || "";
        if (dv.includes("3rdplayer") && !playerPath) {
          playerPath = dv;
        }
      });
    }

    if (playerPath) {
      const playerUrl = resolveFullUrl(playerPath, "https://vidbasic.top");
      const standardStream = await extractVidbasicPlayer(
        playerUrl,
        embedUrl,
        providerContext,
        signal
      );
      if (standardStream) {
        streamLinks.push(standardStream);
      }
    }

    // 2. Check other servers if available as fallbacks
    $embed("li[data-video], a[data-video]").each((_, el) => {
      const serverName = $embed(el).text().trim() || "Server";
      const dv = $embed(el).attr("data-video") || "";
      if (dv && !dv.includes("3rdplayer")) {
        const targetUrl = resolveFullUrl(dv, "https://vidbasic.top");
        const isDirect =
          targetUrl.includes(".m3u8") || targetUrl.includes(".mp4");
        if (isDirect) {
          streamLinks.push({
            server: serverName,
            link: targetUrl,
            type: targetUrl.includes(".m3u8") ? "m3u8" : "mp4",
            quality: "auto",
            headers: {
              Referer: embedUrl,
            },
          });
        }
      }
    });

    return streamLinks;
  } catch (err) {
    console.error("dramacool getStream error:", err);
    return [];
  }
};
