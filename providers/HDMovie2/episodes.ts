import { EpisodeLink, ProviderContext } from "../types";

// यहाँ `getEpisodes` फ़ंक्शन मान रहा है कि यह उस पेज को स्क्रैप कर रहा है 
// जो 'Download Links' बटन से प्राप्त हुआ है (जैसे m4ulinks.com/number/42882)

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio, commonHeaders: headers } = providerContext;
  console.log("getEpisodeLinks", url);
  try {
    // Note: Cookies को URL के आधार पर अपडेट करने की आवश्यकता हो सकती है
    const res = await axios.get(url, {
      headers: {
        ...headers,
        // Cloudflare/Bot protection के लिए Hardcoded cookie यहाँ आवश्यक हो सकता है
        cookie:
          "ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=Zl2yiOCN3pzGUd0Bgs.VyBXniJooDbG2Tk1g7DEoRnw-1756381111-1.2.1.1-RVPZoWGCAygGNAHavrVR0YaqASWZlJyYff8A.oQfPB5qbcPrAVud42BzsSwcDgiKAP0gw5D92V3o8XWwLwDRNhyg3DuL1P8wh2K4BCVKxWvcy.iCCxczKtJ8QSUAsAQqsIzRWXk29N6X.kjxuOTYlfB2jrlq12TRDld_zTbsskNcTxaA.XQekUcpGLseYqELuvlNOQU568NZD6LiLn3ICyFThMFAx6mIcgXkxVAvnxU; xla=s4t",
      },
    });
    const $ = cheerio.load(res.data);
    const container = $(".entry-content,.entry-inner, .download-links-div"); 
    
    // .unili-content,.code-block-1 जैसे अवांछित तत्वों को हटा दें
    $(".unili-content,.code-block-1").remove(); 
    
    const episodes: EpisodeLink[] = [];

    // HubCloud Links को लक्षित करने के लिए:
    // 1. Episode Title (h5) से शुरू करें
    // 2. उसके बाद के downloads-btns-div में HubCloud बटन खोजें
    
    container.find("h5").each((index, element) => {
      const el = $(element);
      const title = el.text().trim(); // e.g., "-:Episodes: 1:- (Grand Premiere)"
      
      // HubCloud लिंक को विशिष्ट स्टाइल और टेक्स्ट से खोजें
      // बटन सेलेक्टर: style="background: linear-gradient(135deg,#e629d0,#007bff);color: white;"
      const hubCloudLink = el
        .next(".downloads-btns-div")
        .find(
          'a[style*="background: linear-gradient(135deg,#e629d0,#007bff);"]'
        )
        .attr("href");

      if (title && hubCloudLink) {
        // टाइटल को साफ़ करें (e.g., सिर्फ़ Episode 1: Grand Premiere रखें)
        const cleanedTitle = title.replace(/[-:]/g, "").trim(); 
        
        episodes.push({ 
            title: cleanedTitle, 
            link: hubCloudLink, 
            // यदि यह HubCloud/Streaming लिंक है, तो आप 'type' को यहाँ 'stream' भी सेट कर सकते हैं
        });
      }
    });

    // console.log(episodes);
    return episodes;
  } catch (err) {
    console.log("getEpisodeLinks error: ");
    // console.error(err);
    return [];
  }
};