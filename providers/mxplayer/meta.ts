import { Info, ProviderContext } from "../types";

const defaultHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;

  try {
    const res = await axios.get(link, { headers: defaultHeaders });
    const $ = cheerio.load(res.data);

    // Basic Metadata
    const title = $("h1").first().text().trim() || "";
    const description = $(".description").text().trim() || "";
    
    // Find Image
    let image = "";
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (ogImage) image = ogImage;

    const info: Info = {
      title,
      synopsis: description,
      image,
      imdbId: "",
      type: "movie", // default
      linkList: [],
    };

    // Check for Seasons (TV Series logic from Kotlin: div.hs__items-container > div)
    const seasonTabs = $("div.hs__items-container > div");
    
    if (seasonTabs.length > 0) {
      info.type = "series";
      seasonTabs.each((_: any, el: any) => {
        const tabId = $(el).attr("data-id");
        const tabIndex = $(el).attr("data-tab"); // usually corresponds to season number
        
        if (tabId) {
          info.linkList.push({
            title: `Season ${parseInt(tabIndex || "0") + 1}`, // MX indices often start at 0
            quality: "Standard",
            // We pass the API ID required to fetch episodes
            episodesLink: tabId, 
            directLinks: [],
          });
        }
      });
    } else {
      // It's a Movie. The stream might be in the initial page state or we might need to 
      // rely on the fact that for movies, the "link" passed to episodes 
      // is just the web link, and we handle movie extraction there.
      info.linkList.push({
        title: "Movie",
        quality: "Default",
        episodesLink: link, // Pass the web link for movies
        directLinks: [],
      });
    }

    return info;
  } catch (err) {
    console.error("MPlayer Meta Error", err);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };
  }
};