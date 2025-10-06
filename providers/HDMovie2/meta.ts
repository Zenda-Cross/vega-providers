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
  // The Cookie header is likely irrelevant and can be removed or simplified
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
    // Main container is the content area
    const infoContainer = $(".wp-content").first().parent(); // Targets the div containing the synopsis and links

    const result: Info = {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };

    // --- Type determination ---
    // The HTML is clearly for a movie
    result.type = "movie";

    // --- Title (H1 at the top of the page) ---
    const rawTitle = $("h1").first().text().trim();
    // Clean up title (remove quality, year, and dual audio tags)
    let finalTitle = rawTitle.replace(/\s*\d{4}\s*\(Dual Audio [A-Za-z\-]+\)|\s*\(\s*WEB-DL\s*\)/i, '').trim();
    result.title = finalTitle || "Unknown Title";

    // --- IMDb ID ---
    // This site does not expose an IMDb ID in the provided HTML, so it remains empty.
    result.imdbId = "";

    // --- Image ---
    // The main post image is not in this HTML, but a gallery item is:
    let image = $("div.galeria a").first().attr('href') || "";
    // If not found, fall back to any content image that's not a logo/ad:
    if (!image) {
        image = $("img[src]").filter((i, el) => !$(el).closest('.module_single_ads').length && !/logo|placeholder/i.test($(el).attr('src') || '')).first().attr('src') || "";
    }
    if (image.startsWith("//")) image = "https:" + image;
    result.image = image;

    // --- Synopsis ---
    // Target the description div next to the Synopsis heading
    result.synopsis = $("#info .wp-content p").first().text().trim() || "";
    
    // --- LinkList extraction ---
    const links: Link[] = [];
    
    // Iterate over all custom download buttons
    $(".custom-download-btn").each((index, element) => {
        const btn = $(element);
        // Get the full title from the button text (e.g., "↓ Download 1080p (Hindi) ↓")
        const fullTitle = btn.text().trim().replace(/↓/g, '').trim();
        const qualityMatch = fullTitle.match(/\d+p/i)?.[0] || "";
        
        // Get the target submenu ID from the onclick attribute
        const submenuIdMatch = btn.attr('onclick')?.match(/toggleSubMenu\(['"](.*?)['"]\)/);
        if (!submenuIdMatch) return;

        const submenuId = submenuIdMatch[1];
        const submenu = $(`#${submenuId}`);
        
        const directLinks: Link["directLinks"] = [];
        
        submenu.find("a").each((i, linkEl) => {
            const linkA = $(linkEl);
            const linkHref = linkA.attr("href");
            const linkText = linkA.text().trim();
            
            // 💡 Filter to include only Hubcloud and Gdflix links
            if (linkHref && (linkHref.includes("hubcloud.one") || linkHref.includes("gdflix.dev"))) {
                directLinks.push({
                    title: linkText.replace('🔗', ''), // Clean up the server name
                    link: linkHref,
                    type: "movie", 
                });
            }
        });

        if (directLinks.length) {
            // Use a descriptive title for the LinkList item
            const listTitle = `${fullTitle} - ${qualityMatch}`; 
            links.push({
                title: listTitle,
                quality: qualityMatch,
                episodesLink: directLinks[0].link, // Use the first server link as the general link
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