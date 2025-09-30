import { ProviderContext, Stream } from "../types";

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
 * एक डाउनलोड पेज से HubCloud और GdFlix स्ट्रीमिंग/डाउनलोड लिंक को scrape करता है।
 */
export async function getStream({
  link,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, cheerio, extractors } = providerContext;
  const { hubcloudExtracter } = extractors;

  try {
    const streamLinks: Stream[] = [];
    console.log("getStream: Fetching download links from", link);

    const res = await axios.get(link, { headers, signal });
    const $ = cheerio.load(res.data);

    let hubcloudLink = "";
    let gdflixLink = "";

    // Regex to extract the URL from the window.open('URL', '_blank') call
    const onclickRegex = /window\.open\('([^']*)'/;

    // सभी बटनों को स्कैन करें जिनमें 'onclick' एट्रीब्यूट है
    $('button[onclick]').each((i, el) => {
      const onclickAttr = $(el).attr('onclick');
      const buttonText = $(el).text().trim();
      
      if (onclickAttr) {
        const match = onclickAttr.match(onclickRegex);
        
        if (match && match[1]) {
          const extractedLink = match[1];

          if (buttonText.includes('H-Cloud') && !hubcloudLink) {
            hubcloudLink = extractedLink;
          } else if (buttonText.includes('GdFlix') && !gdflixLink) {
            gdflixLink = extractedLink;
          }
        }
      }
    });
    
    // 1. HubCloud लिंक को प्रोसेस करें
    if (hubcloudLink) {
      console.log("Found H-Cloud Link:", hubcloudLink);
      // HubCloud एक्सट्रैक्टर का उपयोग करें जो स्ट्रीम लिंक देगा
      const hcStreams = await hubcloudExtracter(hubcloudLink, signal);
      streamLinks.push(...hcStreams);
    }

    // 2. GdFlix लिंक को प्रोसेस करें
    if (gdflixLink) {
      console.log("Found GdFlix Link:", gdflixLink);
      // GdFlix के लिए कोई एक्सट्रैक्टर न होने के कारण, इसे सीधे स्ट्रीम लिंक के रूप में जोड़ें
      streamLinks.push({
        server: "GdFlix",
        link: gdflixLink,
        type: "mkv", // या उपयुक्त प्रकार
      });
    }

    if (streamLinks.length === 0) {
        console.log("No HubCloud or GdFlix links could be extracted.");
    }

    return streamLinks;
  } catch (error: any) {
    console.log("getStream error: Failed to extract stream links.");
    if (error.message && !error.message.includes("Aborted")) {
         console.error(error);
    }
    return [];
  }
}
