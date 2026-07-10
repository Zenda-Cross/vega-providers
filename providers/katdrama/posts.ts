/* v1.1 rebuild */
import { Post, ProviderContext } from "../types";

async function getWithWAF(
  url: string,
  axios: any,
  openWebView: any,
  headers: any,
): Promise<any> {
  const baseUrl = url.split("/").slice(0, 3).join("/");
  try {
    return await axios.get(url, { headers: { ...headers, Referer: baseUrl } });
  } catch (error: any) {
    if (error.response?.status === 403 && openWebView) {
      console.log(`WAF detected (403) for ${url}, using solver...`);
      const wafResult = await openWebView(baseUrl, {
        title: "Solve the captcha below and click done",
        description: "Required to bypass anti-bot protection.",
        headers: { ...headers, Referer: baseUrl },
        waitForCookie: "cf_clearance",
        force: true,
      });
      const cookie = wafResult?.cookie || wafResult?.cookies || "";
      return await axios.get(url, {
        headers: { ...headers, Referer: baseUrl, Cookie: cookie },
      });
    }
    throw error;
  }
}

/** Resolve SvelteKit devalue-style payload into plain JS values. */
function resolveDevalue(data: any[]): any {
  const memo = new Map<number, any>();

  const resolve = (value: any): any => {
    if (typeof value === "number" && Number.isInteger(value)) {
      if (memo.has(value)) return memo.get(value);
      if (value < 0 || value >= data.length) return value;
      const resolved = resolve(data[value]);
      memo.set(value, resolved);
      return resolved;
    }
    if (Array.isArray(value)) {
      return value.map((item) => resolve(item));
    }
    if (value && typeof value === "object") {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = resolve(v);
      }
      return out;
    }
    return value;
  };

  return resolve(0);
}

function extractPostsFromSvelteKit(raw: string, baseUrl: string): Post[] {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed?.type !== "chunk" || !Array.isArray(parsed.data)) continue;
      const root = resolveDevalue(parsed.data);
      const payload = root?.data || root;
      const items = payload?.items;
      if (!Array.isArray(items)) continue;

      const catalog: Post[] = [];
      for (const item of items) {
        if (!item) continue;
        const title = String(item.post_title || "")
          .replace(/&amp;/g, "&")
          .replace(/&#8211;/g, "–")
          .replace(/Download/gi, "")
          .replace(/\s+/g, " ")
          .trim();
        const slug = item.slug;
        const image = item.thumbnail_image || "";
        if (!title || !slug) continue;
        catalog.push({
          title,
          link: `${cleanBase}/${slug}`,
          image,
        });
      }
      if (catalog.length) return catalog;
    } catch {
      // try next line
    }
  }

  return [];
}

function buildDataUrl(baseUrl: string, filter: string, page: number): string {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const cleanFilter = (filter || "").replace(/\/$/, "");
  const path = cleanFilter
    ? `${cleanBase}${cleanFilter}/__data.json`
    : `${cleanBase}/__data.json`;
  return page > 1 ? `${path}?page=${page}` : path;
}

export const getPosts = async function ({
  filter,
  page,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { getBaseUrl, axios, openWebView, commonHeaders } = providerContext;
  const baseUrl = await getBaseUrl("katdrama");
  const url = buildDataUrl(baseUrl, filter, page);
  return posts({
    url,
    baseUrl,
    axios,
    openWebView,
    commonHeaders,
  });
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { getBaseUrl, axios, openWebView, commonHeaders } = providerContext;
  const baseUrl = await getBaseUrl("katdrama");
  const cleanBase = baseUrl.replace(/\/$/, "");
  const params = new URLSearchParams();
  params.set("q", searchQuery);
  if (page > 1) params.set("page", String(page));
  const url = `${cleanBase}/__data.json?${params.toString()}`;
  return posts({
    url,
    baseUrl,
    axios,
    openWebView,
    commonHeaders,
  });
};

async function posts({
  url,
  baseUrl,
  axios,
  openWebView,
  commonHeaders,
}: {
  url: string;
  baseUrl: string;
  axios: ProviderContext["axios"];
  openWebView: ProviderContext["openWebView"];
  commonHeaders: any;
}): Promise<Post[]> {
  try {
    const res = await getWithWAF(url, axios, openWebView, commonHeaders);
    const data = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    return extractPostsFromSvelteKit(data, baseUrl);
  } catch (err) {
    console.error("katdrama posts error ", err);
    return [];
  }
}
