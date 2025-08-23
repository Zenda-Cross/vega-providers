import { ProviderContext } from "../types";

export async function getStreams(url: string, providerContext: ProviderContext) {
  try {
    const res = await providerContext.axios.get(url);
    const $ = providerContext.cheerio.load(res.data);
    const streams: { quality: string; url: string }[] = [];

    $(".video-embed iframe").each((i, el) => {
      const src = $(el).attr("src") || "";
      const quality = "HD";
      if (src) streams.push({ quality, url: src });
    });

    return streams;
  } catch (err) {
    console.error("HDMovie2 getStreams error:", err);
    return [];
  }
}

