import { Info, ProviderContext } from "../types";

const defaultHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://www.mxplayer.in/",
};

const IMAGE_URL = "https://qqcdnpictest.mxplay.com/";

function formatImageUrl(url?: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${IMAGE_URL}${url.replace(/^\/+/, "")}`;
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;

  try {
    const res = await axios.get(link, { headers: defaultHeaders });
    const $ = cheerio.load(res.data);

    let mxsEntity: any = null;
    $("script").each((_: any, el: any) => {
      const text = $(el).html() || "";
      if (text.includes("window.__mxs__")) {
        try {
          const jsonText = text
            .replace(/^window\.__mxs__\s*=\s*/, "")
            .replace(/;?\s*$/, "");
          const parsed = JSON.parse(jsonText);
          const entities = parsed?.entities || {};
          const matchId = link.match(
            /\/detail\/(?:movie|tvshow|show)\/([a-zA-Z0-9_-]+)/i
          )?.[1];
          mxsEntity =
            (matchId && entities[matchId]) || Object.values(entities)[0];
        } catch {
          // ignore
        }
      }
    });

    // ── Extract Landscape Background ──
    let image = "";
    if (mxsEntity) {
      // 1. High-res landscape banner from titleContentImageInfo (1600x900)
      const bannerImg = mxsEntity.titleContentImageInfo?.find(
        (i: any) =>
          i.type === "banner_and_static_bg_desktop" ||
          i.width >= 1280 ||
          i.url?.includes("1600x900") ||
          i.url?.includes("1280x720")
      );
      if (bannerImg?.url) {
        image = formatImageUrl(bannerImg.url);
      }

      // 2. Landscape image from imageInfo (bigpic 640x360 or landscape 320x180)
      if (!image) {
        const bigPic = mxsEntity.imageInfo?.find(
          (i: any) =>
            i.type === "bigpic" ||
            i.width >= 640 ||
            i.type === "landscape" ||
            i.url?.includes("16x9")
        );
        if (bigPic?.url) {
          image = formatImageUrl(bigPic.url);
        }
      }
    }

    // 3. Fallbacks: og:image / twitter:image
    if (!image) {
      const ogImage =
        $('meta[property="og:image"]').attr("content") ||
        $('meta[name="twitter:image"]').attr("content") ||
        "";
      if (ogImage) {
        image = ogImage.includes("/320x180/")
          ? ogImage.replace("/320x180/", "/640x360/")
          : ogImage;
      }
    }

    // ── Extract Portrait Poster ──
    let poster = "";
    if (mxsEntity) {
      const portrait = mxsEntity.imageInfo?.find(
        (i: any) =>
          i.type === "portrait_large" ||
          i.type === "portrait" ||
          i.url?.includes("2x3") ||
          i.url?.includes("320x480")
      );
      if (portrait?.url) {
        poster = formatImageUrl(portrait.url);
      }
    }

    // ── Extract Logo ──
    let logo: string | undefined = undefined;
    if (mxsEntity) {
      const logoImg = mxsEntity.titleContentImageInfo?.find(
        (i: any) => i.type === "title_desktop" || i.type?.includes("title")
      );
      if (logoImg?.url) {
        logo = formatImageUrl(logoImg.url);
      }
    }

    const title =
      mxsEntity?.title ||
      $("h1").first().text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      "";

    const synopsis =
      mxsEntity?.description ||
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      $(".description").text().trim() ||
      "";

    const rating = mxsEntity?.rating ? String(mxsEntity.rating) : undefined;
    const tags = mxsEntity?.genres || undefined;
    const cast = mxsEntity?.contributors
      ?.map((c: any) => c.name)
      .filter(Boolean);

    let type = "movie";
    if (
      mxsEntity?.type === "tvshow" ||
      mxsEntity?.type === "show" ||
      link.includes("/tvshow/") ||
      link.includes("/show/")
    ) {
      type = "series";
    }

    const linkList: any[] = [];
    const seasonTabs = $("div.hs__items-container > div");

    if (seasonTabs.length > 0) {
      type = "series";
      seasonTabs.each((_: any, el: any) => {
        const tabId = $(el).attr("data-id");
        const tabText = $(el).text().trim();
        const tabIndex = $(el).attr("data-tab");

        if (tabId) {
          const seasonTitle =
            tabText ||
            (tabIndex ? `Season ${tabIndex}` : "Season 1");
          linkList.push({
            title: seasonTitle,
            quality: "Standard",
            episodesLink: tabId,
            directLinks: [],
          });
        }
      });
    }

    if (type === "movie" || linkList.length === 0) {
      linkList.push({
        title: "Movie",
        quality: "Default",
        episodesLink: link,
        directLinks: [],
      });
    }

    return {
      title,
      synopsis,
      image,
      poster: poster || undefined,
      logo,
      imdbId: "",
      type,
      tags,
      cast,
      rating,
      linkList,
      webUrl: link,
    };
  } catch (err) {
    console.error("MXPlayer Meta Error", err);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };
  }
};
