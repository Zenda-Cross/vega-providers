import { ProviderContext, Stream } from "../types";
import { getStream as vegaGetStream } from "../vega/stream";

export async function getStream({
  link,
  type,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  const { axios, commonHeaders } = providerContext;

  if (link.includes("fastdl")) {
    try {
      const res = await axios.get(link, {
        signal,
        headers: {
          ...commonHeaders,
          Referer: link,
        },
      });
      const text =
        typeof res.data === "string" ? res.data : JSON.stringify(res.data);
      const reurlMatch = text.match(/var\s+reurl\s*=\s*"([^"]+)";/i);
      if (reurlMatch) {
        let directLink = reurlMatch[1];
        if (directLink.includes("link=")) {
          directLink = directLink.split("link=").slice(1).join("link=");
        }
        if (
          directLink.startsWith("http%3A") ||
          directLink.startsWith("https%3A")
        ) {
          directLink = decodeURIComponent(directLink);
        }
        if (directLink.startsWith("http")) {
          return [
            {
              server: "FastDL",
              link: directLink,
              type: "mkv",
            },
          ];
        }
      }
    } catch (e) {
      console.warn("FastDL extraction failed, falling back to vega stream", e);
    }
  }

  return vegaGetStream({
    link,
    type,
    signal,
    providerContext,
    isDownload,
  });
}

