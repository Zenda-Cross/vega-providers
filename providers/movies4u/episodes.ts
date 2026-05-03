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
    let res = await axios.get(url, {
      headers: {
        ...headers,
        // Cloudflare/Bot protection के लिए Hardcoded cookie यहाँ आवश्यक हो सकता है
        cookie:
          "ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=Zl2yiOCN3pzGUd0Bgs.VyBXniJooDbG2Tk1g7DEoRnw-1756381111-1.2.1.1-RVPZoWGCAygGNAHavrVR0YaqASWZlJyYff8A.oQfPB5qbcPrAVud42BzsSwcDgiKAP0gw5D92V3o8XWwLwDRNhyg3DuL1P8wh2K4BCVKxWvcy.iCCxczKtJ8QSUAsAQqsIzRWXk29N6X.kjxuOTYlfB2jrlq12TRDld_zTbsskNcTxaA.XQekUcpGLseYqELuvlNOQU568NZD6LiLn3ICyFThMFAx6mIcgXkxVAvnxU; xla=s4t",
      },
    });

    if (
      res.data &&
      res.data.includes("Please turn JavaScript on and reload the page.")
    ) {
      const b1Match = res.data.match(/var b1=atob\(['"]([^'"]+)['"]\)/);
      const a2Match = res.data.match(/_0x2aa8=\[['"]([^'"]+)['"]\]/);
      const c3Match = res.data.match(/c3=toNumbers\(['"]([^'"]+)['"]\)/);

      if (b1Match && a2Match && c3Match) {
        const unescapeHexStr = (str: string) =>
          str.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) =>
            String.fromCharCode(parseInt(hex, 16)),
          );

        const baseUrl = url.split("/").slice(0, 3).join("/");
        const minJsRes = await axios.get(`${baseUrl}/min.js`, {
          headers,
        });

        const b1Hex = atob(unescapeHexStr(b1Match[1]));
        const a2Hex = atob(unescapeHexStr(a2Match[1]));
        const c3Hex = unescapeHexStr(c3Match[1]);

        const solver = new Function(
          "c3Hex",
          "a1Hex",
          "b2Hex",
          `
          ${minJsRes.data}
          function toNumbers(d){var e=[];d.replace(/(..)/g,function(d){e.push(parseInt(d,16))});return e}
          function toHex(){for(var d=[],d=1==arguments.length&&arguments[0].constructor==Array?arguments[0]:arguments,e='',f=0;f<d.length;f++)e+=(16>d[f]?'0':'')+d[f].toString(16);return e.toLowerCase()}
          return toHex(slowAES.decrypt(toNumbers(c3Hex), 2, toNumbers(a1Hex), toNumbers(b2Hex)));
        `,
        );

        const decrypted = solver(c3Hex, a2Hex, b1Hex);
        const newCookie = `Antiddos-systems-DH=${decrypted}`;

        res = await axios.get(url, {
          headers: { ...headers, Cookie: newCookie },
        });
      }
    }

    const $ = cheerio.load(res.data);
    const container = $(".entry-content,.entry-inner, .download-links-div");

    // .unili-content,.code-block-1 जैसे अवांछित तत्वों को हटा दें
    $(".unili-content,.code-block-1").remove();

    const episodes: EpisodeLink[] = [];

    // The site changed its layout. Links are now inside <p> tags following <h3> or <h4> tags with quality info.
    // We can also just look for the <a> tags directly and find their preceding quality headers.
    const hElements = container.find("h3, h4, h5, p");

    hElements.each((index, element) => {
      const el = $(element);
      const title = el.text().trim();

      // The download buttons are usually in the next <p> tag
      const downloadButtons = el.nextAll().find("a").first();
      const link = downloadButtons.attr("href");

      if (
        title &&
        link &&
        title.match(/Episode|Ep|E\d+/i) &&
        title.length < 150
      ) {
        // Clean up the title
        const cleanedTitle = title.replace(/[-:]/g, "").trim();

        // Deduplicate
        if (!episodes.some((e) => e.link === link)) {
          episodes.push({
            title: cleanedTitle,
            link: link,
          });
        }
      }
    });

    // Fallback: if no episodes found by heading, just grab all mdrive/fastdl links
    if (episodes.length === 0) {
      $("a").each((i, el) => {
        const href = $(el).attr("href");
        if (
          href &&
          (href.includes("mdrive") ||
            href.includes("fastdl") ||
            href.includes("filebee") ||
            href.includes("gdflix"))
        ) {
          const title =
            $(el).parent().prev().text().trim() ||
            $(el).text().trim() ||
            `Episode ${i + 1}`;
          if (!episodes.some((e) => e.link === href)) {
            episodes.push({
              title: title.replace(/[-:]/g, "").trim(),
              link: href,
            });
          }
        }
      });
    }

    // console.log(episodes);
    return episodes;
  } catch (err) {
    console.log("getEpisodeLinks error: ");
    // console.error(err);
    return [];
  }
};
