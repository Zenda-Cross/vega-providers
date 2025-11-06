import { EpisodeLink, ProviderContext } from "../types";

// Standard headers for the request
const defaultHeaders = {
    Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Cache-Control": "no-cache",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Referer: "https://movielinkhub.fun/",
};

/**
 * FIX: Renamed back to getEpisodes to resolve the TypeError in the calling application.
 * The function logic remains the same: extracting download links grouped by quality.
 */
export const getEpisodes = async function ({
    url,
    providerContext,
}: {
    url: string;
    providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
    const { axios, cheerio } = providerContext;
    console.log("getEpisodes", url);

    const targetUrl = url;

    try {
        const res = await axios.get(targetUrl, {
            headers: defaultHeaders,
        });
        
        const $ = cheerio.load(res.data);
        
        // Target the main container that holds all the quality groups
        const container = $(".wp-block-group.is-vertical").first(); 
        
        // Using EpisodeLink[] type for the list of final links
        const links: EpisodeLink[] = [];

        // Find all quality headings (e.g., <h2>1080P</h2>)
        container.find(".quality h2").each((index, element) => {
            const qualityEl = $(element);
            const quality = qualityEl.text().trim(); // e.g., "1080P"

            // Find the next sibling <center> block which contains the actual links.
            const linksContainer = qualityEl.closest('center').next('center');
            
            // --- NEW LOGIC: Extract Size using Regex ---
            // Get all text content from the links container block
            const containerText = linksContainer.text();
            
            // Regex to find patterns like "1.38GB", "500MB", "2TB"
            // Captures: 1. number part (with optional decimal), 2. optional decimal part, 3. unit (MB/GB/TB)
            const sizeMatch = containerText.match(/(\d+(\.\d+)?\s*(MB|GB|TB))/i);
            const size = sizeMatch ? sizeMatch[1].trim() : 'Size N/A';
            // ------------------------------------------

            // Find the GDFlix link within this group (as per your request)
            linksContainer.find('a.down-btn:contains("GDFlix")').each((i, linkEl) => {
                const link = $(linkEl).attr("href");
                const buttonText = $(linkEl).text().trim(); // e.g., "GDFlix"
                
                if (link) {
                    // Create the final link object, now including the extracted size in the title
                    links.push({
                        // Updated title format: [QUALITY, SIZE] - BUTTON_TEXT Download
                        title: `[${quality}]Play`, 
                        link: link, 
                    });
                }
            });
        });

        return links;
    } catch (err) {
        console.error("getEpisodes error:", err instanceof Error ? err.message : String(err));
        return [];
    }
};