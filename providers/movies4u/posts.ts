import { Post, ProviderContext } from "../types";

const defaultHeaders = {
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
  pragma: "no-cache",
  priority: "u=0, i",
  "sec-ch-ua":
    '"Microsoft Edge";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "same-origin",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
  cookie: "Antiddos-systems-DH=395a53ac840ad21dff778291a3ffae36",
  Referer: "https://movies4u.vg/category/web-series/",
};

// --- Normal catalog posts ---
export async function getPosts({
  filter,
  page = 1,
  signal,
  providerContext,
}: {
  filter?: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  return fetchPosts({ filter, page, query: "", signal, providerContext });
}

// --- Search posts ---
export async function getSearchPosts({
  searchQuery,
  page = 1,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  return fetchPosts({
    filter: "",
    page,
    query: searchQuery,
    signal,
    providerContext,
  });
}

// --- Core function ---
async function fetchPosts({
  filter,
  query,
  page = 1,
  signal,
  providerContext,
}: {
  filter?: string;
  query?: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    const baseUrl = await providerContext.getBaseUrl("movies4u");
    let url: string;

    // --- Build URL for category filter or search query
    if (query && query.trim()) {
      url = `${baseUrl}/?s=${encodeURIComponent(query)}${
        page > 1 ? `&paged=${page}` : ""
      }`;
    } else if (filter) {
      url = filter.startsWith("/")
        ? `${baseUrl}${filter.replace(/\/$/, "")}${
            page > 1 ? `/page/${page}` : ""
          }`
        : `${baseUrl}/${filter}${page > 1 ? `/page/${page}` : ""}`;
    } else {
      url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
    }

    const { axios, cheerio } = providerContext;
    let res = await axios.get(url, {
      headers: defaultHeaders,
      signal,
      maxRedirects: 5,
    });

    // Anti-DDoS-Guard check
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

        // Fetch the min.js payload from the provider to safely execute slowAES
        const minJsRes = await axios.get(`${baseUrl}/min.js`, {
          headers: defaultHeaders,
          signal,
        });

        const b1Hex = atob(unescapeHexStr(b1Match[1]));
        const a2Hex = atob(unescapeHexStr(a2Match[1]));
        const c3Hex = unescapeHexStr(c3Match[1]);

        // Evaluate the decryption without needing crypto or buffers
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
        res = await axios.get(url, {
          headers: { ...defaultHeaders, Cookie: newCookie },
          signal,
          maxRedirects: 5,
        });
      }
    }

    const $ = cheerio.load(res.data || "");

    const resolveUrl = (href: string) =>
      href?.startsWith("http") ? href : new URL(href, url).href;

    const seen = new Set<string>();
    const catalog: Post[] = [];

    // --- HDMovie2 selectors
    const POST_SELECTORS = [
      ".pstr_box",
      "article",
      ".result-item",
      ".post",
      ".item",
      ".thumbnail",
      ".latest-movies",
      ".movie-item",
      ".entry-card",
    ].join(",");

    console.log("Fetching posts from URL:", url); // Debug log
    $(POST_SELECTORS).each((_, el) => {
      const card = $(el);
      console.log("Processing card:", card.text().trim().slice(0, 50)); // Debug log
      let link = card.find("a[href]").first().attr("href") || "";
      if (!link) return;
      link = resolveUrl(link);
      if (seen.has(link)) return;

      let title =
        card.find("h2").first().text().trim() ||
        card.find("a[title]").first().attr("title")?.trim() ||
        card.text().trim();
      title = title
        .replace(
          /(?:480p|720p|1080p|4k|HDTC|HDRip|BluRay|LiNE|Full Movie).*$/i,
          "",
        )
        .replace(/\[.*?\]/g, "")
        .replace(/\s{2,}/g, " ")
        .replace(/\s*[|\-]\s*$/, "")
        .trim();
      if (!title) return;

      const img =
        card.find("img").first().attr("src") ||
        card.find("img").first().attr("data-src") ||
        card.find("img").first().attr("data-original") ||
        "";
      const image = img ? resolveUrl(img) : "";

      seen.add(link);
      catalog.push({ title, link, image });
    });

    return catalog.slice(0, 100);
  } catch (err) {
    console.error(
      "HDMovie2 fetchPosts error:",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}
