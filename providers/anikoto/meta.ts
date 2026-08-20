import { EpisodeLink, Info, Link, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

const BASE_URL = "https://anikototv.to";

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

function encodeVrf(animeId: string): string {
  const encrypted = rc4("simple-hash", animeId);
  return btoa(encrypted);
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
    }
    if (!watchUrl.includes("/ep-")) {
      watchUrl = `${watchUrl.replace(/\/+$/, "")}/ep-1`;
    }

    const slug = watchUrl
      .replace(BASE_URL, "")
      .replace(/^\/watch\//, "")
      .split("/")[0];

    const res = await axios.get(watchUrl, {
      headers: {
        ...providerContext.commonHeaders,
        Referer: `${BASE_URL}/`,
      },
    });

    const $ = cheerio.load(res.data);
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

    const rating = $("i.rating").text().trim() || undefined;

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
      const epAjaxUrl = `${BASE_URL}/ajax/episode/list/${animeId}?vrf=${vrf}&style=default`;

      const epRes = await axios.get(epAjaxUrl, {
        headers: {
          ...providerContext.commonHeaders,
          "X-Requested-With": "XMLHttpRequest",
          Referer: watchUrl,
        },
      });

      if (epRes.data && epRes.data.status === 200 && epRes.data.result) {
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
    };
  } catch (err) {
    throwProviderError("Anikoto", "metadata", err);
  }
};
