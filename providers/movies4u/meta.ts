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
    let response = await axios.get(url, {
      headers: { ...headers, Referer: baseUrl },
    });

    if (
      response.data &&
      response.data.includes("Please turn JavaScript on and reload the page.")
    ) {
      const b1Match = response.data.match(/var b1=atob\(['"]([^'"]+)['"]\)/);
      const a2Match = response.data.match(/_0x2aa8=\[['"]([^'"]+)['"]\]/);
      const c3Match = response.data.match(/c3=toNumbers\(['"]([^'"]+)['"]\)/);

      if (b1Match && a2Match && c3Match) {
        const unescapeHexStr = (str: string) =>
          str.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) =>
            String.fromCharCode(parseInt(hex, 16)),
          );

        const minJsRes = await axios.get(`${baseUrl}/min.js`, {
          headers: { ...headers, Referer: baseUrl },
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

        response = await axios.get(url, {
          headers: { ...headers, Referer: baseUrl, Cookie: newCookie },
        });
      }
    }

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

    // --- Type determination ---
    const infoParagraph = $("h2.movie-title").next("p").text();
    if (
      infoParagraph.includes("Season:") ||
      infoParagraph.includes("Episode:") ||
      infoParagraph.includes("SHOW Name:")
    ) {
      result.type = "series";
    } else {
      result.type = "movie";
    }

    // --- Title ---
    const rawTitle = $("h1").text().trim() || $("h2").text().trim();
    result.title = rawTitle.split(/\[| \d+p| x\d+/)[0].trim();
    const showNameMatch =
      infoParagraph.match(/SHOW Name: (.+)/) ||
      infoParagraph.match(/Name: (.+)/);
    if (showNameMatch && showNameMatch[1]) {
      result.title = result.title || showNameMatch[1].trim();
    }

    // --- IMDb ID ---
    const imdbMatch =
      infoContainer.html()?.match(/tt\d+/) ||
      $("a[href*='imdb.com/title/']").attr("href")?.match(/tt\d+/);
    result.imdbId = imdbMatch ? imdbMatch[0] : "";

    // --- Image ---
    let image =
      infoContainer.find(".post-thumbnail img").attr("src") ||
      infoContainer.find("img[src]").first().attr("src") ||
      "";
    if (image.startsWith("//")) image = "https:" + image;
    else if (image.startsWith("/")) image = baseUrl + image;
    if (image.includes("no-thumbnail") || image.includes("placeholder"))
      image = "";
    result.image = image;

    // --- LinkList extraction ---
    const links: Link[] = [];

    // The site changed its layout. Links are now inside <p> tags following <h3> or <h4> tags with quality info.
    // We can also just look for the <a> tags directly and find their preceding quality headers.
    const hElements = infoContainer.find("h3, h4, p");

    hElements.each((index, element) => {
      const el = $(element);
      const titleText = el.text().trim();
      const qualityMatch = titleText.match(/\d+p\b/)?.[0];
      const fullTitle = titleText;

      // The download buttons are usually in the next <p> tag
      const downloadButtons = el.nextAll().find("a").first();

      if (downloadButtons.length && qualityMatch && titleText.length < 350) {
        if (result.type === "series") {
          links.push({
            title: fullTitle,
            quality: qualityMatch,
            episodesLink: downloadButtons.attr("href") || "",
            directLinks: [],
          });
        } else {
          // Movie: collect all direct download buttons
          const directLinks: Link["directLinks"] = [];

          const link = downloadButtons.attr("href");
          if (link) {
            directLinks.push({
              title: downloadButtons.text().trim() || "Download",
              link,
              type: "movie", // literal type
            });
          }

          if (directLinks.length) {
            links.push({
              title: fullTitle,
              quality: qualityMatch,
              episodesLink: "",
              directLinks,
            });
          }
        }
      }
    });

    // Deduplicate links by href
    const uniqueLinks = new Map<string, Link>();
    links.forEach((link) => {
      const href = link.episodesLink || link.directLinks?.[0]?.link;
      if (href && !uniqueLinks.has(href)) {
        uniqueLinks.set(href, link);
      }
    });
    result.linkList = Array.from(uniqueLinks.values());
    return result;
  } catch (err) {
    console.log("getMeta error:", err);
    return emptyResult;
  }
};
