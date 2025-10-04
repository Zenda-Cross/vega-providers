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
    const infoContainer = $(".post-single-content.box.mark-links.entry-content").first();

    const result: Info = {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie", 
      linkList: [],
    };

    // --- Title ---
    // The main title is in the H1 tag
    let finalTitle = $(".title.single-title.entry-title").text().trim();
    // Clean up title (remove quality/year info)
    finalTitle = finalTitle.split(/\s*\(\d{4}\)/)[0].split(/HDTC/i)[0].trim();
    result.title = finalTitle || "Kantara A Legend Chapter 1 (2025)";

    // --- Information Extraction from P tags ---
    // Extract metadata block to find Rating, Released Date, Director, etc.
    const metadataText = infoContainer.find("p").eq(1).html() || "";
    
    // --- Synopsis (Plot) ---
    // Target the text next to 'Plot:'
    const plotParagraph = infoContainer.find("p:contains('Plot:')").first();
    let synopsisText = plotParagraph.text().trim();
    if (synopsisText) {
        // Extract the part after "Plot: "
        result.synopsis = synopsisText.replace(/Plot:\s*/, "").trim();
    } else {
         // Fallback to searching the whole metadata block
         const plotMatch = metadataText.match(/Plot: (.*?)\./i);
         result.synopsis = plotMatch ? plotMatch[1].trim() + '.' : "";
    }
    
    // --- IMDb ID ---
    // IMDb ID is not explicitly present (no ttXXXXXXX) but rating is.
    // We'll search for tt\d+ in the content.
    const imdbMatch = infoContainer.html()?.match(/tt\d+/i) || null;
    result.imdbId = imdbMatch ? imdbMatch[0] : "";
    
    // Optional: Extract IMDB Rating from the metadata text for internal logging/display
    // const ratingMatch = metadataText.match(/IMDB Ratings: ([\d\.]+)/i);
    // const imdbRating = ratingMatch ? ratingMatch[1] : "";
    
    // --- Image ---
    // Target the main image inside the content
    let image = infoContainer.find("p:first-of-type img[src]").first().attr("src") || "";
    result.image = image.startsWith("//") ? "https:" + image : image;

    // --- LinkList extraction (Crucially, keeping the link text) ---
    const links: Link[] = [];
    
    // The download links are structured as <h3><a class="..." href="..."> Link Text </a></h3>
    const downloadH3s = infoContainer.find("h3:has(a.wo, a.hsl, a.sdl)");

    downloadH3s.each((index, element) => {
      const el = $(element);
      const linkAnchor = el.find("a").first();
      const downloadLink = linkAnchor.attr("href");
      const linkText = linkAnchor.text().trim(); // This captures the desired text like " 1080p [2.74GB] "
      
      if (downloadLink) {
          const qualityMatch = linkText.match(/\d+p\b/)?.[0] || "Unknown Quality";
          
          const directLinks: Link["directLinks"] = [
              {
                  // Use the exact text from the <a> tag as the title
                  title: linkText, 
                  link: downloadLink,
                  type: "movie", 
              }
          ];

          links.push({
              // Title is the link text for the quality/size block
              title: linkText, 
              quality: qualityMatch,
              episodesLink: downloadLink, // Single link represents the "episode" (the movie)
              directLinks,
          });
      }
    });

    result.linkList = links;
    return result;
  } catch (err) {
    console.error("getMeta error:", err);
    return emptyResult;
  }
};