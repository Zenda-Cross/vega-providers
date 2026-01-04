import { Info, Link, ProviderContext } from "../types";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;
  const res = await axios.get(link);
  const $ = cheerio.load(res.data);

  // 1. Extract Title
  // Tries the specific span first, falls back to h1
  const title = $("h1.page-title .material-text").text().trim() || 
                $("h1").text().trim();

  // 2. Extract Image
  // Gets the first image in the body (usually the poster)
  const image = $(".page-body img").first().attr("src") || 
                $("meta[property='og:image']").attr("content") || "";

  // 3. Extract Synopsis
  // Looks for the paragraph starting with "Storyline :"
  let synopsis = "";
  $("p").each((_, p) => {
    const text = $(p).text().trim();
    if (text.startsWith("Storyline :")) {
      synopsis = text.replace("Storyline :", "").trim();
    }
  });

  // 4. Extract Links (Download Buttons)
  const linkList: Link[] = [];

  $("a.buttn.direct").each((_, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().trim(); // e.g. "1080P [ 2.6GB ] Multi Link 1"

    if (href) {
      // Basic quality detection from the button text
      let quality = "HDRip";
      if (text.includes("1080P")) quality = "1080p";
      else if (text.includes("720P")) quality = "720p";
      else if (text.includes("480P")) quality = "480p";

      linkList.push({
        title: text, // Shows the full label (Quality + Size)
        quality: quality,
        episodesLink: "",
        directLinks: [
          {
            title: text,
            link: href, // This URL goes to stream.ts
            type: "movie", 
          },
        ],
      });
    }
  });

  return {
    title,
    synopsis,
    image,
    imdbId: "",
    type: "movie", 
    linkList, 
  };
}