import { EpisodeLink, Info, Link, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

const BASE_URL = "https://anikototv.bz";
const ALT_BASE_URL = "https://anikototv.to";

function resolveResponseOrigin(
  res: any,
  htmlDataUrl?: string,
  fallback: string = BASE_URL
): string {
  try {
    const rawUrl =
      (typeof res?.request === "string" && res.request) ||
      res?.request?.responseURL ||
      res?.request?.res?.responseUrl ||
      htmlDataUrl ||
      fallback;
    return new URL(rawUrl).origin;
  } catch {
    return fallback;
  }
}

function rc4(key: string, input: string): string {
  const s = Array.from({ length: 256 }, (_, i) => i);
  let a = 0;
  for (let n = 0; n < 256; n++) {
    a = (s[n] + a + key.charCodeAt(n % key.length)) % 256;
    const tmp = s[n];
    s[n] = s[a];
    s[a] = tmp;
  }
  let out = "";
  let n2 = 0;
  let a2 = 0;
  for (let r = 0; r < input.length; r++) {
    n2 = (n2 + 1) % 256;
    a2 = (s[n2] + a2) % 256;
    const tmp2 = s[n2];
    s[n2] = s[a2];
    s[a2] = tmp2;
    const k = s[(s[n2] + s[a2]) % 256];
    out += String.fromCharCode(input.charCodeAt(r) ^ k);
  }
  return out;
}

function encodeBase64(str: string): string {
  if (typeof btoa === "function") {
    try {
      return btoa(str);
    } catch {
      // fallback
    }
  }
  if (typeof Buffer !== "undefined") {
    try {
      return Buffer.from(str, "binary").toString("base64");
    } catch {
      // fallback
    }
  }
  return "";
}

function encodeVrf(animeId: string): string {
  const encrypted = rc4("simple-hash", animeId);
  return encodeBase64(encrypted);
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio } = providerContext;

    let watchUrl = link;
    if (!watchUrl.startsWith("http")) {
      watchUrl = `${BASE_URL}${watchUrl.startsWith("/") ? "" : "/"}${watchUrl}`;
    } else {
      watchUrl = watchUrl.replace(/^https?:\/\/(?:www\.)?anikototv\.[a-z]+/i, BASE_URL);
    }
    if (!watchUrl.includes("/ep-")) {
      watchUrl = `${watchUrl.replace(/\/+$/, "")}/ep-1`;
    }

    // Post links can point at any Anikoto mirror (for example anikototv.bz),
    // so read the slug from the path instead of stripping the hardcoded host.
    const slug =
      watchUrl.match(/\/watch\/([^/?#]+)/)?.[1] ||
      watchUrl
        .replace(/[?#].*$/, "")
        .replace(/\/+$/, "")
        .split("/")
        .pop() ||
      "";

    const res = await axios.get(watchUrl, {
      headers: {
        ...providerContext.commonHeaders,
        Referer: `${BASE_URL}/`,
      },
    });

    const $ = cheerio.load(res.data);
    const htmlDataUrl = $("#watch-page, #watch-main, .watch-wrap, [data-url]")
      .first()
      .attr("data-url");
    const origin = resolveResponseOrigin(res, htmlDataUrl);
    const title =
      $("h1.title").text().trim() ||
      $(".binfo h1").text().trim() ||
      slug;

    const synopsis =
      $("div.synopsis div.content").text().trim() ||
      $("div.synopsis").text().trim() ||
      "";

    const image =
      $("#w-info .poster img, .poster img").first().attr("src") ||
      $("img").first().attr("src") ||
      "";

    const rating =
      $("[itemprop='ratingValue']").first().text().trim() ||
      $(".meta div:contains('MAL'), #w-info div:contains('MAL')")
        .first()
        .text()
        .match(/MAL:\s*(\d+(?:\.\d+)?)/)?.[1] ||
      $(".score .value").text().match(/\d+(?:\.\d+)?/)?.[0] ||
      undefined;

    const tags: string[] = [];
    $("div:contains(Genres) span a, .genre a").each((_, el) => {
      const g = $(el).text().trim();
      if (g && !tags.includes(g)) tags.push(g);
    });

    const typeText = $(".meta div:contains(Type) span, .m-item span")
      .first()
      .text()
      .trim()
      .toLowerCase();
    const type = typeText.includes("movie") ? "movie" : "series";

    const animeId = $("#watch-page, #watch-main, .watch-wrap, [data-id]")
      .first()
      .attr("data-id");

    const linkList: Link[] = [];

    if (animeId) {
      const vrf = encodeURIComponent(encodeVrf(animeId));
      const fetchEpisodeList = (hostOrigin: string) =>
        axios.get(
          `${hostOrigin}/ajax/episode/list/${animeId}?vrf=${vrf}&style=default`,
          {
            headers: {
              ...providerContext.commonHeaders,
              "X-Requested-With": "XMLHttpRequest",
              Referer: `${hostOrigin}/watch/${slug}/ep-1`,
            },
          }
        );

      let activeOrigin = origin;
      let epRes: any;
      try {
        epRes = await fetchEpisodeList(activeOrigin);
      } catch {
        epRes = undefined;
      }
      if (epRes?.data?.status !== 200) {
        const retryOrigin = activeOrigin === BASE_URL ? ALT_BASE_URL : BASE_URL;
        try {
          epRes = await fetchEpisodeList(retryOrigin);
          if (epRes?.data?.status === 200) {
            activeOrigin = resolveResponseOrigin(epRes, htmlDataUrl, retryOrigin);
          }
        } catch {
          // ignore fallback error
        }
      }

      if (epRes?.data?.status === 200 && epRes?.data?.result) {
        const $ep = cheerio.load(epRes.data.result);
        const epElements = $ep(
          "ul.ep-range a, .ep-range a, .range a, a[data-ids]"
        );

        const directLinks: EpisodeLink[] = [];

        epElements.each((_, el) => {
          const num = $ep(el).attr("data-num") || "";
          if (!num) return;

          const dataIds = $ep(el).attr("data-ids") || "";
          const malId = $ep(el).attr("data-mal") || "";
          const timestamp = $ep(el).attr("data-timestamp") || "";
          const hasSub = $ep(el).attr("data-sub") === "1";
          const hasDub = $ep(el).attr("data-dub") === "1";
          let epTitle = $ep(el).attr("title") || `Episode ${num}`;

          directLinks.push({
            title: epTitle,
            link: JSON.stringify({
              slug,
              epNum: num,
              dataIds,
              malId,
              timestamp,
              hasSub,
              hasDub,
              title: epTitle,
              origin: activeOrigin,
            }),
          });
        });

        if (directLinks.length > 0) {
          linkList.push({
            title: title,
            directLinks,
          });
        }
      }
    }

    if (linkList.length === 0) {
      if (animeId && type !== "movie") {
        throwProviderError(
          "Anikoto",
          "episode list",
          new Error("episode list unavailable")
        );
      }

      linkList.push({
        title: title,
        directLinks: [
          {
            title: type === "movie" ? "Movie" : "Episode 1",
            link: JSON.stringify({
              slug,
              epNum: "1",
              dataIds: "",
              malId: "",
              timestamp: "",
              hasSub: true,
              hasDub: false,
              title,
            }),
            type: type as "movie" | "series",
          },
        ],
      });
    }

    return {
      title,
      synopsis,
      image,
      imdbId: "",
      type,
      tags: tags.length > 0 ? tags : undefined,
      rating,
      linkList,
      webUrl: watchUrl,
    };
  } catch (err) {
    throwProviderError("Anikoto", "metadata", err);
  }
};
