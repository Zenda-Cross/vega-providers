import { ProviderContext, Stream } from "../types";

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
}) {
    const { axios, cheerio, extractors } = providerContext;
    const { hubcloudExtracter } = extractors;
    let hubCloudLink = link;

    try {
        const streamLinks: Stream[] = [];
        console.log("getStream: initial link", link);

        if (type === "movie" && !link.includes('hubcloud.one')) {
            // Assume link is a DotLink page (e.g., links.animica.in/...)
            const dotlinkRes = await axios(`${link}`, { headers });
            const dotlinkText = dotlinkRes.data;
            const $ = cheerio.load(dotlinkText);

            // --- 1. Find the HubCloud/Vlink (Streaming Link) ---
            const vlinkMatch = dotlinkText.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i) || [];
            if (vlinkMatch[1]) {
                hubCloudLink = vlinkMatch[1];
            } else {
                // Fallback for HubCloud link if the regex fails
                const hubcloudAnchor = $('a:contains("HubCloud")').attr("href");
                if (hubcloudAnchor && hubcloudAnchor.includes('hubcloud.one')) {
                    hubCloudLink = hubcloudAnchor;
                }
            }
            
            // --- 2. Extract Download Links (General Button Scrape) ---
            // Look for common download links/buttons on the DotLink page.
            $('a.button, .entry-content a[href]').each((i, el) => {
                const downloadLink = $(el).attr('href');
                const downloadTitle = $(el).text().trim();
                
                // Exclude the identified streaming link and other irrelevant anchors
                if (
                    downloadLink && 
                    !downloadLink.includes(hubCloudLink) && 
                    !downloadLink.includes('hubcloud.one') &&
                    downloadTitle && 
                    !/skip|close|ads/i.test(downloadTitle)
                ) {
                    // Assuming links that are not HubCloud are direct downloads
                    streamLinks.push({
                        server: downloadTitle.split('[')[0].trim() || 'Download',
                        link: downloadLink,
                        type: "download", // Mark as download link
                    });
                }
            });

            // --- 3. Existing FilePress Extraction (specific download type) ---
            // Existing complex FilePress logic is kept for specific extraction
            try {
                const filepressLink = $(
                    '.btn.btn-sm.btn-outline[style*="rgb(252,185,0)"]' // Adjusted selector for robustness
                )
                    .parent()
                    .attr("href");
                
                if (filepressLink) {
                    const filepressID = filepressLink.split("/").pop();
                    const filepressBaseUrl = filepressLink
                        .split("/")
                        .slice(0, -2)
                        .join("/");
                    
                    const filepressTokenRes = await axios.post(
                        filepressBaseUrl + "/api/file/downlaod/",
                        {
                            id: filepressID,
                            method: "indexDownlaod",
                            captchaValue: null,
                        },
                        {
                            headers: {
                                "Content-Type": "application/json",
                                Referer: filepressBaseUrl,
                            },
                        }
                    );
                    
                    if (filepressTokenRes.data?.status) {
                        const filepressToken = filepressTokenRes.data?.data;
                        const filepressStreamLink = await axios.post(
                            filepressBaseUrl + "/api/file/downlaod2/",
                            {
                                id: filepressToken,
                                method: "indexDownlaod",
                                captchaValue: null,
                            },
                            {
                                headers: {
                                    "Content-Type": "application/json",
                                    Referer: filepressBaseUrl,
                                },
                            }
                        );
                        // Add the final FilePress direct link (likely a download link)
                        if (filepressStreamLink.data?.data?.[0]) {
                             streamLinks.push({
                                server: "FilePress Direct",
                                link: filepressStreamLink.data.data[0],
                                type: "download",
                            });
                        }
                    }
                }
            } catch (error) {
                console.log("filepress error: ");
            }
        }
        
        // --- 4. Final step: Get actual stream URL from HubCloud ---
        // If HubCloud link was found or was the initial link, extract stream URL.
        if (hubCloudLink && hubCloudLink.includes('hubcloud.one')) {
            const hubcloudStreams = await hubcloudExtracter(hubCloudLink, signal);
            // Prepend HubCloud streams to the list
            streamLinks.unshift(...hubcloudStreams);
        }

        return streamLinks;
        
    } catch (error: any) {
        console.log("getStream error: ", error);
        if (error.message.includes("Aborted")) {
        } else {
        }
        return [];
    }
}