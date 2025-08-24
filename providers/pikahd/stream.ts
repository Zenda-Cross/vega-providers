import { Stream, ProviderContext } from "../types";

export async function getStream({
  link,
  type,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    const res = await providerContext.axios.get(link, { signal });
    const $ = providerContext.cheerio.load(res.data || "");
    const streams: Stream[] = [];

    $("iframe").each((i: number, el: any) => {
      const src = $(el).attr("src") || "";
      if (!src) return;
      streams.push({ server: "iframe", link: src, type });
    });

    return streams;
  } catch (err) {
    console.error("pikahd getStream error:", err);
    return [];
  }
}
