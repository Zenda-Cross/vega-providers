import { Info, Link, ProviderContext } from "../types";

// Headers remain the same as they are standard for web scraping
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
        type: "movie", // Set default to 'movie'
        linkList: [],
    };

    try {
        const response = await axios.get(url, {
            headers: { ...headers, Referer: baseUrl },
        });

        const $ = cheerio.load(response.data);
        const infoContainer = $(".entry-content").first();

        const result: Info = {
            ...emptyResult
        };

        // --- Type determination ---
        const animeInfoText = infoContainer.find("h5:contains('Anime Info')").nextUntil("h5").text();
        if (/Duration/i.test(animeInfoText) && !/Season/i.test(animeInfoText)) {
             result.type = "movie";
        } else if (/Season/i.test(animeInfoText)) {
             result.type = "series";
        }
        
        // --- Title ---
        let finalTitle = $("h1.page-title").text().trim();
        finalTitle = finalTitle.split('Season')[0].trim().replace(/\s*\(2025\)\s*|\s*\d+p.*|\s*WEB-DL/i, '');
        result.title = finalTitle || "Unknown Title";

        // --- IMDb ID ---
        result.imdbId = "";

        // --- Image ---
        let image = infoContainer.find("img.wp-image-1811, img.wp-image-2297").first().attr("src");
        
        if (!image) {
             image = infoContainer.find("img[src]").first().attr("src");
        }
        
        if (image) {
            if (image.startsWith("//")) image = "https:" + image;
            result.image = image;
        } else {
            result.image = "";
        }


        // --- Synopsis (Plot Summary) ---
        const plotSummaryHeading = infoContainer.find(
            "h5:contains('Plot Summary')"
        ).first();
        result.synopsis = plotSummaryHeading.nextAll("p").first().text().trim() || "";
        
        if (!result.synopsis && plotSummaryHeading.next().prop("tagName") === 'P') {
            result.synopsis = plotSummaryHeading.next().text().trim();
        }

        // ---------------------------------------------------------------------
        // --- LinkList extraction (Focusing ONLY on HubCloud for 'Play' link) ---
        // ---------------------------------------------------------------------
        const links: Link[] = [];
        const qualityHeadings = infoContainer.find("h5");

        qualityHeadings.each((index, element) => {
            const el = $(element);
            const fullTitle = el.text().trim();

            // Filter for headings that contain Quality info (e.g., '720P', '1080P')
            if (!/\d+p/i.test(fullTitle) || /Info/i.test(fullTitle) || /Summary/i.test(fullTitle) || /CAMRip/i.test(fullTitle)) {
                return; // Skip if it's not a relevant quality block
            }

            const qualityMatch = fullTitle.match(/\d+p\b/i)?.[0] || "";

            const directLinks: Link["directLinks"] = [];

            // 1. Check for the main Download Links button (which leads to the page with HubCloud links)
            const mainDownloadButton = el.nextAll("p").find("a.button").first();
            
            if(mainDownloadButton.length) {
                const link = mainDownloadButton.attr("href");
                const buttonTitle = mainDownloadButton.text().replace(/📥\s*/, '').trim();

                // 2. Check the siblings of the 'h5' heading for a direct HubCloud link.
                // This is based on the logic from 'episodes.ts' where HubCloud links are primary.
                // NOTE: The main download button (e.g., 'Download Links') is used as the episodesLink.
                // The actual HubCloud *play* button is often on the target page. 
                // However, if a *direct* HubCloud link is found on this page, prioritize it in directLinks.

                const hubCloudAnchor = el
                    .nextUntil("h5") 
                    .find('a:contains("HubCloud")')
                    .first();
                
                if (hubCloudAnchor.length) {
                    // If a direct HubCloud link is found, use it as the *only* directLink/Play link
                    const hubCloudLink = hubCloudAnchor.attr("href");
                    const title = hubCloudAnchor.text().trim();
                    
                    if (hubCloudLink) {
                        directLinks.push({
                            title: title,
                            link: hubCloudLink,
                            // Set type based on the content type
                            type: result.type as 'movie' | 'series' | 'episode', 
                        });
                    }
                } else if (link) {
                    // Fallback: Use the general "Download Links" button if no direct HubCloud link is found.
                    // This links to the page where the HubCloud link will be scraped by getEpisodes.
                    directLinks.push({
                        title: buttonTitle,
                        link: link,
                        type: result.type as 'movie' | 'series' | 'episode', 
                    });
                }
            }
            
            // Only add to links list if we found a link to include
            if (directLinks.length) {
                links.push({
                    title: fullTitle,
                    quality: qualityMatch,
                    // The episodesLink should always point to the link that needs to be scraped by getEpisodes
                    // which is the first direct link we found.
                    episodesLink: directLinks[0].link,
                    directLinks,
                });
            }
        });

        result.linkList = links;
        return result;
    } catch (err) {
        console.log("getMeta error:", err);
        return emptyResult;
    }
};