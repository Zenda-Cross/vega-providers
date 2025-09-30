import { Info, Link, EpisodeLink, ProviderContext } from "../types";

// शीर्षलेख (Headers)
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

// ====================================================================
//                             getMeta
// ====================================================================

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
    const infoContainer = $(".entry-content, .post-inner").length
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

    // --- प्रकार निर्धारण (Type determination) ---
    const infoParagraph = $("h2.movie-title").next("p").text();
    if (
      infoParagraph.includes("Season:") ||
      infoParagraph.includes("Episode:") ||
      infoParagraph.includes("SHOW Name:") ||
      $("h1").text().includes("Season")
    ) {
      result.type = "series"; // यदि 'Season' या 'Episode' का उल्लेख है, तो यह एक सीरीज़ है
    } else {
      result.type = "movie";
    }

    // --- शीर्षक, IMDb ID, छवि, सारांश निष्कर्षण तर्क (Title, IMDb, Image, Synopsis extraction logic) ---

    const rawTitle = $("h1").text().trim() || $("h2").text().trim();
    result.title = rawTitle.split(/\[| \d+p| x\d+/)[0].trim();
    const showNameMatch =
      infoParagraph.match(/SHOW Name: (.+)/) ||
      infoParagraph.match(/Name: (.+)/);
    if (showNameMatch && showNameMatch[1]) {
      result.title = result.title || showNameMatch[1].trim();
    }

    const imdbMatch =
      infoContainer.html()?.match(/tt\d+/) ||
      $("a[href*='imdb.com/title/']").attr("href")?.match(/tt\d+/);
    result.imdbId = imdbMatch ? imdbMatch[0] : "";

    let image =
      infoContainer.find(".post-thumbnail img").attr("src") ||
      infoContainer.find("img[src]").first().attr("src") ||
      "";
    if (image.startsWith("//")) image = "https:" + image;
    else if (image.startsWith("/")) image = baseUrl + image;
    if (image.includes("no-thumbnail") || image.includes("placeholder"))
      image = "";
    result.image = image;

    result.synopsis =
      infoContainer
        .find("div:contains('Movie-SYNOPSIS/Story')")
        .nextAll("div")
        .first()
        .text()
        .trim() ||
      $("h3.movie-title")
        .filter((i, el) => $(el).text().includes("Storyline"))
        .next("p")
        .text()
        .trim() ||
      infoContainer.find("p").first().text().trim() ||
      "";

    // --- लिंकलिस्ट निष्कर्षण (LinkList extraction) ---
    const links: Link[] = [];
    let currentTitleGroup = "";

    infoContainer.find("h5, h3").each((index, element) => {
      const el = $(element);
      
      const rawNode = el.get(0);
      const tag = rawNode && 'tagName' in rawNode ? rawNode.tagName.toLowerCase() : '';

      const text = el.text().trim();

      if (tag === "h5" && el.closest(".download-message-box").length) {
        // यह लिंक ग्रुप का नाम सेट करता है (जैसे: "Complete Season 2 Episode Wise")
        currentTitleGroup = text;
      } else if (tag === "h3" && text && el.find("a").length) {
        const anchor = el.find("a");
        const linkHref = anchor.attr("href");
        const linkText = anchor.text().trim();

        if (linkHref && linkText) {
          const qualityMatch = linkText.match(/\d+p\b/i)?.[0];

          if (qualityMatch) {
            let existingLink = links.find(
              (l) =>
                l.quality === qualityMatch &&
                l.title.includes(currentTitleGroup)
            );

            // यदि इस ग्रुप/गुणवत्ता के लिए कोई लिंक ऑब्जेक्ट मौजूद नहीं है, तो इसे बनाएं।
            if (!existingLink) {
              // सुधार: यदि currentTitleGroup खाली है (अक्सर मूवी के लिए), तो सिर्फ qualityMatch का उपयोग करें
              const title = currentTitleGroup ? `${currentTitleGroup} - ${qualityMatch}` : qualityMatch;
              existingLink = {
                title: title,
                quality: qualityMatch,
                episodesLink: "",
                directLinks: [], // डायरेक्ट डाउनलोड के लिए खाली सरणी
              };
              links.push(existingLink);
            }

            // --- एपिसोड/मूवी लिंक के लिए संशोधित शर्त ---
            
            const linkTextLower = linkText.toLowerCase();

            // isEpisodeLinkPointer: यह तभी TRUE होगा जब यह एक सीरीज़ है, ज़िप या बैच/कम्प्लीट लिंक नहीं है, और episodesLink अभी तक सेट नहीं किया गया है।
            const isEpisodeLinkPointer = 
                result.type === "series" && // 1. केवल सीरीज़ के लिए पॉइंटर चाहिए
                !currentTitleGroup.toLowerCase().includes("zip") && // 2. ग्रुप नाम में 'zip' नहीं होना चाहिए
                !linkTextLower.includes("complete link") && // 3. लिंक टेक्स्ट में 'complete link' नहीं होना चाहिए (नया चेक)
                !linkTextLower.includes("batch") && // 4. लिंक टेक्स्ट में 'batch' नहीं होना चाहिए (नया चेक)
                !existingLink.episodesLink; // 5. episodesLink पहले से सेट नहीं होना चाहिए

            if (isEpisodeLinkPointer) {
                // एपिसोड सूची वाले पेज का URL यहां असाइन करें
                existingLink.episodesLink = linkHref;
            } else {
                // यह या तो एक मूवी का डायरेक्ट लिंक है, एक ज़िप लिंक है, या एक सीरीज़ का बैच/डायरेक्ट डाउनलोड है।
                // इन सभी मामलों में, हम directLinks का उपयोग करते हैं।
                existingLink.directLinks!.push({ 
                    title: linkText,
                    link: linkHref,
                    // 'type' property हटा दी गई है ताकि यह आपके types.ts के साथ संकलित हो सके
                });
            }
          }
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
