import { Info, Link, ProviderContext } from "../types";

// Headers
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

export const getMeta = async function ({
    link,
    providerContext,
}: {
    link: string;
    providerContext: ProviderContext;
}): Promise<Info> {
    const { axios, cheerio } = providerContext;
    const url = link;
    const baseUrl = url.split("/").slice(0, 3).join("/");

    const emptyResult: Info = {
        title: "",
        synopsis: "",
        image: "",
        imdbId: "",
        type: "movie",
        linkList: [],
    };

    try {
        const response = await axios.get(url, {
            headers: { ...headers, Referer: baseUrl },
        });

        const $ = cheerio.load(response.data);
        const infoContainer = $(".entry-content").first();

        const result: Info = {
            title: "",
            synopsis: "",
            image: "",
            imdbId: "",
            type: "movie",
            linkList: [],
        };

        // --- Determine Type and Extract Core Info ---
        const rawTitle = $("h1").text().trim();
        // Check for 'Season', 'EP', or 'S01' in the title or content
        const isSeries = /Season \d+|EP \d+|S\d+/i.test(rawTitle) || infoContainer.find("span:contains('EP ')").length > 0;
        
        result.type = isSeries ? "series" : "movie";

        // --- Title Extraction ---
        if (isSeries) {
            // Logic for Series (e.g., Kurukshetra)
            let cleanTitle = rawTitle.replace(/\[Season \d+\]/i, '').trim();
            cleanTitle = cleanTitle.split(/ Hindi WEB-HDRip| WEB-HDRip/i)[0].trim();
            cleanTitle = cleanTitle.replace(/\[EP \d+ TO \d+ ADDED\]/i, '').trim(); // Remove episode range from main title
            result.title = cleanTitle || "Unknown Series";
        } else {
            // Logic for Movie (e.g., Guru Nanak Jahaz)
            const titleMatch = rawTitle.match(/^(.*?)\s*\((\d{4})\)/);
            result.title = titleMatch ? titleMatch[1].trim() : "Unknown Movie";
        }
        
        // --- Image ---
        let image = infoContainer.find("img[src]").eq(1).attr("src") || "";
        if (image.includes("no-thumbnail") || image.includes("placeholder"))
            image = "";
        result.image = image;
        
        // --- IMDb ID ---
        result.imdbId = "";

        // --- Synopsis ---
        let synopsis = "";
        const plotHeading = infoContainer.find("span:contains('Plot:')").closest("p");
        if (plotHeading.length) {
            const fullText = plotHeading.text().trim();
            synopsis = fullText.replace(/Plot:\s*/, "").trim();
        }
        result.synopsis = synopsis;

        // --- LinkList Extraction (Conditional Logic) ---
        const links: Link[] = [];
        result.linkList = links; // Assign here to make it available for pushing

        if (isSeries && rawTitle.includes("EP ")) {
            // ** NEW SERIES BATCH LINK EXTRACTION (Kurukshetra Structure) **
            
            let currentEpisodeRangeTitle: string = "Batch Links";

            // Iterate over all child elements of the main content
            infoContainer.children().each((i, el) => {
                const $el = $(el);
                const elTag = $el.get(0).tagName.toLowerCase();
                // const elText = $el.text().trim(); // unused

                // 1. Check for Episode Range Headings
                if (elTag === 'p' && $el.find('span:contains("EP ")').length && $el.find('strong').length) {
                    currentEpisodeRangeTitle = $el.find('span:contains("EP ")').closest('p').text().trim();
                } 
                
                // 2. Check for Quality/Size lines
                else if (elTag === 'p' && $el.find('span:contains("GB"), span:contains("MB")').length) {
                    
                    const qualityAndSizeText = $el.find('span').text().trim(); // e.g., "1080p HQ [5.8 GB]"
                    const qualityMatch = qualityAndSizeText.match(/\d+p/)?.[0] || "";
                    if (!qualityMatch) return;

                    // The download link is in the next p tag, inside an <a> tag
                    const downloadLinkElement = $el.next('p').find("a[href]").first();
                    const downloadLink = downloadLinkElement.attr("href");
                    
                    if (downloadLink) {
                        // const linkTitle = `${currentEpisodeRangeTitle} - ${qualityAndSizeText}`; // unused
                        
                        // Find or create the main Link entry for the episode batch
                        let existingLinkEntry: Link | undefined = links.find(l => l.title === currentEpisodeRangeTitle);
                        let finalLinkEntry: Link; // New non-nullable variable for clarity

                        if (!existingLinkEntry) {
                            const newEntry: Link = {
                                title: currentEpisodeRangeTitle,
                                directLinks: [],
                                episodesLink: "",
                            };
                            links.push(newEntry);
                            finalLinkEntry = newEntry; // Assign the non-nullable object
                        } else {
                            finalLinkEntry = existingLinkEntry; // Assign the found object
                        }
                        
                        // Accessing the non-nullable finalLinkEntry
                        if (!finalLinkEntry.episodesLink) {
                            finalLinkEntry.episodesLink = downloadLink;
                        }

                        // Using '!' on directLinks is acceptable if Link interface ensures it's initialized
                        finalLinkEntry.directLinks!.push({ 
                            title: qualityAndSizeText, // Use just the quality/size for the inner link title
                            link: downloadLink,
                            type: "series", // Marked as series since the content is a series
                        });
                    }
                }
            });

        } else if (isSeries) {
            // ** OLD SERIES LINK EXTRACTION (Bigg Boss Structure - UPDATED) **
            
            infoContainer.find("p span:contains('EP ')").each((index, element) => {
                const el = $(element);
                const episodeText = el.text().trim(); // e.g., "EP 67 (29 OCT 2025)"

                // ** IMPROVEMENT HERE: Use nextAll('h4').first() to skip intermediate elements **
                const episodeLinksContainer = el.closest("p").nextAll("h4").first();
                
                if (episodeLinksContainer.length) {
                    const directLinks: Link["directLinks"] = [];
                    let hasLinks = false;

                    episodeLinksContainer.find("a[href]").each((i, linkElement) => {
                        const linkEl = $(linkElement);
                        const quality = linkEl.text().trim().replace(' ', '');
                        const downloadLink = linkEl.attr("href");

                        // Exclude 480p links as per original request, but capture other valid links
                        if (downloadLink && quality && quality !== '480p') {
                            hasLinks = true;
                            directLinks.push({
                                title: quality,
                                link: downloadLink,
                                type: "series",
                            });
                        }
                    });
                    
                    if (hasLinks) {
                        // Determine the highest quality for the main link title
                        const highestQualityLink = directLinks.reduce((prev, current) => {
                            const prevQuality = parseInt(prev.title.match(/(\d+)/)?.[0] || '0', 10);
                            const currentQuality = parseInt(current.title.match(/(\d+)/)?.[0] || '0', 10);
                            return (currentQuality > prevQuality) ? current : prev;
                        }, directLinks[0]);

                        links.push({
                            title: `${episodeText} (${highestQualityLink.title})`, // Append highest quality
                            quality: "Multi-Quality",
                            episodesLink: directLinks[0].link,
                            directLinks,
                        });
                    }
                }
            });
        } else {
            // ** MOVIE LINK EXTRACTION (Guru Nanak Jahaz Structure) **
            
            let currentVersionTitle = "Movie Links";

            infoContainer.children().each((i, el) => {
                const $el = $(el);
                const elTag = $el.get(0).tagName.toLowerCase();
                const elText = $el.text().trim();
                
                // Identify version headings
                if (elTag === 'h4' && elText.includes("Version")) {
                    currentVersionTitle = elText;
                    
                    // --- VERSION TITLE CLEANUP ---
                    currentVersionTitle = currentVersionTitle
                        .replace(/\[.*?\]/gi, '') // Remove content in square brackets (e.g., [AC3 DDP 5.1])
                        .replace(/\s*Untoched Version/gi, ' ') // Remove "Untoched Version"
                        .replace(/\s*Encoded Version/gi, ' ') // Remove "Encoded Version"
                        .replace(/\s*DS4K/gi, ' ') // Remove "DS4K" (if it appears separately)
                        .trim();

                    // Fallback to default if cleanup leaves the string empty
                    currentVersionTitle = currentVersionTitle || "Movie Links";
                } 
                // Identify quality/size paragraph (assuming strong/span tags are inside for coloring)
                else if (elTag === 'p' && $el.find('span:contains("GB"), span:contains("MB")').length) {
                    const qualityAndSizeText = $el.find('span').text().trim(); 
                    const qualityMatch = qualityAndSizeText.match(/(\d+)p/i);
                    const quality = qualityMatch ? parseInt(qualityMatch[1], 10) : 0;
                    
                    if (quality === 0) return;

                    // The download link is in the next p tag, inside an <a> tag
                    const downloadLinkElement = $el.next('p').find("a:contains('GD & DOWNLOAD')").first();
                    const downloadLink = downloadLinkElement.attr("href");
                    
                    if (downloadLink) {
                        
                        let existingLinkEntry: Link | undefined = links.find(l => l.title.startsWith(currentVersionTitle));
                        let finalLinkEntry: Link; // New non-nullable variable for clarity

                        if (!existingLinkEntry) {
                            const tempTitle = currentVersionTitle;
                            const newEntry: Link = {
                                title: tempTitle, // Will be updated later in post-processing
                                directLinks: [],
                                episodesLink: "",
                            };
                            links.push(newEntry);
                            finalLinkEntry = newEntry;
                        } else {
                            finalLinkEntry = existingLinkEntry;
                        }
                        
                        // Using '!' on directLinks is acceptable if Link interface ensures it's initialized
                        finalLinkEntry.directLinks!.push({
                            title: `${qualityAndSizeText}`, // Use quality/size as the specific title
                            link: downloadLink,
                            type: "movie",
                        });
                    }
                }
            });
            
            // ** POST-PROCESSING STEP (Update Movie Link Titles) **
            // Update the main Link titles with the highest quality, size, and range found
            links.forEach(linkEntry => {
                // Safely access directLinks, only proceeding if it exists and has items
                if (!linkEntry.directLinks || linkEntry.directLinks.length === 0) {
                    return; // Skip if no direct links are available
                }

                let highestQuality = 0;
                let lowestQuality = 9999;
                let highestQualityTitle: string = ""; // Stores the full title string like "2160p (4K) [17 GB]"
                
                linkEntry.directLinks.forEach(directLink => {
                    const match = directLink.title.match(/(\d+)p/i);
                    const quality = match ? parseInt(match[1], 10) : 0;
                    
                    if (quality > 0) {
                        if (quality > highestQuality) {
                            highestQuality = quality;
                            // Capture the full descriptive title of the highest quality link
                            highestQualityTitle = directLink.title; 
                        }
                        lowestQuality = Math.min(lowestQuality, quality);
                    }
                });

                if (highestQuality > 0) {
                    let qualityText = "";
                    
                    // --- Extract Resolution/Size for Display ---
                    // Search for pattern: [resolution] (optional-text) [size]
                    let highestQualityDisplayStringMatch = highestQualityTitle.match(/(\d+p.*?\[.*?\])/i);
                    let displayString = highestQualityDisplayStringMatch ? highestQualityDisplayStringMatch[1] : `${highestQuality}p`;
                    
                    // 1. Single quality: Display the exact title of the highest/only link
                    if (highestQuality === lowestQuality) {
                        qualityText = ` (${displayString})`;
                    }
                    // 2. Multiple qualities: Show the range
                    else {
                        const lowestP = lowestQuality === 9999 ? '??p' : `${lowestQuality}p`;
                        // Display the full highest quality info + range to lowest quality
                        qualityText = ` (${displayString} Range to ${lowestP})`;
                    }
                    
                    // Only update if the title hasn't been explicitly set as something else
                    if (linkEntry.title.startsWith("Movie Links") || linkEntry.title.includes("Version")) {
                        linkEntry.title += qualityText;
                    }
                }
            });
        }

        return result;
    } catch (err) {
        console.log("getMeta error:", err);
        return emptyResult;
    }
};