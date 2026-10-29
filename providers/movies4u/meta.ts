import { formatSeasonLinks } from "../formatSeasonLinks";
import { Info, Link, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import { throwProviderError } from "../providerErrors";
import {
  addCinemetaContext,
  applyCinemetaMeta,
  getCinemetaMeta,
  getCinemetaSeason,
} from "../getCinemetaMeta";

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
  const baseUrl = await getBaseUrl("movies4u");
  const url = new URL(link, `${baseUrl}/`).href;

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
    $("script,style,.code-block,.unili-content").remove();
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

    // Preserve field boundaries instead of concatenating every <br> line.
    const fieldContent = infoContainer.clone();
    fieldContent.find("br").replaceWith("\n");
    const infoParagraph = fieldContent.text();
    const rawTitle = $("h1.entry-title, h1").first().text().trim();
    const name = infoParagraph.match(/(?:Series|SHOW|Movie)\s*Name\s*:\s*([^\n]+)/i)?.[1]?.trim();
    result.type = /(?:Series|SHOW)\s*Name\s*:|Season\s*:/i.test(infoParagraph) || /\bseason\s*\d+|\bweb[ -]?series\b/i.test(rawTitle) ? "series" : "movie";
    result.title = name || rawTitle.replace(/^Download\s+/i, "").split(/\[|\b(?:480|720|1080|2160)p\b/i)[0].trim();
    const plotHeading = infoContainer.find("h2,h3,h4").filter((_, el) => /synopsis|plot|storyline/i.test($(el).text())).first();
    result.synopsis = plotHeading.nextAll("p").first().text().trim();

    // --- IMDb ID ---
    const imdbMatch =
      infoContainer.html()?.match(/tt\d+/) ||
      $("a[href*='imdb.com/title/']").attr("href")?.match(/tt\d+/);
    result.imdbId = imdbMatch ? imdbMatch[0] : "";

    // --- Image ---
    let image = $("meta[property='og:image']").attr("content") ||
      $(".post-thumbnail img").first().attr("data-src") || $(".post-thumbnail img").first().attr("src") ||
      infoContainer.find("img").first().attr("data-src") || infoContainer.find("img[src]").first().attr("src") || "";
    if (image.startsWith("//")) image = "https:" + image;
    else if (image.startsWith("/")) image = baseUrl + image;
    if (image.includes("no-thumbnail") || image.includes("placeholder"))
      image = "";
    result.image = image;

    // --- LinkList extraction ---
    const links: Link[] = [];

    // A heading owns only the siblings before the next heading.
    infoContainer.find("h2,h3,h4,h5").each((_, element) => {
      const heading = $(element);
      const title = heading.text().replace(/\s+/g, " ").trim();
      const quality = title.match(/\b(?:360|480|720|1080|2160)p\b/i)?.[0];
      if (!quality || title.length > 350) return;
      const buttons = heading.nextUntil("h2,h3,h4,h5").find("a[href]");
      const directLinks: NonNullable<Link["directLinks"]> = [];
      buttons.each((_, anchor) => {
        const button = $(anchor);
        if (/batch|zip|pack/i.test(button.text())) return;
        const href = button.attr("href");
        if (/\.(?:apk|zip)(?:[?#]|$)/i.test(href || "")) return;
        if (!href || !/^https?:/i.test(new URL(href, url).href)) return;
        const target = new URL(href, url).href;
        if (result.type === "series") links.push({ title, quality, episodesLink: target });
        else directLinks.push({ title: button.text().trim() || "Download", link: target, type: "movie" });
      });
      if (directLinks.length) links.push({ title, quality, directLinks });
    });

    // Deduplicate links by href
    const uniqueLinks = new Map<string, Link>();
    links.forEach((link) => {
      const href = link.episodesLink || link.directLinks?.[0]?.link;
      if (href && !uniqueLinks.has(href)) {
        uniqueLinks.set(href, link);
      }
    });
    result.linkList = formatSeasonLinks(Array.from(uniqueLinks.values()));
    result.webUrl = url;
    const quickDownload = await providerContext.kvStore?.get<boolean>("movies4u_quickDownload");
    result.quickDownload = quickDownload ?? true;
    const imdbId = result.imdbId;
    if (!imdbId) return result;

    try {
      const cinemeta = await getCinemetaMeta(
        imdbId,
        result.type,
        providerContext,
      );
      if (cinemeta) {
        if (result.type === "series" && cinemeta.type === "series") {
          result.linkList = result.linkList.map((item) => {
            if (!item.episodesLink) return item;
            const season =
              getCinemetaSeason(item.title) ||
              getCinemetaSeason(infoParagraph) ||
              getCinemetaSeason(rawTitle);
            if (!season) return item;
            return {
              ...item,
              episodesLink: addCinemetaContext(
                new URL(item.episodesLink, url).href,
                imdbId,
                season,
              ),
            };
          });
        }
        return applyCinemetaMeta(result, cinemeta);
      }
    } catch (e) {
      console.warn("Movies4u: Cinemeta lookup failed", e);
    }
    return result;
  } catch (err) {
    throwProviderError("Movies4u", "metadata", err);
  }
};
