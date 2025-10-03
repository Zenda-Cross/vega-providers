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
    const contentEl = $(".thecontent");
    const topText = contentEl.html() || "";

    const result: Info = {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie", // Default
      linkList: [],
    };

    // --- Type Determination ---
    const isSeries = /Network:/i.test(topText) || /Series:/i.test(topText) || /CID \(\d{4}\)/i.test(topText);
    result.type = isSeries ? "series" : "movie";


    // --- Title Extraction ---
    let seasonNumber = "";
    if (result.type === 'series') {
      let rawTitle = contentEl.find("strong").first().text().trim() || "";
      rawTitle = rawTitle.replace(/\s+\d+p.*$/i, '').trim();
      result.title = rawTitle;
      
      const seasonMatch = result.title.match(/(S\d+)/i);
      seasonNumber = seasonMatch ? seasonMatch[1].toUpperCase() : ""; // Keep empty if not found

      // Refine title (e.g., remove season part for cleaner series title)
      result.title = result.title.replace(/\s(S\d+)/i, '').trim(); 

    } else {
      let rawTitle = $("strong").first().text() || "";
      const titleMatch = rawTitle.match(/^([^)]+\s*\(\d{4}\))/);
      result.title = titleMatch ? titleMatch[1].trim() : rawTitle.split(')')[0] + ')';
      result.title = result.title.replace(/\s+AMZN.*$/i, '').trim();
    }
    
    if (!result.title) {
        result.title = $("title").text().split("|")[0].trim();
    }
    

    // --- IMDb ID, Synopsis, and Image (Unchanged) ---
    result.imdbId = "";

    let synopsis = "";
    const summaryMatch = topText.match(/(?:Stars: .*?)\s*<br\s*\/?>\s*([^<]+)\s*<span/i);
    if (summaryMatch && summaryMatch[1]) {
        synopsis = summaryMatch[1].trim();
    }
    result.synopsis = synopsis || "Synopsis not found.";

    let image = contentEl.find("img").first().attr("src") || "";
    if (image.startsWith("//")) image = "https:" + image;
    result.image = image;

    // --- LinkList Extraction (Updated for Individual Episode Links) ---
    const links: Link[] = [];

    // Reset episode counter for the page
    let episodeCounter = 1;
    let currentEpisodeNumber = "";

    const downloadButtons = $("a[class*='emd_dl_']");
    const allElements = contentEl.contents(); // Get all top-level elements

    downloadButtons.each((index, element) => {
      const btnEl = $(element);
      const fullLinkText = btnEl.text().trim();
      const linkUrl = btnEl.attr("href");

      if (linkUrl) {
        // Extract quality (e.g., 1080p, 720p, 480p)
        const qualityMatch = fullLinkText.match(/in (\d+p)/i);
        const quality = qualityMatch ? qualityMatch[1] : "Unknown";
        
        // Extract size (e.g., 3GB, 1.4GB, 516MB)
        const sizeMatch = fullLinkText.match(/-\s*([0-9\.]+G?M?B)/i);
        const size = sizeMatch ? sizeMatch[1] : "Unknown Size";

        // Determine the link type and title based on content type
        let linkTitle: string;
        let directLinkType: "movie" | "series" | "episode" = "movie";

        if (result.type === 'series') {
          directLinkType = "episode";
          
          // --- Episode Number Extraction Logic ---
          
          // 1. Try to find the actual episode number in the surrounding text/HTML
          // We look for text right before the link element that might contain the episode number/title.
          // This is a complex heuristic and may need adjustment based on the actual HTML.
          const prevElement = btnEl.prev().prev(); // Check the element before the style tag which is before the link tag.
          const prevText = prevElement.text().trim();
          
          let epMatch = prevText.match(/Episode\s*(\d+)/i) || fullLinkText.match(/Episode\s*(\d+)/i);
          currentEpisodeNumber = epMatch ? `E${epMatch[1]}` : `E${episodeCounter}`;
          
          // 2. Fallback to extracting from the link text itself (if it contains it, like in the screenshot title)
          // The title in the screenshot is "CID (2025) (1080p 1.9GB)". If the website title includes episode info,
          // we'd typically use that. Since it doesn't, we use the counter.
          
          const titleMatchInLinkText = fullLinkText.match(/(\d{4})\s*\)/);
          if (titleMatchInLinkText) {
              // The link text already contains the show name, we just need to append episode info.
              linkTitle = `${fullLinkText.replace(/\)$/, `) ${currentEpisodeNumber}`)}`;
          } else {
              linkTitle = `${result.title} ${currentEpisodeNumber} (${quality} ${size})`;
          }
          
          // Increment the counter only for the first quality link of this episode group
          if (quality === '1080p' || quality === 'Unknown' && index % 3 === 0) {
            episodeCounter++;
          }

          links.push({
            // LinkList entry is now for the specific episode download option
            title: linkTitle, 
            quality: quality,
            // The episodesLink is the direct download link for this specific quality/episode
            episodesLink: linkUrl, 
            directLinks: [
              {
                // Title for the single episode direct link
                title: `${result.title} ${currentEpisodeNumber} - Watch & Download (${size})`,
                link: linkUrl,
                type: directLinkType, // 'episode'
              },
            ],
          });
        } else {
          // MOVIE: LinkList entry is the direct movie link (original logic)
          linkTitle = `${result.title} (${quality} ${size})`;
          directLinkType = "movie";
          
          links.push({
            title: linkTitle,
            quality: quality,
            episodesLink: linkUrl,
            directLinks: [
              {
                title: `Watch & Download (${size})`,
                link: linkUrl,
                type: directLinkType,
              },
            ],
          });
        }
      }
    });

    result.linkList = links;

    return result;
  } catch (err) {
    console.log("getMeta error:", err);
    return emptyResult;
  }
};