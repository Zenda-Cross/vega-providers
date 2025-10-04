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
        // नोट: Cloudflare/Bot protection के लिए Hardcoded cookie यहाँ आवश्यक हो सकता है
        // इसे एक अधिक सामान्य या प्रदाता-विशिष्ट कॉन्फ़िगरेशन से प्राप्त करना बेहतर है।
        const fixedHeaders = {
            ...headers,
            cookie:
                "ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=Zl2yiOCN3pzGUd0Bgs.VyBXniJooDbG2Tk1g7DEoRnw-1756381111-1.2.1.1-RVPZoWGCAygGNAHavrVR0YaqASWZlJyYff8A.oQfPB5qbcPrAVud42BzsSwcDgiKAP0gw5D92V3o8XWwLwDRNhyg3DuL1P8wh2K4BCVKxWvcy.iCCxczKtJ8QSUAsAQqsIzRWXk29N6X.kjxuOTYlfB2jrlq12TRDld_zTbsskNcTxaA.XQekUcpGLseYqELuvlNOQU568NZD6LiLn3ICyFThMFAx6mIcgXkxVAvnxU; xla=s4t",
        };

        const res = await axios.get(url, {
            headers: fixedHeaders,
        });

        const $ = cheerio.load(res.data);
        // कंटेंट कंटेनर
        const container = $(".entry-content, .entry-inner, .download-links-div").first(); 
        
        // .unili-content,.code-block-1 जैसे अवांछित तत्वों को हटा दें
        $(".unili-content, .code-block-1").remove(); 
        
        const episodes: EpisodeLink[] = [];

        // HubCloud Links को लक्षित करने के लिए:
        // 1. Episode Title (h5) से शुरू करें
        // 2. उसके बाद के downloads-btns-div में HubCloud बटन खोजें
        
        container.find("h5").each((index, element) => {
            const el = $(element);
            const rawTitle = el.text().trim(); // e.g., "-:Episodes: 1:- (Grand Premiere)"
            
            // HubCloud लिंक को विशिष्ट स्टाइल और टेक्स्ट से खोजें
            // सेलेक्टर को अधिक लचीला बनाने के लिए, हम सिर्फ़ `a` टैग को लक्षित करते हैं 
            // जो विशिष्ट बटन स्टाइल के साथ `.downloads-btns-div` के अंदर है।
            const linkElement = el
                .next(".downloads-btns-div")
                .find(
                    'a[style*="#e629d0"][style*="#007bff"]' // संक्षिप्त स्टाइल मैच
                ).first(); // यदि एक से अधिक हैं तो पहला लें

            const hubCloudLink = linkElement.attr("href");
            
            if (rawTitle && hubCloudLink) {
                // टाइटल को साफ़ करें:
                // - सभी कोलन, हाइफ़न, और 'Episodes' शब्द को हटाएँ।
                // - ब्रैकेट में दी गई जानकारी को हटाएँ या साफ़ करें।
                // - अतिरिक्त whitespace को हटाएँ।
                let cleanedTitle = rawTitle
                    .replace(/[-:]/g, "")
                    .replace(/Episodes/i, "") // "Episodes" को हटाएँ
                    .trim();

                // '1 (Grand Premiere)' जैसी चीज़ों को 'Episode 1: Grand Premiere' में बदलने के लिए
                const match = cleanedTitle.match(/(\d+)\s*\((.+?)\)/i);
                if (match) {
                    // e.g., "Episode 1: Grand Premiere"
                    cleanedTitle = `Episode ${match[1]}: ${match[2]}`;
                } else {
                    // '1' या 'Episode 1' जैसी चीज़ों के लिए बस साफ़ करें
                    cleanedTitle = cleanedTitle.replace(/\s+/g, " ");
                }
                
                // Final Check and push
                if (cleanedTitle.length > 0) {
                    episodes.push({ 
                        title: cleanedTitle, 
                        link: hubCloudLink, 
                        // type को जोड़ने के लिए कोई अनुरोध नहीं था, लेकिन यह 'stream' हो सकता है।
                        // type: 'stream', 
                    });
                }
            }
        });

        return episodes;
    } catch (err) {
        console.log("getEpisodeLinks error:", url);
        // console.error(err);
        return [];
    }
};