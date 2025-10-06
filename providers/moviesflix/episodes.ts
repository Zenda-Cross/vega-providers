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

            // 1. Extract the Base64 encoded string from the client-side script
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

            // 2. Decode the Base64 string
            let decodedContent = "";
            if (encodedContent) {
                decodedContent = base64Decode(encodedContent);
            }

            // 3. Load the original HTML AND the decoded content into Cheerio.
            // This makes the dynamically loaded links available for parsing.
            const fullHtml = res.data + decodedContent;
            $ = cheerio.load(fullHtml);

            const container = $(".entry-content, .entry-inner");

            // 4. Parse the episode links
            container.find("h4, h3").each((_, element) => {
                const el = $(element);

                // Use a regex to extract the clean episode number
                let titleMatch = el.text().match(/-:Episodes: (\d+):-/);
                
                // Get the raw episode number only (e.g., "1", "2", etc.)
                const episodeNumber = titleMatch ? titleMatch[1] : ''; 
                
                if (!episodeNumber) return;

                // Set the final desired title format
                const finalTitle = `Episode ${episodeNumber}`;

                // Find only V-Cloud links in the paragraph immediately following the episode title
                el.next("p")
                    .find("a[href*='vcloud']") // Filter links specifically for 'vcloud' in the href
                    .each((_, a) => {
                        const anchor = $(a);
                        const href = anchor.attr("href")?.trim();

                        if (href) {
                            episodes.push({ 
                                // Use the simplified title format as requested
                                title: finalTitle, 
                                link: href 
                            });
                        }
                    });
            });

            // Remove potential duplicate links
            const uniqueEpisodes = Array.from(new Set(episodes.map(e => e.link)))
                                    .map(link => episodes.find(e => e.link === link)!);
            
            return uniqueEpisodes;
        })
        .catch((err) => {
            console.log("getEpisodeLinks error:", err);
            return [];
        });
};