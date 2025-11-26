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
    const content = $(".entry-content, .post-inner").length
      ? $(".entry-content, .post-inner")
      : $("body");

    const result: Info = {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };

    // --- Title ---
    let rawTitle = content.find("h1, h2").first().text().trim();
    rawTitle = rawTitle.replace(/^Download\s*/i, ""); // remove "Download" word
    result.title = rawTitle;

    // --- Type Detect ---
    const pageText = content.text();
    if (/Season\s*\d+/i.test(pageText) || /Episode\s*\d+/i.test(pageText)) {
      result.type = "series";
    } else {
      result.type = "movie";
    }

    // --- IMDb ID ---
    const imdbHref = content.find("a[href*='imdb.com/title/']").attr("href");
    const imdbMatch = imdbHref?.match(/tt\d+/);
    result.imdbId = imdbMatch ? imdbMatch[0] : "";

    // --- Image ---
    let image =
      content.find("img").first().attr("data-src") ||
      content.find("img").first().attr("src") ||
      "";
    if (image.startsWith("//")) image = "https:" + image;
    else if (image.startsWith("/")) image = baseUrl + image;
    if (image.includes("no-thumbnail") || image.includes("placeholder"))
      image = "";
    result.image = image;

    // --- Synopsis ---
    result.synopsis = content.find("p").first().text().trim() || "";

    // --- Download Links Extraction ---
    const links: Link[] = [];

    if (result.type === "series") {
      content.find("h3").each((_, h3) => {
        const h3Text = $(h3).text().trim();
        const qualityMatch = h3Text.match(/\d+p/)?.[0] || "";
        const paragraph = $(h3).next("p");

        const directLinks: { title: string; link: string; type: string }[] = [];
        let episodesLink = "";

        // Check for the "Episode Links" button structure (New Type)
        const episodeLinksButton = paragraph
          .find("a")
          .filter((_, a) => /Episode Links/i.test($(a).text()))
          .first();

        if (episodeLinksButton.length > 0) {
          // Case: Single "Episode Links" button
          episodesLink = episodeLinksButton.attr("href") || "";

        } else {
          // Case: Multi-button structure (G-Direct, Zee-Cloud, Batch/Zip)

            // --- Find Zee-Cloud (Resumable) link and use as main episodesLink and add to directLinks ---
          const zeeCloudLink = paragraph
            .find("a")
            .filter((_, a) => /Zee-Cloud/i.test($(a).text()))
            .first()
            .attr("href");

          if (zeeCloudLink) {
                // Use Zee-Cloud as the main episodesLink
              episodesLink = zeeCloudLink; 
                
            directLinks.push({
              title: "Zee-Cloud [Resumable]",
              link: zeeCloudLink,
              type: "episode",
            });
          }

            // --- Find G-Direct (Instant) link and add to directLinks (optional, based on request to remove from main link) ---
            // If you want to include G-Direct as a *directLink* but NOT the *episodesLink*, use this:
            const gDirectLink = paragraph
            .find("a")
            .filter((_, a) => /G-Direct/i.test($(a).text()))
            .first()
            .attr("href");
            
            if (gDirectLink) {
                directLinks.push({
                    title: "G-Direct [Instant]",
                    link: gDirectLink,
                    type: "episode",
                });
            }

          // Find Batch/Zip link and add to directLinks
          const batchLink = paragraph
            .find("a")
            .filter((_, a) => /Batch|Zip/i.test($(a).text()))
            .first()
            .attr("href");

          if (batchLink) {
            directLinks.push({
              title: "Batch/Zip",
              link: batchLink,
              type: "batch",
            });
          }
        }
        
        // If we found any link (either episodesLink or directLinks), add the entry
        if (episodesLink || directLinks.length > 0) {
          links.push({
            title: h3Text,
            quality: qualityMatch,
            episodesLink: episodesLink,
             // Include all found direct links
          });
        }
      });

      // 🛑 The h5 logic from the original code (V-Cloud/Episode Links) is removed
      // to avoid redundancy with the robust h3 logic, but if you have h5 series
      // links that don't fit the above structure, you may need to re-add that.

    } else {
      // ✅ Movie case: unchanged (using h5)
      // Collect all h5 elements first
const movieBlocks = content.find("h5").toArray();

// Now process with async-friendly loop
for (const h5 of movieBlocks) {
    const h5Text = $(h5).text().trim();
    const qualityMatch = h5Text.match(/\d+p/)?.[0] || "";

    const href = $(h5).next("p").find("a").attr("href");

    if (!href) continue;

    try {
        // Load next page
        const page = await axios.get(href);
        const $$ = cheerio.load(page.data);

        // Find ONLY ZeeCloud link
        const finalLink = $$("a")
            .map((i, el) => $$(el).attr("href"))
            .get()
            .find(l =>
                l &&
                (l.includes("zcloud") ||
                 l.includes("zee-cloud") ||
                 l.includes("zeecloud"))
            );

        if (finalLink) {
            links.push({
                title: h5Text,
                quality: qualityMatch,
                episodesLink: "",
                directLinks: [
                    { title: "ZeeCloud", link: finalLink, type: "movie" }
                ],
            });
        }

    } catch (err) {
        console.log("ZeeCloud scrape error:", err);
    }
}

}
    result.linkList = links;
    return result;
  } catch (err) {
    console.error(
      "getMeta error:",
      err instanceof Error ? err.message : err
    );
    return emptyResult;
  }
};