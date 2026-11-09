import { EpisodeLink, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";
import {
  enrichCinemetaEpisodes,
  getCinemetaMeta,
  readCinemetaContext,
} from "../getCinemetaMeta";
import { enrichEpisodesWithSkipTimings } from "../theintrodb";

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
    const context = readCinemetaContext(url);
    const requestUrl = context.requestUrl;
    // Note: Cookies को URL के आधार पर अपडेट करने की आवश्यकता हो सकती है
    let res = await axios.get(requestUrl, {
      headers,
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

        const baseUrl = requestUrl.split("/").slice(0, 3).join("/");
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

        res = await axios.get(requestUrl, {
          headers: { ...headers, Cookie: newCookie },
        });
      }
    }

    const $ = cheerio.load(res.data);
    $("script,style,.code-block,.unili-content,nav,footer").remove();
    const container = $("#container-content-single").first().length ? $("#container-content-single").first() : $("body");
    const episodes: EpisodeLink[] = [];
    let activeTitle = "";
    const seen = new Set<string>();
    // Walk in document order: the host nests later episodes inside wrappers,
    // and its first episode is outside .entry-content entirely.
    container.find("h2,h3,h4,h5,p,a[href]").each((_, element) => {
      const el = $(element);
      if (!el.is("a")) {
        if (el.find("a").length) return;
        const text = el.text().replace(/\s+/g, " ").trim();
        const match = text.match(/\b(?:episodes?|ep)\s*[:. -]*\s*(\d+)|\bE(\d+)\b/i);
        if (match && text.length < 150) activeTitle = "Episode " + (match[1] || match[2]);
        else if (el.is("h2,h3,h4,h5")) activeTitle = "";
        return;
      }
      if (!activeTitle || seen.has(activeTitle)) return;
      const href = el.attr("href") || "";
      if (!/hubcloud|hubdrive|mdrive|fastdl|filebee|gdflix|vcloud/i.test(href)) return;
      const target = new URL(href, requestUrl).href;
      if (!/^https?:/i.test(target)) return;
      seen.add(activeTitle);
      episodes.push({title: activeTitle, link: target});
    });

    const quickDownload = await providerContext.kvStore?.get<boolean>("movies4u_quickDownload");
    if (!context.imdbId || !context.season) {
      return episodes.map((e) => ({
        ...e,
        quickDownload: quickDownload ?? true,
      }));
    }

    let enriched = episodes;
    try {
      const cinemeta = await getCinemetaMeta(
        context.imdbId,
        "series",
        providerContext,
      );
      if (cinemeta) {
        enriched = enrichCinemetaEpisodes(
          episodes,
          cinemeta.videos || [],
          context.season,
        );
      }
    } catch (e) {
      console.warn("Movies4u: Cinemeta episode lookup failed", e);
    }

    const skipTimings = await providerContext.kvStore?.get<boolean>("movies4u_skipTimings");
    if (skipTimings ?? true) {
      try {
        enriched = await enrichEpisodesWithSkipTimings(
          enriched,
          context.imdbId,
          context.season,
          providerContext,
        );
      } catch (e) {
        console.warn("Movies4u: Skip timings lookup failed", e);
      }
    }
    return enriched.map((e) => ({
      ...e,
      quickDownload: quickDownload ?? true,
    }));
  } catch (err) {
    throwProviderError("Movies4u", "episodes", err);
  }
};
