import { Info, Link, ProviderContext } from "../types";

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Cache-Control": "no-store",
  "Accept-Language": "en-US,en;q=0.9",
  DNT: "1",
  Cookie:
    "xla=s4t; _ga=GA1.1.1081149560.1756378968; _ga_BLZGKYN5PF=GS2.1.s1756378968$o1$g1$t1756378984$j44$l0$h0",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;

  const empty: Info = {
    title: "",
    synopsis: "",
    image: "",
    imdbId: "",
    type: "series", 
    linkList: [],
  };

  try {
    const response = await axios.get(link, { headers });
    const $ = cheerio.load(response.data);

    const result: Info = {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "series", // Default to series
      linkList: [],
    };

    // --- Extraction based on NEW HTML structure ---

    // TITLE: Target h1 with class 'entry-title' inside the center-aligned div
    const rawTitle = $(".dfxb.alg-cr .entry-title").text().trim();
    result.title = rawTitle;

    // POSTER IMAGE: Target the img inside the center-aligned div
    let image = $(".dfxb.alg-cr img[alt]").attr("src") || "";
    if (image.startsWith("//")) image = "https:" + image;
    result.image = image;

    // SYNOPSIS: Target the p inside the 'description' div
    result.synopsis = $(".description p").text().trim();

    // The provided HTML is a series page, so we focus on episode list links.
    result.type = "series";
    
    // EPISODE LINKS: Target the <li> articles inside the #episode_by_temp ul
    const episodeArticles = $("#episode_by_temp .post.episodes");

    if (episodeArticles.length > 0) {
      episodeArticles.each((i, el) => {
        const article = $(el);
        const linkElement = article.find("a.lnk-blk");
        const episodesLink = linkElement.attr("href");
        
        // Example: 1x1, 1x2, etc.
        const numEpi = article.find(".num-epi").text().trim(); 
        // Example: May I Ask for One Final Thing? 1x1
        const episodeTitle = article.find(".entry-title").text().trim(); 

        // Extract Season and Episode numbers for quality/labeling
        const match = numEpi.match(/(\d+)x(\d+)/);
        let qualityTag = "Unknown";
        let seasonNum = 1;
        let episodeNum = 1;

        if (match) {
            seasonNum = parseInt(match[1]);
            episodeNum = parseInt(match[2]);
            qualityTag = `S${seasonNum}`; // Using S# as the quality for season grouping
        }

        if (episodesLink) {
          result.linkList.push({
            title: episodeTitle,
            quality: qualityTag, 
            episodesLink: episodesLink,
            directLinks: [], 
          });
        }
      });
    }
    
    // Sort links from E1 to E_n to ensure chronological order, 
    // although the scraper should pick them up in page order.
    result.linkList.sort((a, b) => {
        const matchA = a.title.match(/(\d+)x(\d+)/);
        const matchB = b.title.match(/(\d+)x(\d+)/);
        
        if (!matchA || !matchB) return 0; // Fallback if titles don't match pattern

        const sA = parseInt(matchA[1]);
        const eA = parseInt(matchA[2]);
        const sB = parseInt(matchB[1]);
        const eB = parseInt(matchB[2]);

        if (sA !== sB) {
            return sA - sB;
        }
        return eA - eB;
    });

    return result;
  } catch (err) {
    console.log("Meta error:", err);
    return empty;
  }
};