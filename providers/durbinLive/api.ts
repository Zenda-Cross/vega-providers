import { Post, ProviderContext } from "../types";

export const BASE_URL = "https://durbinlive.live";

export async function getBase(providerContext: ProviderContext): Promise<string> {
  const resolve = (providerContext as ProviderContext & {
    getBaseUrl?: (value: string) => Promise<string>;
  }).getBaseUrl;
  if (resolve) {
    try {
      const value = await resolve.call(providerContext, "durbinLive");
      if (value) return value.replace(/\/+$/, "");
    } catch { /* Use the public site if the URL registry is unavailable. */ }
  }
  return BASE_URL;
}

export function absolute(value: string, base: string): string {
  const url = new URL(value, base);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Unsupported DurbinLive URL");
  return url.href;
}

export function headers(ctx: ProviderContext, referer: string): Record<string, string> {
  return {
    ...ctx.commonHeaders,
    "User-Agent": ctx.commonHeaders?.["User-Agent"] || "Mozilla/5.0",
    Referer: referer,
    Origin: new URL(referer).origin,
  };
}

export async function getPage(url: string, ctx: ProviderContext, referer: string, signal?: AbortSignal): Promise<string> {
  const response = await ctx.axios.get(url, { headers: headers(ctx, referer), signal, timeout: 12000 });
  if (typeof response.data !== "string") throw new Error("DurbinLive returned an unexpected response");
  if (/^\s*Access Denied!?\s*$/i.test(response.data)) throw new Error("This DurbinLive player denied access");
  return response.data;
}

export function parsePosts(html: string, ctx: ProviderContext, base: string): Post[] {
  const $ = ctx.cheerio.load(html);
  const seen = new Set<string>();
  const posts: Post[] = [];
  $("a[href*='/livetv/details/'], a[href*='/sports/details/']").each((_, element) => {
    const a = $(element);
    const href = a.attr("href");
    const image = a.find("img").first();
    const title = a.find("h3, .video-item-content").first().text().trim()
      || a.attr("title") || image.attr("alt") || image.attr("title") || a.text().trim();
    if (!href || !title) return;
    const link = absolute(href, base);
    if (seen.has(link)) return;
    seen.add(link);
    const src = image.attr("data-src") || image.attr("data-original") || image.attr("src");
    posts.push({ title, link, image: src ? absolute(src, base) : "https://cdn.jsdelivr.net/gh/Zenda-Cross/vega-providers@main/assets/durbinLive.jpg", tag: "Live", aspectRatio: 16 / 9 });
  });
  return posts;
}
