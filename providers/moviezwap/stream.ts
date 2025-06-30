import { ProviderContext, Stream } from "../types";

export async function getStream({
  link,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}) {
  const { axios, cheerio, commonHeaders: headers } = providerContext;
  const res = await axios.get(link, { headers, signal });
  const html = res.data;
  const $ = cheerio.load(html);
  const Streams: Stream[] = [];

  // Find the actual .mp4 download link
  let downloadLink = null;
  $('a:contains("Fast Download Server")').each((i, el) => {
    const href = $(el).attr("href");
    if (href && href.toLocaleLowerCase().includes(".mp4")) {
      Streams.push({
        link: href,
        type: "mp4",
        server: "Fast Download",
        headers: headers,
      });
    }
  });

  return Streams;
}
