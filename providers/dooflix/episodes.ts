import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  // Destructuring to include axios, cheerio, and commonHeaders if available
  const { axios, cheerio, commonHeaders: headers } = providerContext; 
  console.log("getEpisodes: Fetching links from", url);

  try {
    const res = await axios.get(url, {
      headers: {
        // Use spread operator to include common headers first
        ...headers, 
        // Use the hardcoded specific cookie/headers necessary for this domain
        cookie:
          "ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=Zl2yiOCN3pzGUd0Bgs.VyBXniJooDbG2Tk1g7DEoRnw-1756381111-1.2.1.1-RVPZoWGCAygGNAHavrVR0YaqASWZlJyYff8A.oQfPB5qbcPrAVud42BzsSwcDgiKAP0gw5D92V3o8XWwLwDRNhyg3DuL1P8wh2K4BCVKxWvcy.iCCxczKtJ8QSUAsAQqsIzRWXk29N6X.kjxuOTYlfB2jrlq12TRDld_zTbsskNcTxaA.XQekUcpGLseYqELuvnLQU568NZD6LiLn3ICyFThMFAx6mIcgXkxVAvnxU; xla=s4t",
      },
    });
    
    const $ = cheerio.load(res.data);
    const container = $(".entry-content,.entry-inner");
    
    // Remove unwanted blocks/ads for cleaner parsing
    $(".unili-content,.code-block-1").remove();
    
    const episodes: EpisodeLink[] = [];
    
    // Look for episode links based on the provided HTML structure (<h3><a>...</a></h3>)
    container.find("h3 a").each((index, element) => {
      const anchor = $(element);
      
      // Extract link directly from the anchor tag href attribute
      const link = anchor.attr("href");
      
      // The title is the text content of the anchor tag (e.g., "Episode 1")
      const title = anchor.text().trim(); 

      // Ensure both the title and link are valid
      if (link && title) {
        // Since we cannot modify "../types", we stick to title and link
        episodes.push({ 
          title, 
          link 
        }); 
      }
    });
    
    return episodes;
  } catch (err) {
    console.log("getEpisodes error: Failed to fetch or parse episode links.");
    // console.error(err); // Uncomment for debugging
    return [];
  }
};
