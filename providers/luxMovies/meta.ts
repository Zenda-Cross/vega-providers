import { Info, Link, ProviderContext } from "../types";
import { getBaseUrl } from "../getBaseUrl";
import {
  addCinemetaContext,
  applyCinemetaMeta,
  getCinemetaMeta,
  getCinemetaSeason,
} from "../getCinemetaMeta";

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
    "_ga=GA1.1.10613951.1756380104; xla=s4t; _ga_1CG5NQ0F53=GS2.1.s1756380103$o1$g1$t1756380120$j43$l0$h0",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

export const getMeta = async ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> => {
  try {
    const { axios, cheerio } = providerContext;
    const currentBaseUrl = await getBaseUrl("lux");
    const url = new URL(link, `${currentBaseUrl}/`).href;
    console.log("url", url);
    const baseUrl = url.split("/").slice(0, 3).join("/");
    const response = await axios.get(url, {
      headers: {
        ...headers,
        Referer: baseUrl,
      },
    });
    const $ = cheerio.load(response.data);
    const infoContainer = $(
      ".entry-content, .post-inner, .post-content, .page-body",
    );

    // title
    let title = $("h1.post-title").text().trim();
    if (!title) {
      const heading = infoContainer?.find("h3");
      const titleRegex = /Name: (.+)/;
      title = heading?.next("p")?.text()?.match(titleRegex)?.[1] || "";
    }
    //   console.log(title);

    // imdbId
    let imdbId =
      $('a[href*="imdb.com"]').attr("href")?.match(/tt\d+/)?.[0] || "";
    if (!imdbId) {
      const heading = infoContainer?.find("h3");
      imdbId =
        heading?.next("p")?.find("a")?.attr("href")?.match(/tt\d+/g)?.[0] ||
        infoContainer.text().match(/tt\d+/g)?.[0] ||
        "";
    }
    // console.log(imdbId)

    // type
    let type = "movie";

    const heading = infoContainer?.find("h3");
    const pageText = `${title} ${infoContainer.text()}`;
    if (
      heading?.next("p")?.text()?.includes("Series Name") ||
      /\b(?:web\s+series|season\s*\d{1,2}|s\d{1,2}\s*e\d{1,3})\b/i.test(
        pageText,
      )
    ) {
      type = "series";
    }

    //   console.log(type);

    // synopsis
    let synopsis = "";
    const synopsisHeader = $("h3").filter(
      (i, el) =>
        $(el).text().includes("SYNOPSIS/PLOT") || $(el).text().includes("Plot"),
    );
    if (synopsisHeader.length > 0) {
      synopsis = synopsisHeader.next("p").text().trim();
    }
    if (!synopsis) {
      const synopsisNode = //@ts-ignore
        infoContainer?.find("p")?.next("h3,h4")?.next("p")?.[0]?.children?.[0];
      synopsis =
        synopsisNode && "data" in synopsisNode ? synopsisNode.data : "";
    }
    //   console.log(synopsis);

    // image
    let image =
      infoContainer?.find("img[data-lazy-src]")?.attr("data-lazy-src") ||
      infoContainer
        ?.find("img")
        ?.filter((i, el) => {
          const src = $(el).attr("src");
          return (
            !!src &&
            !src.includes("logo") &&
            !src.includes("svg") &&
            !src.includes("placeholder") &&
            !src.includes("icon")
          );
        })
        ?.first()
        ?.attr("src") ||
      "";

    if (image.startsWith("//")) {
      image = "https:" + image;
    }
    // console.log(image);

    console.log({ title, synopsis, image, imdbId, type });
    /// Links
    let hr = infoContainer?.first()?.find("hr");

    // Try to find the HR before the download buttons if possible
    const firstButton = $(".dwd-button, a[href*='nexdrive'], a[href*='vcloud'], a[href*='fastdl'], a[href*='hubcloud']").first();
    if (firstButton.length > 0) {
      const containerP = firstButton.closest("p");
      let prev = containerP.prev();
      while (prev.length && !prev.is("hr")) {
        prev = prev.prev();
      }
      if (prev.is("hr")) {
        hr = prev;
      }
    }

    const list = hr?.nextAll();
    const links: Link[] = [];
    list.each((index, element: any) => {
      element = $(element);
      
      if (element.is("hr") || element.is("style") || element.is("script")) return;

      // Ignore elements that are button containers themselves
      if (
        element.find("a").length > 0 &&
        (element.text().includes("Instant") ||
          element.text().includes("Resumable") ||
          element.text().includes("Download Now") ||
          element.text().includes("Batch/Zip") ||
          element.find(".dwd-button, .btn-outline").length > 0)
      ) {
        return;
      }

      let rawTitle = element.text();
      // Clean all newlines, tabs, and multiple spaces
      let title = rawTitle
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (!title) return;

      // Filter out decorative lines (e.g. —–==___==—–, ===, ---, ***)
      if (/^[\s\-_=~*•–—:|]+$/.test(title)) return;

      // Filter out winding up / thank you / join telegram
      const lower = title.toLowerCase();
      if (
        lower.includes("winding up") ||
        lower.includes("thank you") ||
        lower.includes("telegram") ||
        lower.includes("how to download") ||
        lower.includes("join our") ||
        lower === "download now"
      ) {
        return;
      }

      // Quality extraction
      const quality = title.match(/\d+p\b/i)?.[0] || "";

      // If it's a section banner without quality like "• SEASON 2 | NetFlix •" preceding actual headings, skip it
      if (
        !quality &&
        !/episodes?\s*[:\d\-]/i.test(title) &&
        !/\[.*(?:mb|gb|e).*\]/i.test(title)
      ) {
        const nextEl = element.next();
        if (
          nextEl.length &&
          (nextEl.is("h1, h2, h3, h4, h5, h6, strong") ||
            (nextEl.is("p") && nextEl.find("strong").length))
        ) {
          return;
        }
      }

      // Clean leading/trailing symbols, bullets, dashes from title
      title = title.replace(/^[\s•\-*—_:=~|]+|[\s•\-*—_:=~|]+$/g, "").trim();
      if (!title) return;

      // Find the next sibling that contains download links
      let nextP = element.next();
      while (nextP.length && !nextP.is("hr") && !nextP.find("a[href]").length) {
        nextP = nextP.next();
      }

      if (!nextP.length || nextP.is("hr")) return;

      let btn;
      if (type === "series") {
        // For series: ONLY V-Cloud links are valid episode links. Never pick Batch/Zip!
        btn = nextP
          .find("a:contains('V-Cloud'), a:contains('vcloud'), a[href*='vcloud']")
          .first();
        if (!btn.length) {
          // Fallback to other episode anchors ONLY if they are not Batch/Zip
          btn = nextP
            .find("a")
            .filter((_, a) => {
              const txt = $(a).text().toLowerCase();
              const href = ($(a).attr("href") || "").toLowerCase();
              return (
                !txt.includes("zip") &&
                !txt.includes("batch") &&
                !href.includes("zip") &&
                !href.includes("batch")
              );
            })
            .first();
        }
      } else {
        // For movies: V-Cloud first, then G-Direct, then others
        btn = nextP
          .find("a:contains('V-Cloud'), a:contains('vcloud'), a[href*='vcloud']")
          .first();
        if (!btn.length) {
          btn = nextP
            .find("a:contains('G-Direct'), a:contains('Direct'), a[href*='fastdl']")
            .first();
        }
        if (!btn.length) {
          btn = nextP.find(".dwd-button, .btn-outline").first().parent();
        }
        if (!btn.length || !btn.attr("href")) {
          btn = nextP.find("a[href]").first();
        }
      }

      if (!btn || !btn.length) return;

      const btnHref = btn.attr("href") || "";
      if (!btnHref || btnHref === "/" || btnHref === "#") return;

      if (
        links.some(
          (l) =>
            l.episodesLink === btnHref ||
            (l.directLinks && l.directLinks[0]?.link === btnHref),
        )
      ) {
        return;
      }

      if (type === "series") {
        links.push({
          title,
          episodesLink: btnHref,
          quality,
        });
      } else {
        links.push({
          title,
          directLinks: [{ title: "Movie", link: btnHref, type: "movie" }],
          quality,
        });
      }
    });

    const quickDownload = await providerContext.kvStore?.get<boolean>("luxMovies_quickDownload");
    const websiteInfo: Info = {
      title,
      synopsis,
      image,
      imdbId: imdbId || "",
      type,
      quickDownload: quickDownload ?? true,
      linkList: links,
      webUrl: url,
    };
    if (!imdbId) return websiteInfo;

    const cinemeta = await getCinemetaMeta(imdbId, type, providerContext);
    if (type === "series" && cinemeta.type === "series") {
      websiteInfo.linkList = websiteInfo.linkList.map((item) => {
        if (!item.episodesLink) return item;
        const season = getCinemetaSeason(item.title);
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
    return applyCinemetaMeta(websiteInfo, cinemeta);
  } catch (error) {
    console.log("getInfo error");
    console.error(error);
    // ToastAndroid.show('No response', ToastAndroid.SHORT);
    throw error;
  }
};
