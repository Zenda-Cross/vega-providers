import { ProviderContext } from "../types";

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

  // Find the actual .mp4 download link
  let downloadLink = null;
  $('a[href$=".mp4"]').each((i, el) => {
    const href = $(el).attr("href");
    if (href && href.endsWith(".mp4")) {
      downloadLink = href;
      return false;
    }
  });

  return downloadLink ? [{ url: downloadLink }] : [];
}
