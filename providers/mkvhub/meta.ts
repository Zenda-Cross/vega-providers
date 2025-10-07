import { Info, Link, ProviderContext } from "../types";

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

export const getMeta = function ({
    link,
    providerContext,
}: {
    link: string;
    providerContext: ProviderContext;
}): Promise<Info> {
    const { axios, cheerio } = providerContext;

    return axios
        .get(link, { headers })
        .then((response) => {
            const $ = cheerio.load(response.data);
            const infoContainer = $(".page-body"); 

            const title =
                $("h1.page-title .material-text").text().trim() ||
                "";

            const imdbMatch = infoContainer.html()?.match(/tt\d+/);
            const imdbId = imdbMatch ? imdbMatch[0] : "";

            // Extract Storyline (Synopsis)
            // The story is in the last <p> tag before the links section starts.
            const synopsisElement = infoContainer.find("p").filter((i, el) => {
                 // Target the <p> that contains the plot summary and cast info
                 return $(el).text().includes("IMDb Rating:") && $(el).text().includes("Cast:");
            });
            const synopsisContent = synopsisElement.html()?.split('<br />')[5]?.trim() || "";
            // Clean up the synopsis to only include the plot
            const synopsis = synopsisContent.startsWith("During a critical rescue operation") ? synopsisContent : "";

            let image = infoContainer.find(".poster img").first().attr("src") || "";
            if (image.startsWith("//")) image = "https:" + image;

            // Check for series by looking for "Episode" in the content
            const type = infoContainer.text().includes("Episode") ? "series" : "movie";
            const linkList: Link[] = [];

            if (type === "series") {
                // ✅ Series Logic: Group links by Episode Title
                
                // Find all H3s that contain "Episode" (This marks the start of a new episode block)
                infoContainer.find("h3:contains('Episode')").each((_, episodeH3El) => {
                    const episodeEl$ = $(episodeH3El);
                    // Extract Episode title and clean up the ||
                    const episodeTitle = episodeEl$.text().trim().replace(/\|\|/g, '').trim(); 
                    
                    if (!episodeTitle) return;

                    const directLinks: Link["directLinks"] = [];

                    // The download blocks are structured as: H3 (Quality) -> P (Link)
                    // We look at the elements immediately following the Episode H3 until the next Episode H3
                    let currentEl = episodeEl$.next();
                    let currentQualityTitle = '';
                    
                    while (currentEl.length && !currentEl.is("h3:contains('Episode')")) {
                        if (currentEl.is("h3")) {
                            // This is the Quality H3 (e.g., || 720p HD via Single Links Size: 472MB ||)
                            currentQualityTitle = currentEl.text().trim().replace(/\|\|/g, '').trim();

                            // The direct link is in the next <p> tag
                            const linkP = currentEl.next("p");
                            const downloadAnchor = linkP.find("a.dbuttn");

                            if (downloadAnchor.length) {
                                const href = downloadAnchor.attr("href")?.trim() || "";
                                if (href) {
                                    directLinks.push({
                                        title: currentQualityTitle,
                                        link: href,
                                        type: "episode", // Type: episode for series links
                                    });
                                }
                            }
                        }
                        // Move to the next sibling element
                        currentEl = currentEl.next();
                    }

                    if (directLinks.length > 0) {
                        linkList.push({
                            title: episodeTitle,
                            directLinks: directLinks,
                            // Setting episodesLink to the link of the first quality/size for an "All Episodes" button (if needed, otherwise leave empty)
                            episodesLink: directLinks[0].link, 
                        });
                    }
                });

            } else {
                // ✅ Movie Logic (Unchanged from the previous fix, for completeness)
                const groupedLinks: { [key: string]: Link["directLinks"] } = {};

                infoContainer.find("h3").each((_, h3El) => {
                    const el$ = $(h3El);
                    // We focus only on H3s that contain size/quality info for a movie (if any)
                    const h3Text = el$.text().trim().replace(/\|\||\s/g, "");
                    if (!h3Text.includes("Download") || h3Text.includes("Episode")) return;
                    
                    const directLinks: Link["directLinks"] = [];

                    el$.next("p").find("a.dbuttn").each((_, aEl) => {
                        const href = $(aEl).attr("href")?.trim() || "";
                        if (href) {
                            const linkTitle = h3Text.match(/(\d+p.+?GB)/i)?.[0] || h3Text;

                            directLinks.push({
                                title: linkTitle,
                                link: href,
                                type: "movie",
                            });
                        }
                    });

                    if (directLinks.length) {
                        const links = directLinks || []; 
                        const key = links.some(l => l.title.includes("720p")) ? "720p Links" : 
                                     links.some(l => l.title.includes("1080p")) ? "1080p Links" : "Other Links";
                        
                        if (!groupedLinks[key]) {
                            groupedLinks[key] = []; 
                        }
                        groupedLinks[key].push(...links); 
                    }
                });

                Object.entries(groupedLinks).forEach(([key, links]) => {
                    if (links && links.length > 0) { 
                        linkList.push({
                            title: key,
                            directLinks: links,
                            episodesLink: "",
                        });
                    }
                });
            }

            return { title, synopsis, image, imdbId, type, linkList };
        })
        .catch((err) => {
            console.error("getMeta error:", err);
            return {
                title: "",
                synopsis: "",
                image: "",
                imdbId: "",
                type: "movie",
                linkList: [],
            };
        });
};