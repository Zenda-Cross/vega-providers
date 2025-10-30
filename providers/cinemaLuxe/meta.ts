import { Info, Link, ProviderContext } from "../types";

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-store",
  DNT: "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

export const getMeta = ({ link, providerContext }: { link: string; providerContext: ProviderContext }): Promise<Info> => {
  const { axios, cheerio } = providerContext;
  const baseUrl = link.split("/").slice(0, 3).join("/");

  const empty: Info = {
    title: "",
    synopsis: "",
    image: "",
    imdbId: "",
    type: "movie",
    linkList: [],
  };

  return axios
    .get(link, { headers: { ...headers, Referer: baseUrl } })
    .then(({ data }) => {
      const $ = cheerio.load(data);
      const body = $(".entry-inner, .entry-content, .post-inner").first();

      // --- TITLE ---
      let title =
        $("h1").text().trim() ||
        $("h2").first().text().trim() ||
        $("h3:contains('Download')").first().text().trim();
      title = title.replace(/Download|~ Vegamovies3\.eu|–|\(.+\)/gi, "").trim();

      // --- IMDb ID ---
      const imdbId =
        ($("a[href*='imdb.com/title/']").attr("href") || "").match(/tt\d+/)?.[0] || "";

      // --- IMAGE ---
      let image =
        body.find("img[data-src]").first().attr("data-src") ||
        body.find("img[src]").first().attr("src") ||
        "";
      if (image && image.startsWith("//")) image = "https:" + image;

      // --- SYNOPSIS ---
      const synopsis =
        body.find("h3:contains('SYNOPSIS'), h3:contains('Plot')").next("p").text().trim() ||
        $("p:contains('Movie-SYNOPSIS')").next("p").text().trim() ||
        "";

      const info: Info = {
        title: title || "Unknown",
        synopsis,
        image,
        imdbId,
        type: /season|episode/i.test(data) ? "series" : "movie",
        linkList: [],
      };

      const links: Link[] = [];

      // ---- SERIES MODE (Grouping links by H3 quality heading) ----
      body.find("h3").each((_, el) => {
        const qualityTitle = $(el).text().trim();
        // Only process headings that contain a quality resolution (e.g., 720p)
        if (!/\d+p/i.test(qualityTitle)) return;

        const quality = qualityTitle.match(/\d+p/)?.[0] || "";
        const directLinks: Link["directLinks"] = [];

        // Find links in the content until the next H3
        $(el)
          .nextUntil("h3")
          .find("a")
          .each((_, a) => {
            const $a = $(a);
            // Prefer visible/button text inside the anchor or button child; fallback to attributes
            const anchorText =
              $a.text().trim() ||
              $a.find("button").text().trim() ||
              ($a.attr("title") || "").trim() ||
              ($a.attr("aria-label") || "").trim();

            const linkHref = $a.attr("href") || "";

            // Detect if this link is Zee-Cloud, V-Cloud, Batch/Zip (or contains a zip icon)
            const isZee = /Zee-Cloud/i.test(anchorText);
            const isV = /V-Cloud/i.test(anchorText);
            const isBatch = /Batch\/Zip|Batch|Zip/i.test(anchorText) || $a.find("i.fa-file-zip-o, i[class*='file-zip']").length > 0;

            if ((isZee || isV || isBatch) && linkHref) {
              // IMPORTANT: preserve the original anchorText exactly (no replacements)
              directLinks.push({
                title: anchorText || linkHref,
                link: linkHref,
                type: "series",
              });
            }
          });

        if (directLinks.length) {
          links.push({
            title: qualityTitle,
            quality,
            episodesLink: directLinks[0].link,
            directLinks,
          });
        }
      });

      // ---- MOVIE MODE (Grouping links by H5 quality heading) ----
      if (links.length === 0) {
        $("h5").each((_, el) => {
          const qTitle = $(el).text().trim();
          if (!/\d+p/i.test(qTitle)) return;
          const quality = qTitle.match(/\d+p/)?.[0] || "";

          const directLinks: Link["directLinks"] = [];
          const downloadParagraph = $(el).next("p");

          // 1. Capture the primary 'Download Now' button/link (anchor or button inside anchor)
          const nextBtn = downloadParagraph.find("a[href]").first();
          if (nextBtn.length) {
            const href = nextBtn.attr("href")!;
            const btnText =
              nextBtn.text().trim() ||
              nextBtn.find("button").text().trim() ||
              (nextBtn.attr("title") || "").trim() ||
              (nextBtn.attr("aria-label") || "").trim() ||
              "Download Now";

            directLinks.push({
              title: btnText,
              link: href,
              type: "movie",
            });
          }

          // 2. Capture additional links in the same paragraph (e.g., Batch/Zip)
          downloadParagraph.find("a[href]").each((_, a) => {
            const $a = $(a);
            const linkHref = $a.attr("href") || "";
            const btnText =
              $a.text().trim() || $a.find("button").text().trim() || ($a.attr("title") || "").trim();

            // Always include Batch/Zip links and avoid exact duplicate hrefs
            const isBatch = /Batch\/Zip|Batch|Zip/i.test(btnText) || $a.find("i.fa-file-zip-o, i[class*='file-zip']").length > 0;
            const isAlready = directLinks.some(d => d.link === linkHref);

            if (isBatch && linkHref && !isAlready) {
              // Preserve the exact text (no stripping)
              directLinks.push({
                title: btnText || linkHref,
                link: linkHref,
                type: "movie",
              });
            }
          });

          if (directLinks.length) {
            links.push({
              title: qTitle,
              quality,
              episodesLink: directLinks[0].link,
              directLinks,
            });
          }
        });
      }

      info.linkList = links;
      return info;
    })
    .catch((err) => {
      console.error("getMeta error:", err);
      return empty;
    });
};
