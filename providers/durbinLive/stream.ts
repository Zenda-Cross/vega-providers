import { ProviderContext, Stream, StreamDrm } from "../types";
import { absolute, getBase, getPage, headers } from "./api";
import { throwProviderError } from "../providerErrors";

function mediaType(url: string): string | undefined {
  const path = new URL(url).pathname.toLowerCase();
  return path.endsWith(".m3u8") ? "m3u8" : path.endsWith(".mpd") ? "mpd" : path.endsWith(".mp4") ? "mp4" : undefined;
}

// Decode the player's public XOR wrapper without evaluating remote JavaScript.
function unwrapScript(script: string): string {
  const key = script.match(/decryptionKey\s*=\s*["']([^"']+)["']/)?.[1];
  const encoded = script.match(/(?:let|var|const)\s+encrypted\s*=\s*["']([A-Za-z0-9+/=\s]+)["']/)?.[1];
  if (!key || !encoded) return script;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let value = 0, bits = 0, index = 0;
  const result: string[] = [];
  for (const c of encoded.replace(/[\s=]/g, "")) {
    const digit = alphabet.indexOf(c);
    if (digit < 0) throw new Error("Invalid DurbinLive player encoding");
    value = (value << 6) | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      result.push(String.fromCharCode(((value >>> bits) & 255) ^ key.charCodeAt(index++ % key.length)));
    }
  }
  return result.join("");
}

function readClearKey(script: string): StreamDrm | undefined {
  const block = script.match(/clearKeys\s*:\s*\{([^}]+)\}/)?.[1];
  if (!block) return undefined;
  const variable = (name: string | undefined): string | undefined => {
    if (!name || !/^[\w$]+$/.test(name)) return undefined;
    const escaped = name.replace(/\$/g, "\\$");
    return script.match(new RegExp(`(?:const|let|var)\\s+${escaped}\\s*=\\s*["']([a-f0-9]{32})["']`, "i"))?.[1];
  };
  const clearKeys: Record<string, string> = {};
  for (const pair of block.split(",").map(value => value.trim()).filter(Boolean)) {
    const entry = pair.match(/^(?:["']([a-f0-9]{32})["']|\[([\w$]+)\]|([\w$]+))\s*:\s*(?:["']([a-f0-9]{32})["']|([\w$]+))$/i);
    if (!entry) return undefined;
    const id = entry[1] || variable(entry[2] || entry[3]);
    const key = entry[4] || variable(entry[5]);
    // Never pass incomplete key maps or encrypted manifests without valid DRM.
    if (!id || !key) return undefined;
    clearKeys[id.toLowerCase()] = key.toLowerCase();
  }
  return Object.keys(clearKeys).length ? { type: "clearkey", clearKeys } : undefined;
}

export async function getStream({ link, signal, providerContext, isDownload }: {
  link: string; type?: string; signal?: AbortSignal; providerContext: ProviderContext; isDownload?: boolean;
}): Promise<Stream[]> {
  try {
    const base = await getBase(providerContext);
    const streams: Stream[] = [];
    const seen = new Set<string>();
    const visited = new Set<string>();
    let drm = false;
    let lastError: unknown;
    const add = (url: string, referer: string, streamDrm?: StreamDrm) => {
      const type = mediaType(url);
      if (!type || seen.has(url) || (streamDrm && isDownload)) return;
      seen.add(url);
      streams.push({ server: `DurbinLive ${type === "m3u8" ? "HLS" : type === "mpd" ? "DASH" : "Video"}`, link: url, type, headers: headers(providerContext, referer), ...(streamDrm ? { drm: streamDrm } : {}) });
    };

    async function resolve(url: string, referer: string, depth: number): Promise<void> {
      if (signal?.aborted) throw new Error("DurbinLive request cancelled");
      if (visited.has(url) || depth > 4 || visited.size >= 10) return;
      visited.add(url);
      if (mediaType(url)) { add(url, referer); return; }
      const parsed = new URL(url);
      // Some iframe players put the public HLS source in a query parameter.
      for (const key of ["url", "src", "source"]) {
        const candidate = parsed.searchParams.get(key);
        if (candidate && /^https?:\/\//i.test(candidate) && mediaType(candidate)) {
          add(candidate, url);
          return;
        }
      }
      const html = await getPage(url, providerContext, referer, signal);
      const $ = providerContext.cheerio.load(html);
      const scripts = $("script:not([src])").map((_, e) => unwrapScript($(e).html() || "")).get();
      // Read the current page on every playback; never cache or log its keys.
      const pageDrm = scripts.map(readClearKey).find(value => value !== undefined);
      const protectedPlayer = scripts.some(s => /clearKeys\s*:|com\.widevine|licenseServers?\s*:|drm\s*:\s*\{/i.test(s));
      if (protectedPlayer) drm = true;
      if (!protectedPlayer || pageDrm) {
        $("video[src], source[src]").each((_, e) => {
          const src = $(e).attr("src");
          if (src) add(absolute(src, url), url, pageDrm);
        });
        for (const script of scripts) {
          const text = script.replace(/\\\//g, "/").replace(/\\u0026/g, "&");
          for (const match of text.matchAll(/["']((?:https?:\/\/|\/\/|\/)[^"'<>\s]+?\.(?:m3u8|mpd|mp4)(?:\?[^"'<>\s]*)?)["']/gi)) {
            add(absolute(match[1], url), url, pageDrm);
          }
        }
      }
      const frames = $("iframe[src]").map((_, e) => $(e).attr("src") || "").get().filter(src => src && !/doubleclick|googlesyndication/i.test(src)).slice(0, 4);
      for (const frame of frames) {
        try { await resolve(absolute(frame, url), url, depth + 1); }
        catch (error) { if (signal?.aborted) throw error; lastError = error; }
      }
    }

    await resolve(absolute(link, base).replace(/\/(livetv|sports)\/details\//, "/$1/watch/"), `${base}/`, 0);
    if (!streams.length) {
      if (drm && isDownload) return [];
      if (drm) throw new Error("Could not read a supported DRM configuration for this DurbinLive player");
      if (lastError) throw lastError;
      throw new Error("No accessible live stream was found for this DurbinLive channel");
    }
    return streams.sort((a, b) => isDownload
      ? Number(b.type === "mp4") - Number(a.type === "mp4")
      : Number(b.type === "m3u8") - Number(a.type === "m3u8"));
  } catch (error) {
    throwProviderError("DurbinLive", "stream", error);
  }
}
