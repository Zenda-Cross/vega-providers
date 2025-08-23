import { ProviderContext } from "../types";

export const getPosts = async function ({
  filter,
  query,
  page,
  signal,
  providerContext,
}: {
  filter?: string; // category filter
  query?: string; // search query
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}) {
  try {
    // ✅ Safe Base URL handling
    let baseUrl = "https://cinemalux.run";
    try {
      if (providerContext.getBaseUrl) {
        const maybeBase: any = await providerContext.getBaseUrl("cinemalux");
        if (typeof maybeBase === "string" && maybeBase.startsWith("http")) {
          baseUrl = maybeBase;
        } else if (maybeBase && typeof maybeBase.url === "string") {
          baseUrl = maybeBase.url;
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.warn("⚠️ getBaseUrl failed, using default:", errorMessage);
    }

    // ✅ Decide URL (Search vs Normal)
    let url: string;
    if (query && query.trim().length > 0) {
      // 🔎 Search mode
      url = `${baseUrl.replace(/\/$/, "")}/search/${encodeURIComponent(
        query
      )}/`;
    } else {
      // 📂 Normal category mode
      const normalizedFilter = filter || "/";
      url =
        (normalizedFilter.startsWith("http") ||
        normalizedFilter.startsWith("https"))
          ? normalizedFilter
          : `${baseUrl.replace(/\/$/, "")}${normalizedFilter}${
              page && page > 1 ? `page/${page}/` : ""
            }`;
    }

    const res = await providerContext.axios.get(url, {
      headers: providerContext.commonHeaders,
      signal,
    });

    const $ = providerContext.cheerio.load(res.data || "");
    const catalog: { title: string; link: string; image: string }[] = [];

    // ✅ Main selectors
    $(
      "article, .result-item, .post, .movie, .item, .thumbnail, .result, .entry"
    ).each((i: number, el: any) => {
      const $el = $(el);
      const a = $el.find("a").first();

      const title =
        $el.find("h2").text().trim() ||
        a.attr("title") ||
        a.find("img").attr("alt") ||
        a.text().trim() ||
        $el.find(".title").text().trim();

      let link = a.attr("href") || a.attr("data-href") || "";
      let image =
        $el.find("img").attr("data-src") ||
        $el.find("img").attr("src") ||
        $el.find(".poster img").attr("data-src") ||
        $el.find(".poster img").attr("src") ||
        "";

      if (link && link.startsWith("/")) {
        link = baseUrl.replace(/\/$/, "") + link;
      }
      if (image && image.startsWith("/")) {
        image = baseUrl.replace(/\/$/, "") + image;
      }

      if (title && link) {
        catalog.push({ title, link, image });
      }
    });

    // ✅ Backup selectors
    if (!catalog.length) {
      $(".thumbnail, .poster, .result-item").each((i: number, el: any) => {
        const $el = $(el);
        const title =
          $el.find("img").attr("alt") ||
          $el.find("h3").text().trim() ||
          $el.find(".title").text().trim();
        let link = $el.find("a").attr("href") || "";
        let image =
          $el.find("img").attr("data-src") || $el.find("img").attr("src") || "";

        if (link && link.startsWith("/")) {
          link = baseUrl.replace(/\/$/, "") + link;
        }
        if (image && image.startsWith("/")) {
          image = baseUrl.replace(/\/$/, "") + image;
        }

        if (title && link) {
          catalog.push({ title, link, image });
        }
      });
    }

    return catalog;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("cinemalux getPosts error", errorMessage);
    return [];
  }
};

