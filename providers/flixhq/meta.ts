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
    "xla=s4t; _ga=GA1.1.1081149560.1756378968; _ga_BLZGKYN5PF=GS2.1.1756378968$o1$g1$t1756378984$j44$l0$h0",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

// Define a type for media to fix the TS error, assuming it's imported from types
type MediaType = "movie" | "series" | "episode" | undefined;

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
    const infoContainer = $(".entry-content, .post-inner").first();

    const result: Info = {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };

    // --- Type determination ---
    const isSeriesPage = /Season \d+|Series Info:|Episode \d+/i.test(infoContainer.text());
    
    // Check for the Episode List header on the page (indicating this is the V-Cloud follow-up page)
    const isEpisodeListPage = $("h4:contains('-:Episodes:')").length > 0;

    if (isEpisodeListPage || isSeriesPage) {
      result.type = "series";
    } else {
      result.type = "movie";
    }

    // --- Title ---
    const rawTitle = $("h1").text().trim() || $("h2").text().trim();
    // Prioritize the download heading for a cleaner title
    const downloadH5Title = $(
      "h5:contains('Chainsaw Man – The Movie'), h3:contains('Download')" 
    ).first().text();
    let finalTitle = downloadH5Title || rawTitle;

    // Clean up title (remove tags, quality, size, etc.)
    finalTitle = finalTitle.replace(/Download|~ ZeeFliz.com/g, "").trim();
    // Keep the full movie title by stopping before the quality/year/tags
    result.title = finalTitle.split(/\(20\d{2}\)| \d+p| x\d+| \[[^\]]+\]/i)[0].trim() || "Unknown Title";
    
    // --- IMDb ID and Image/Synopsis extraction remain unchanged ---
    
    // --- IMDb ID ---
    const imdbMatch =
      infoContainer.html()?.match(/tt\d+/) ||
      $("a[href*='imdb.com/title/']").attr("href")?.match(/tt\d+/);
    result.imdbId = imdbMatch ? imdbMatch[0] : "";

    // --- Image ---
    let image =
      infoContainer.find("img[src]").first().attr("src") ||
      "";
    if (image.startsWith("//")) image = "https:" + image;
    if (!image) {
        image = infoContainer.find("img[data-src]").first().attr("data-src") || "";
    }
    if (image.includes("no-thumbnail") || image.includes("placeholder"))
      image = "";
    result.image = image;

    // --- Synopsis ---
    const synopsisHeading = infoContainer.find(
      "h3:contains('SYNOPSIS'), h3:contains('PLOT')"
    ).first();
    result.synopsis = synopsisHeading.next("p").text().trim() || "";

    // --- LinkList extraction (Handles both Download Blocks and Episode Lists) ---
    const links: Link[] = [];

    if (isEpisodeListPage) {
      // Logic for an Episode List Page (like the one linked by V-Cloud)
      
      const episodeHeadings = infoContainer.find("h4:contains('-:Episodes:')");

      episodeHeadings.each((index, element) => {
        const el = $(element);
        const episodeTitle = el.text().replace(/-:Episodes:/gi, '').trim(); // e.g., '1'
        const episodeNumberMatch = episodeTitle.match(/\d+/);
        const episodeNumber = episodeNumberMatch ? `E${episodeNumberMatch[0]}` : 'Episode';
        
        const directLinks: Link["directLinks"] = [];
        
        // Find the following <a> tags in the paragraph(s) until the next h4
        el.nextUntil("h4").find("a").each((i, btn) => {
          const aTag = $(btn);
          const buttonText = aTag.text().trim() || aTag.find("button").text().trim();
          const link = aTag.attr("href");
          
          if (link) {
            const linkTitle = buttonText.replace(/⚡|\[.*\]|\s*v-cloud/gi, '').trim() || 'Download Link';
            
            directLinks.push({
              title: linkTitle,
              link,
              type: "episode" as MediaType,
            });
          }
        });
        
        if (directLinks.length) {
          // Add the episode link block to the main linkList
          links.push({
            title: `${episodeNumber} ${result.title} (${directLinks[0].title})`.trim(),
            quality: 'Epi-DL', // Custom quality label for episodes
            episodesLink: directLinks[0].link, // Use the first direct link as the main link
            directLinks,
          });
        }
      });
      
    } else {
      // Original logic for Main Download Blocks (Series or Movie)
      const qualityHeadings = infoContainer.find("h3, h5");

      qualityHeadings.each((index, element) => {
        const el = $(element);
        const fullTitle = el.text().trim();
        
        const isSeriesBlock = /Season \d+|{HiNDi-Series}/i.test(fullTitle);
        const isMovieBlock = /Chainsaw Man – The Movie/i.test(fullTitle);
        
        if (!/\d{3,4}p/i.test(fullTitle) || (!isSeriesBlock && !isMovieBlock)) {
            return; // Skip if not a recognized quality/download block
        }
        
        const qualityMatch = fullTitle.match(/\d{3,4}p\b/)?.[0] || ""; // e.g., 480p, 720p
        const sizeMatch = fullTitle.match(/\[(.*?)\]/)?.[1] || ""; // e.g., 620MB, 1.3GB

        const directLinks: Link["directLinks"] = [];
        
        el.nextUntil("h3, h5").find("a").each((i, btn) => {
          const aTag = $(btn);
          const buttonText = aTag.text().trim() || aTag.find("button").text().trim();
          const link = aTag.attr("href");
          
          if (link) {
            // Determine the link title
            const linkTitle = buttonText.replace(/⚡|\[.*\]/g, '').trim() || 
                                `${qualityMatch} - ${sizeMatch || "Download"} Link`;
                                
            directLinks.push({
              title: linkTitle,
              link,
              type: result.type as MediaType, 
            });
          }
        });

        if (directLinks.length) {
            // Clean the main title, removing color spans if present
            const linkTitle = fullTitle.replace(/<\/?span[^>]*>/g, '').trim(); 
            links.push({
              title: linkTitle,
              quality: qualityMatch,
              // Use the first link as the episodesLink (or main download link for a movie)
              episodesLink: directLinks[0].link, 
              directLinks,
            });
        }
      });
    }


    result.linkList = links;
    // For episode list pages, we set the result type to 'series' (if not already), 
    // and the links are now the individual episodes.
    if (isEpisodeListPage) {
        result.type = "series";
    }

    return result;
  } catch (err) {
    console.log("getMeta error:", err);
    return emptyResult;
  }
};