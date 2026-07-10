import { Info, Link, ProviderContext } from "../types";

// Headers (omitted for brevity, assume they are the same)
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
 * Executes the 5-step link chaining to fetch the final download links.
 */
async function getDownloadLinks(
    watchUrl: string,
    movieTitle: string,
    providerContext: ProviderContext
): Promise<Link[]> {
    const { axios, cheerio } = providerContext;
    const finalLinks: Link[] = [];

    try {
        // --- STEP 1: Scrape Watch Page to get Server Link (data-putload) ---
        let response = await axios.get(watchUrl, { headers });
        let $ = cheerio.load(response.data);

        // Find the specific episode item and extract the data-putload URL
        const serverLink = $('li[data-server="3"][data-putload]').attr('data-putload');
        
        if (!serverLink) {
            console.log("Failed to find server link (data-putload) on watch page.");
            return finalLinks;
        }

        // --- STEP 2: Scrape Server Link Page to get Link Gate Button URL ---
        response = await axios.get(serverLink, { headers: { ...headers, Referer: watchUrl } });
        $ = cheerio.load(response.data);

        // Find the "GET DOWNLOAD LINKS" button URL
        const linkGateUrl = $('.content-pt a button').parent().attr('href');

        if (!linkGateUrl) {
            console.log("Failed to find link gate URL on server page.");
            return finalLinks;
        }

        // --- STEP 3: Scrape Link Gate Page to get Iframe Source (Final Download Page) ---
        response = await axios.get(linkGateUrl, { headers: { ...headers, Referer: serverLink } });
        $ = cheerio.load(response.data);

        // Find the iframe src (the final download page URL)
        const finalDownloadPageUrl = $('.video-container iframe').attr('src');
        
        if (!finalDownloadPageUrl) {
            console.log("Failed to find final download page URL (iframe src).");
            return finalLinks;
        }

        // --- STEP 4: Scrape Final Download Page to get CDN Button URL ---
        response = await axios.get(finalDownloadPageUrl, { headers: { ...headers, Referer: linkGateUrl } });
        $ = cheerio.load(response.data);

        // Find the CDN button URL
        const cdnLinkUrl = $('.content-pt a button').parent().attr('href');

        if (!cdnLinkUrl) {
            console.log("Failed to find CDN link URL on final download page.");
            return finalLinks;
        }
        
        // --- STEP 5: Scrape CDN Page to get Final Download Buttons ---
        response = await axios.get(cdnLinkUrl, { headers: { ...headers, Referer: finalDownloadPageUrl } });
        $ = cheerio.load(response.data);

        // Extract the final direct download buttons
        $('button[onclick^="download_video"]').each((_, element) => {
            const btnEl = $(element);
            const qualityText = btnEl.text().trim(); // e.g., "Normal quality 1128x480, 1.0 GB"
            
            // Extract Quality (e.g., Normal/Low) and Size (e.g., 1.0 GB)
            const qualityMatch = qualityText.match(/(Normal|Low)\squality/i);
            const quality = qualityMatch ? qualityMatch[1] : 'Unknown';
            const sizeMatch = qualityText.match(/(\d+(\.\d+)?\s(GB|MB))$/i);
            const size = sizeMatch ? sizeMatch[0] : 'Unknown Size';

            // Construct link object for final download buttons
            finalLinks.push({
                title: `${movieTitle} - ${qualityText}`,
                // Use extracted quality (Normal/Low)
                quality: quality, 
                // episodesLink points to the final button page (since direct link is JS-driven)
                episodesLink: cdnLinkUrl, 
                directLinks: [
                    {
                        title: `Download (${size})`,
                        // Use the button page as the link (requires further processing if a direct file link is needed)
                        link: cdnLinkUrl, 
                        type: "movie",
                    },
                ],
            });
        });

    } catch (error) {
        console.error("Error during link chaining:", error);
    }

    return finalLinks;
}


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
        const detailEl = $(".main-detail");

        const result: Info = {
            title: "",
            synopsis: "",
            image: "",
            imdbId: "",
            type: "movie", 
            linkList: [],
        };

        // --- Metadata Extraction ---
        result.title = detailEl.find(".detail-mod h3").text().trim() || 
                       detailEl.find(".breadcrumb .active span[itemprop='name']").text().trim().replace('(Tamil)', '').trim() ||
                       $("title").text().split("|")[0].trim();

        result.image = detailEl.find(".dm-thumb img").attr("src") || "";
        if (result.image.startsWith("//")) result.image = "https:" + result.image;

        result.synopsis = detailEl.find(".desc p").text().trim() || "Synopsis not found.";
        result.imdbId = detailEl.find("#imdb_id").text().trim(); 
        result.type = "movie"; 
        
        const qualityText = detailEl.find(".mvici-right .quality a").text().trim() || "Unknown";

        // --- LinkList Aggregation ---
        let finalLinks: Link[] = [];

        // 1. Fetch deep download links
        const watchButton = detailEl.find(".ch_btn_box a.bwac-btn");
        const watchLinkUrl = watchButton.attr("href");
        
        if (watchLinkUrl) {
            const deepDownloadLinks = await getDownloadLinks(watchLinkUrl, result.title, providerContext);
            finalLinks = finalLinks.concat(deepDownloadLinks);
        }
        
        // 2. Fetch External Links (excluding "Download Android APP")
        detailEl.find(".mobile-btn a.mod-btn").each((index, element) => {
            const btnEl = $(element);
            const linkUrl = btnEl.attr("href");
            
            const rawTitle = btnEl.attr("title") ?? ''; 
            const fallbackTitle = btnEl.text().trim();
            const title = rawTitle.trim() || fallbackTitle; 
            
            // EXCLUSION: Skip the Android App link
            if (title.includes('Download Android APP')) {
                return;
            }

            if (linkUrl && (title.includes('Download') || title.includes('Watch') || title.includes('Join Us'))) {
                 finalLinks.push({
                    title: `${result.title} - ${title}`, 
                    quality: 'External Link',
                    episodesLink: linkUrl,
                    directLinks: [
                        {
                            title: title,
                            link: linkUrl,
                            type: "movie", 
                        }
                    ]
                 });
            }
        });


        result.linkList = finalLinks;

        return result;
    } catch (err) {
        console.log("getMeta error:", err);
        return emptyResult;
    }
};