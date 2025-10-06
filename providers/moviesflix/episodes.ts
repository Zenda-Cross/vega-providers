import { EpisodeLink, ProviderContext } from "../types";

/**
 * Decodes a Base64-encoded string using the native atob() function.
 * This implementation mirrors the client-side JavaScript's logic 
 * to correctly handle UTF-8 characters.
 * @param str The Base64 string from the HTML script.
 * @returns The decoded HTML content.
 */
function base64Decode(str: string): string {
    // 1. Remove any potential whitespace from the Base64 string
    const cleanedStr = str.replace(/\s/g, "");
    
    try {
        // 2. Decode the Base64 string to a binary string using atob()
        const binaryStr = atob(cleanedStr);
        
        // 3. Convert the binary string (Latin-1/raw bytes) into a proper UTF-8 string
        return decodeURIComponent(binaryStr.split("").map(function(c) {
            // Encode each character's charCode as a percent-encoded hexadecimal byte
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(""));
    } catch (e) {
        console.error("Base64 decode failed with atob():", e);
        return "";
    }
}

export const getEpisodes = function ({
    url,
    providerContext,
}: {
    url: string;
    providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
    const { axios, cheerio, commonHeaders: headers } = providerContext;
    console.log("getEpisodeLinks", url);

    return axios
        .get(url, { headers })
        .then((res) => {
            let $ = cheerio.load(res.data);
            const episodes: EpisodeLink[] = [];

            // 1. Extract and decode the Base64 content
            const scriptContent = $("script")
                .filter((i, el) => {
                    return $(el).html()?.includes('const encoded = "') ?? false;
                })
                .html();

            let encodedContent = "";
            if (scriptContent) {
                const match = scriptContent.match(/const encoded = "([^"]+)"/);
                if (match && match[1]) {
                    encodedContent = match[1];
                }
            }

            let decodedContent = "";
            if (encodedContent) {
                decodedContent = base64Decode(encodedContent);
            }

            // 2. Load the original HTML AND the decoded content into Cheerio for full DOM
            const fullHtml = res.data + decodedContent;
            $ = cheerio.load(fullHtml);

            const container = $(".entry-content, .entry-inner");

            // 3. Parse individual episode links (V-Cloud only, title: Episode N)
            container.find("h4, h3").each((_, element) => {
                const el = $(element);

                // Check for individual episode header pattern: -:Episode: 1:-
                let titleMatch = el.text().match(/-:Episodes?: (\d+):-/i);
                
                const episodeNumber = titleMatch ? titleMatch[1] : ''; 
                
                if (!episodeNumber) return;

                const finalTitle = `Episode ${episodeNumber}`;

                // Find only V-Cloud links in the paragraph immediately following the episode title
                el.next("p")
                    .find("a[href*='vcloud']") // Filter links specifically for 'vcloud' in the href
                    .each((_, a) => {
                        const anchor = $(a);
                        const href = anchor.attr("href")?.trim();
                        const linkText = anchor.text();

                        if (href && (href.includes('vcloud') || linkText.includes('V-Cloud'))) {
                            episodes.push({ 
                                // Title is simple "Episode N"
                                title: finalTitle, 
                                link: href 
                            });
                        }
                    });
            });

            // --- CHANGES START HERE (Step 4) ---

            // 4. Parse "Season Complete" or "Complete Pack" links 
            container.find("h3, h4").each((_, element) => {
                const el = $(element);
                const headerText = el.text().trim();

                // Regex for Season Complete patterns
                const seasonCompleteMatch = headerText.match(/(Season\s*(\d+)\s*Complete|Season\s*(\d+).*?Complete\s*Pack)/i);
                
                if (seasonCompleteMatch) {
                    const seasonNumber = seasonCompleteMatch[2] || seasonCompleteMatch[3];

                    // Base title for the season complete pack
                    // Example: "S1 Complete"
                    let baseTitle = `S${seasonNumber} Complete`;
                    
                    // Optionally, include resolution/details in the title for better clarity
                    const detailsMatch = headerText.match(/(\d+p WEB-DL.*|Complete Pack.*)/i);
                    if (detailsMatch) {
                        // Example: "S1 Complete [720p WEB-DL]"
                        baseTitle += ` [${detailsMatch[1].trim()}]`;
                    } else if (headerText.includes("Complete Pack")) {
                        baseTitle += " [Complete Pack]";
                    }
                    
                    // Find ALL links in the immediately following paragraph
                    el.next("p").find("a").each((_, a) => {
                        const anchor = $(a);
                        const href = anchor.attr("href")?.trim();
                        
                        let providerName = 'Download';
                        const linkText = anchor.text().replace(/[\s\u26a1\ud83d\udd06\u27a1\u2b50\u2b07]/g, '').trim();
                        
                        // Determine the provider name
                        if (linkText.includes('V-Cloud')) providerName = 'V-Cloud';
                        else if (linkText.includes('GDToT')) providerName = 'GDToT';
                        else if (linkText.includes('Filepress')) providerName = 'Filepress';
                        else if (linkText.includes('DropGalaxy')) providerName = 'DropGalaxy';
                        else if (linkText.toLowerCase().includes('download')) providerName = 'Download';

                        if (href) {
                            // Only add the link if the provider is NOT "Download" (to filter out generic buttons)
                            if (providerName !== 'Download') { 
                                episodes.push({ 
                                    // Title format is made similar to episode links: "S1 Complete (V-Cloud)"
                                    title: `${baseTitle} (${providerName})`, 
                                    link: href 
                                });
                            }
                        }
                    });
                }
            });

            // --- CHANGES END HERE (Step 4) ---

            // 5. Remove potential duplicate links based on the URL
            const uniqueEpisodes: EpisodeLink[] = [];
            const seenLinks = new Set<string>();

            for (const episode of episodes) {
                const existingEpisodeIndex = uniqueEpisodes.findIndex(e => e.link === episode.link);
                
                if (existingEpisodeIndex === -1) {
                    uniqueEpisodes.push(episode);
                } else {
                    // Keep the entry with the more descriptive title
                    if (uniqueEpisodes[existingEpisodeIndex].title.length < episode.title.length) {
                         uniqueEpisodes[existingEpisodeIndex].title = episode.title;
                    }
                }
            }
            
            return uniqueEpisodes;
        })
        .catch((err) => {
            console.log("getEpisodeLinks error:", err);
            return [];
        });
};