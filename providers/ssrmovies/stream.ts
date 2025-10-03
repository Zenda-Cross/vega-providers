import { ProviderContext, Stream } from "../types";

// Headers remain the same
const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Cache-Control": "no-store",
  "Accept-Language": "en-US,en;q=0.9",
  DNT: "1",
  "sec-ch-ua":
    '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  Cookie:
    "xla=s4t; _ga=GA1.1.1081149560.1756378968; _ga_BLZGKYN5PF=GS2.1.s1756378968$o1$g1$t1756378984$j44$l0$h0",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

/**
 * Fetches stream links for a given movie or show episode.
 * It is optimized to find and use the hubcloud.one link if available on the redirection page.
 */
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
    console.log("Initial dotlink:", link);

    if (type === "movie") {
      // Fetch the content of the initial link (the 'dotlink' page)
      const dotlinkRes = await axios(`${link}`, { headers, signal });
      const dotlinkText = dotlinkRes.data;

      const $ = cheerio.load(dotlinkText);
      
      // Attempt to find the specific hubcloud.one link using Cheerio
      // This is based on the HTML structure provided in the request
      const hubcloudLink = $('a[href*="hubcloud.one"]').attr('href');

      if (hubcloudLink) {
        // Update the link to the direct Hubcloud URL
        link = hubcloudLink;
        console.log('Updated link to Hubcloud:', link);
      } else {
        // Fallback: If no hubcloud.one link is found, use the original generic cloud link regex logic
        // The original code was using this as the primary method to find a 'vlink'
        const vlinkMatch = dotlinkText.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i);
        
        if (vlinkMatch && vlinkMatch[1]) {
            link = vlinkMatch[1];
            console.log('Falling back to generic cloud link:', link);
        } else {
            console.log('No specific cloud link found on page. Using original link for extraction.');
        }
      }

      // NOTE: The entire 'filepress' link extraction and API interaction block has been removed
      // as per the requirement to only scrape the hubcloud link page.
    }

    // Pass the determined link (original or scraped hubcloud/cloud link) to the extractor
    return await hubcloudExtracter(link, signal);

  } catch (error: any) {
    console.error("getStream error: ", error.message);
    if (error.message.includes("Aborted")) {
        console.log("Stream fetch aborted by signal.");
    }
    // Always return an empty array on failure as per typical stream extraction function behavior
    return [];
  }
}
