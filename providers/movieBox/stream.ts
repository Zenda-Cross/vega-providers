import { Stream, ProviderContext, EpisodeLink } from "../types";

export const getStream = async function ({
  link: url,
  type,
  providerContext,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, cheerio } = providerContext;
  try {
    const stream: Stream[] = [];
    const data = JSON.parse(url);
    stream.push({
      link: data.url,
      server: data.title || "Unknown Server",
      type: "mp4",
    });
    console.log("stream", stream);
    return stream;
  } catch (err) {
    console.log("getStream error", err);
    return [];
  }
};
