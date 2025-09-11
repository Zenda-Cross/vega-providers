import { Info, Link, ProviderContext } from "../types";

export const getMeta = async function ({
  link,
  providerContext,
  rawHtml,
}: {
  link: string;
  providerContext: ProviderContext;
  rawHtml?: string;
}): Promise<Info> {
  try {
    const { axios, cheerio } = providerContext;

    // 1) Get HTML
    let html: string;
    if (rawHtml && rawHtml.trim().length > 0) {
      html = rawHtml;
    } else {
      const res = await axios.get(link, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
        timeout: 15000,
      });
      html = res?.data || "";
    }

    const $ = cheerio.load(html);

    // 2) Title
    const title =
      ($("h1.title").first().text().trim() as string) ||
      ($("title").first().text().trim() as string) ||
      ($("meta[property='og:title']").attr("content") || "").trim();

    // 3) Synopsis
    let synopsis =
      ($("meta[name='description']").attr("content") || "").trim() ||
      ($("meta[property='og:description']").attr("content") || "").trim() ||
      ($(".thecontent").text() || "").slice(0, 400).trim();
    synopsis = synopsis.replace(/^Summary:\s*/i, "").trim();

    // 4) Image
    let image =
      ($("meta[property='og:image']").attr("content") || "").trim() ||
      ($("meta[name='twitter:image']").attr("content") || "").trim();

    if (!image) {
      $("script[type='application/ld+json']").each((i, s) => {
        try {
          const txt = $(s).contents().text();
          if (!txt) return;
          const parsed = JSON.parse(txt);
          const findUrl = (obj: any): string | null => {
            if (!obj) return null;
            if (obj.url && typeof obj.url === "string") return obj.url;
            if (obj.image && typeof obj.image === "string") return obj.image;
            if (Array.isArray(obj)) {
              for (const el of obj) {
                const r = findUrl(el);
                if (r) return r;
              }
            } else if (typeof obj === "object") {
              for (const k of Object.keys(obj)) {
                const r = findUrl(obj[k]);
                if (r) return r;
              }
            }
            return null;
          };
          const u = findUrl(parsed);
          if (u && !image) image = u;
        } catch (e) {}
      });
    }

    // 5) imdbId
    const imdbMatch = html.match(/tt\d{6,9}/i) || [];
    const imdbId = imdbMatch[0] || "";

    // 6) type detection
    const catText =
      ($(".thecategory").text() || "") +
      ($("meta[property='article:section']").attr("content") || "");
    let type: "movie" | "series" = /season|episode|series/i.test(
      catText + ($(".thecontent").text() || "")
    )
      ? "series"
      : "movie";

    if (
      /This is a Movie|This Movie|This is a TV Series|TV Series/i.test(
        $(".thecontent").text() || ""
      )
    ) {
      if (/This is a TV Series|TV Series/i.test($(".thecontent").text() || "")) {
        type = "series";
      } else {
        type = "movie";
      }
    }

    // 7) Extract link groups (quality + download + watch)
    const links: Link[] = [];

    $("h6").each((i, el) => {
      const heading = $(el).text().trim();
      const directLinks: { link: string; title: string; type: "movie" | "episode" }[] = [];

      // Direct file url check
      const fileUrlMatch = heading.match(/https?:\/\/[^>\s]+\.(?:mp4|mkv|avi|webm)/i);
      if (fileUrlMatch) {
        directLinks.push({ link: fileUrlMatch[0], title: "Download", type: "movie" });
      }

      // check next p tag
      const nextP = $(el).nextAll("p").first();
      if (nextP && nextP.length) {
        nextP.find("a").each((j, ael) => {
          const $a = $(ael);
          const href = $a.attr("href") || "";
          const text = ($a.text() || "").trim();

          if (!href || href.toLowerCase().startsWith("javascript:")) return;

          if ($a.hasClass("maxbutton-oxxfile")) {
            directLinks.push({ link: href, title: "Download", type: "movie" });
          } else if ($a.hasClass("maxbutton-watch-online")) {
            directLinks.push({ link: href, title: "Watch Online", type: "movie" });
          }
        });
      }

      if (directLinks.length) {
        const qualityMatch = heading.match(/\b\d{3,4}p\b/i);
        const quality = qualityMatch ? qualityMatch[0] : "";

        links.push({
          title: heading,
          episodesLink: "",
          directLinks,
          quality,
        });
      }
    });

    // 8) iframe fallback
    $("iframe").each((i, iframe) => {
      const src = $(iframe).attr("src");
      if (src) {
        links.push({
          title: "Stream Player",
          episodesLink: "",
          directLinks: [{ link: src, title: "Watch Online", type: "movie" }],
          quality: "",
        });
      }
    });

    // dedupe
    const seen = new Set<string>();
    const dedupedLinks = links
      .map((group) => {
        const direct = (group.directLinks ?? []).filter((d) => {
          if (!d || !d.link) return false;
          if (seen.has(d.link)) return false;
          seen.add(d.link);
          return true;
        });
        return { ...group, directLinks: direct };
      })
      .filter((g) => (g.directLinks ?? []).length > 0);

    // extra: create a quick map for quality selection
    const qualityMap: Record<
      string,
      { watch?: string; download?: string }
    > = {};

    dedupedLinks.forEach((g) => {
      const watch = g.directLinks.find((d) =>
        d.title.toLowerCase().includes("watch")
      )?.link;
      const download = g.directLinks.find((d) =>
        d.title.toLowerCase().includes("download")
      )?.link;

      if (g.quality) {
        qualityMap[g.quality] = {
          watch,
          download,
        };
      }
    });

    const info: Info = {
      title: title || "",
      synopsis: synopsis || "",
      image: image || "",
      imdbId: imdbId || "",
      type,
      linkList: dedupedLinks,
      // 👇 अब extra field (qualityMap) जिससे UI में select करके play/download दिखा सको
      qualityMap,
    } as any;

    return info;
  } catch (err) {
    console.error("getMeta (rawHtml) error:", err);
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
