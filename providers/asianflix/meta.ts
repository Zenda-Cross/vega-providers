import { Info, Link, ProviderContext } from "../types";

// Headers (kept for external API interaction context, though not strictly needed for this internal logic)
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
 * Interface for the playlist item structure found in the script tag
 */
interface PlaylistItem {
    file: string;
    subtitles: { label: string; file: string }[];
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
    
    // Get the main content containers
    const postBody = $("#post-body").first(); 
    const infoContainer = $(".post-single-content.box.mark-links.entry-content").first().length 
                          ? $(".post-single-content.box.mark-links.entry-content").first() 
                          : postBody.length ? postBody : $("body");


    const result: Info = {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie", 
      linkList: [],
    };

    // --- Title ---
    let finalTitle = $(".title.single-title.entry-title").text().trim() || $(".post-title").text().trim(); 
    finalTitle = finalTitle.split(/\s*\(\d{4}\)/)[0].split(/HDTC/i)[0].trim();
    result.title = finalTitle || "Unknown Title";

    // --- Synopsis (Plot/Storyline) ---
    const storylineParagraph = $(".description p").first();
    let synopsisText = storylineParagraph.text().trim();
    
    if (synopsisText) {
        result.synopsis = synopsisText;
    } else {
        // Fallback: Check for 'Plot:' or general content
        const plotParagraph = infoContainer.find("p:contains('Plot:')").first();
        synopsisText = plotParagraph.text().trim();
        if (synopsisText) {
            result.synopsis = synopsisText.replace(/Plot:\s*/, "").trim();
        } else {
            const metadataText = infoContainer.find("p").eq(1).html() || "";
            const plotMatch = metadataText.match(/Plot: (.*?)\./i);
            result.synopsis = plotMatch ? plotMatch[1].trim() + '.' : "";
        }
    }
    
    // --- IMDb ID ---
    const imdbMatch = infoContainer.html()?.match(/tt\d+/i) || null;
    result.imdbId = imdbMatch ? imdbMatch[0] : "";
    
    // --- Image ---
    let image = postBody.find(".separator img[src]").first().attr("src") || "";
    if (!image) { 
        image = infoContainer.find("p:first-of-type img[src]").first().attr("src") || "";
    }
    result.image = image.startsWith("//") ? "https:" + image : image;

    // --- LinkList extraction ---
    const links: Link[] = [];

    // **NEW: Check for direct HLS stream link (primary movie source)**
    const dataLink = $("#asianflix-one").attr("data-source");

    if (dataLink) {
        links.push({
            title: "Watch Movie (HLS Stream)",
            quality: "Web Stream",
            episodesLink: dataLink,
            directLinks: [{
                title: "Primary Stream",
                link: dataLink,
                type: "movie",
            }],
        });
    }

    // 1. Find the script tag containing the 'playlists' array (SERIES LOGIC)
    const scriptContent = $("script").text();
    const playlistMatch = scriptContent.match(/const\s+playlists\s+=\s+([^;]+);/);

    if (playlistMatch && playlistMatch[1]) {
        // If a playlist is found, it's likely a series. Process episodes.
        try {
            // Clear any previous links, as a playlist implies a series override
            links.length = 0; 
            
            const playlistString = playlistMatch[1].replace(/\n|\r/g, '').replace(/,\s*]/g, ']'); // Cleanup
            
            const getPlaylists = new Function(`return ${playlistString}`) as () => PlaylistItem[];
            const playlists: PlaylistItem[] = getPlaylists();


            playlists.forEach((item, index) => {
                const episodeNumber = index + 1;
                const linkText = `Episode ${episodeNumber}`;
                
                const directLinks: Link["directLinks"] = [
                    {
                        title: linkText,
                        link: item.file, 
                        type: "episode", 
                    }
                ];

                // Add subtitles as additional direct links
                item.subtitles?.forEach((sub) => {
                    directLinks.push({
                        title: `Subtitle: ${sub.label}`,
                        link: sub.file,
                       
                    });
                });

                links.push({
                    title: linkText, 
                    quality: "Playlist Stream",
                    episodesLink: link, 
                    directLinks,
                });
            });

            // Set type to series
            if (links.length > 0) {
                result.type = "series"; 
            }

        } catch (parseError) {
            console.error("Error parsing playlist script:", parseError);
        }
    } else {
        // --- Fallback for single links (Movies/Downloads) ---
        const downloadH3s = infoContainer.find("h3:has(a.wo, a.hsl, a.sdl)");

        downloadH3s.each((index, element) => {
            const el = $(element);
            const linkAnchor = el.find("a").first();
            const downloadLink = linkAnchor.attr("href");
            const linkText = linkAnchor.text().trim(); 
            
            if (downloadLink) {
                const qualityMatch = linkText.match(/\d+p\b/)?.[0] || "Unknown Quality";
                
                const directLinks: Link["directLinks"] = [
                    {
                        title: linkText, 
                        link: downloadLink,
                        type: "movie", 
                    }
                ];

                links.push({
                    title: linkText, 
                    quality: qualityMatch,
                    episodesLink: downloadLink, 
                    directLinks,
                });
            }
        });
    
        // --- Fallback: Add Watch Now button if no links were found (and no direct stream was found either) ---
        if (links.length === 0 && !dataLink) {
            links.push({
                title: "Watch Now",
                quality: "Web Stream",
                episodesLink: link, // Link to the current page itself
                directLinks: [{
                    title: "Watch Now",
                    link: link, // The current page URL, which holds the player
                    type: "movie",
                }],
            });
        }
    }

    result.linkList = links;
    return result;
  } catch (err) {
    console.error("getMeta error:", err);
    return emptyResult;
  }
};