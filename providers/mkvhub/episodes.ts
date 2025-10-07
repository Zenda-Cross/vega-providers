import { EpisodeLink, ProviderContext } from "../types";

const headers = {
    Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Cache-Control": "no-store",
    "Accept-Language": "en-US,en;q=0.9",
    DNT: "1",
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

/**
 * Parses a page to extract individual episode details.
 * * NOTE: For this specific provider (ninjaprey), all episode details (including quality links) 
 * for a season appear to be scraped entirely by the getMeta function on the main page. 
 * Therefore, this function is implemented to satisfy the runtime requirement for 
 * 'getEpisodes' but returns an empty list, as the episode data is already available 
 * in the 'linkList' of the 'Info' object from getMeta.
 */
export const getEpisodes = function ({
    link,
    providerContext,
}: {
    link: string;
    providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
    // We do not perform any scraping here because all necessary episode links 
    // are already extracted in the getMeta function for series type content.
    return Promise.resolve([]);
};
