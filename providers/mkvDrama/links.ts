import { ProviderContext } from "../types";
import { loadMkvDramaEpisodeHtml } from "./loader";
import { MkvDramaPage, mergeMkvDramaCookies, mkvDramaHeaders } from "./request";

type RedirectPage = {
  data: string;
  url: string;
  cookies: string;
};

export type ViewCrateLink = {
  title: string;
  link: string;
};

type MkvDramaSource = {
  title: string;
  link: string;
};

function normalizeLink1(href: string, pageUrl: string): string {
  const absolute = new URL(href, pageUrl).href;
  const duplicateIndex = absolute.indexOf("https://", 8);
  return duplicateIndex === -1 ? absolute : absolute.slice(0, duplicateIndex);
}

export function findLink1Sources(
  page: MkvDramaPage,
  providerContext: ProviderContext,
): MkvDramaSource[] {
  const $ = providerContext.cheerio.load(page.data);
  const sources: MkvDramaSource[] = [];

  $(".soraddlx").each((_, groupElement) => {
    const group = $(groupElement);
    const episodeTitle = group
      .find(".sorattlx h3")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();

    group.find(".soraurlx").each((_, rowElement) => {
      const row = $(rowElement);
      const quality = row
        .find("strong")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim();
      const anchor = row
        .find("a[href]")
        .filter((_, element) => /^link\s*1$/i.test($(element).text().trim()))
        .first();
      const href = anchor.attr("href") || "";
      if (!href) return;

      sources.push({
        title: [episodeTitle, quality].filter(Boolean).join(" - ") || "Link 1",
        link: normalizeLink1(href, page.url),
      });
    });
  });

  return sources;
}

async function followRedirects(
  url: string,
  providerContext: ProviderContext,
  initialCookies = "",
  referer = "",
): Promise<RedirectPage> {
  let currentUrl = url;
  let cookies = initialCookies;

  for (let index = 0; index < 8; index += 1) {
    const response = await providerContext.axios.get(currentUrl, {
      headers: {
        ...mkvDramaHeaders,
        ...(cookies ? { Cookie: cookies } : {}),
        ...(referer ? { Referer: referer } : {}),
      },
      maxRedirects: 0,
      validateStatus: (status: number) => status >= 200 && status < 400,
    });
    cookies = mergeMkvDramaCookies(cookies, response.headers?.["set-cookie"]);
    const location = response.headers?.location;
    if (!location) {
      return { data: response.data || "", url: currentUrl, cookies };
    }
    referer = currentUrl;
    const nextUrl = new URL(location, currentUrl).href;
    if (new URL(nextUrl).hostname !== new URL(currentUrl).hostname)
      cookies = "";
    currentUrl = nextUrl;
  }

  throw new Error("MKVDrama redirect chain exceeded the limit");
}

async function submitOuoForm(
  page: RedirectPage,
  providerContext: ProviderContext,
): Promise<RedirectPage> {
  const $ = providerContext.cheerio.load(page.data);
  const token = $('input[name="_token"]').attr("value") || "";
  const form = $('form:has(input[name="_token"])').first();
  const action = form.attr("action") || "";
  if (!token || !action) throw new Error("OUO token form was not found");

  const formUrl = new URL(action, page.url).href;
  const response = await providerContext.axios.post(
    formUrl,
    new URLSearchParams({ _token: token, "x-token": "" }).toString(),
    {
      headers: {
        ...mkvDramaHeaders,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: page.cookies,
        Origin: new URL(formUrl).origin,
        Referer: page.url,
      },
      maxRedirects: 0,
      validateStatus: (status: number) => status >= 200 && status < 400,
    },
  );
  const cookies = mergeMkvDramaCookies(
    page.cookies,
    response.headers?.["set-cookie"],
  );
  const location = response.headers?.location;
  if (!location) return { data: response.data || "", url: formUrl, cookies };
  const destination = new URL(location, formUrl).href;
  return followRedirects(
    destination,
    providerContext,
    new URL(destination).hostname === new URL(formUrl).hostname ? cookies : "",
    formUrl,
  );
}

function nearestTitle($: any, anchor: any, server: string): string {
  const ownText = anchor.text().replace(/\s+/g, " ").trim();
  const sectionHeading = anchor
    .closest("section, article, tr, li, .card, .list-group-item")
    .find("h1, h2, h3, h4, h5, h6, strong")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const rowHeading = anchor
    .closest(".row, div")
    .prevAll("h1, h2, h3, h4, h5, h6, strong")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const containerText = anchor
    .closest("tr, li, article, .card, .list-group-item, .row")
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const heading = anchor
    .prevAll("h1, h2, h3, h4, h5, h6, strong")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const title = sectionHeading || rowHeading || heading || containerText;
  return title ? `${title} - ${server}` : ownText || server;
}

export async function getViewCrateLinks(
  page: MkvDramaPage,
  providerContext: ProviderContext,
): Promise<ViewCrateLink[]> {
  const episodePage = await loadMkvDramaEpisodeHtml(page, providerContext);
  const sources = findLink1Sources(episodePage, providerContext);
  if (!sources.length) throw new Error("MKVDrama Link1 was not found");

  const links: ViewCrateLink[] = [];
  const seen = new Set<string>();

  for (const source of sources) {
    const ouoPage = await followRedirects(
      source.link,
      providerContext,
      episodePage.cookies,
      episodePage.url,
    );
    const viewCratePage = /ouo\.(?:io|press)$/i.test(
      new URL(ouoPage.url).hostname,
    )
      ? await submitOuoForm(ouoPage, providerContext)
      : ouoPage;
    if (!/viewcrate\./i.test(new URL(viewCratePage.url).hostname)) {
      throw new Error(
        `OUO did not redirect to ViewCrate: ${viewCratePage.url}`,
      );
    }

    const $ = providerContext.cheerio.load(viewCratePage.data);
    $("a[href]").each((_, element) => {
      const anchor = $(element);
      const href = anchor.attr("href") || "";
      const absolute = new URL(href, viewCratePage.url).href;
      const key = `${source.title}:${absolute}`;
      if (!/(?:pixeldrain\.|gofile\.io)/i.test(absolute) || seen.has(key)) {
        return;
      }
      seen.add(key);
      const server = /gofile\.io/i.test(absolute) ? "GoFile" : "PixelDrain";
      const viewCrateTitle = nearestTitle($, anchor, server);
      links.push({
        title: `${source.title} - ${viewCrateTitle}`,
        link: absolute,
      });
    });
  }

  return links;
}
