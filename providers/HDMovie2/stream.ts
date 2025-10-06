import { ProviderContext, Stream } from "../types";

const headers = {
  // Simplified headers for better performance and reduced payload
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

// Function to handle the Gdflix/PixelDrain extraction
async function gdflixExtractor(
  link: string,
  axios: ProviderContext["axios"],
  cheerio: ProviderContext["cheerio"],
  signal: AbortSignal
): Promise<Stream[]> {
  const streamLinks: Stream[] = [];
  try {
    const gdflixRes = await axios.get(link, { headers, signal });
    const $ = cheerio.load(gdflixRes.data);

    // Look for the specific PixelDrain download button
    const pixelDrainEl = $('a[href*="pixeldrain.dev/api/file/"]');
    const pixelDrainLink = pixelDrainEl.attr('href');
    // Extract button text for the title, cleaning up bracketed text like [20MB/s]
    const title = pixelDrainEl.text().trim().replace(/\s*\[.*\]/i, '').replace(/\s*DL/i, ' Download');

    if (pixelDrainLink) {
      streamLinks.push({
        server: "PixelDrain",
        link: pixelDrainLink, 
        type: "mp4", 
      });
    } else {
      console.log("PixelDrain link not found on Gdflix page.");
    }
  } catch (error) {
    console.error("Gdflix extraction error:", error instanceof Error ? error.message : String(error));
  }
  return streamLinks;
}

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
  const { axios, cheerio, extractors } = providerContext;
  const { hubcloudExtracter } = extractors;

  try {
    // 1. Check if the link is a Gdflix link and use the new extractor
    if (link.includes("gdflix.dev")) {
      console.log("Using Gdflix/PixelDrain extraction logic for:", link);
      return await gdflixExtractor(link, axios, cheerio, signal);
    }

    // 2. Otherwise, assume it's a Hubcloud (or generic) link and use the dedicated extractor
    console.log("Using Hubcloud extraction logic for:", link);
    return await hubcloudExtracter(link, signal);

  } catch (error: any) {
    console.log("getStream error: ", error instanceof Error ? error.message : String(error));
    if (error.message.includes("Aborted")) {
      console.log("Request aborted by user.");
    }
    return [];
  }
}