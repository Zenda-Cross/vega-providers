import { ProviderContext, Stream } from "../types";
import { gofileExtractor } from "../extractors/gofile";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
};

const browserHeaders = {
  ...headers,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-US,en;q=0.9,en-IN;q=0.8",
  DNT: "1",
  Priority: "u=0, i",
  "Sec-CH-UA":
    '"Not;A=Brand";v="8", "Chromium";v="150", "Microsoft Edge";v="150"',
  "Sec-CH-UA-Mobile": "?0",
  "Sec-CH-UA-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

type ServerName = "ZIP-ZAP" | "BUZZHEAVIER" | "SKYDROP" | "GOFILE";

const SERVER_PATTERNS: Record<
  ServerName,
  (name: string, href: string) => boolean
> = {
  "ZIP-ZAP": (name, href) =>
    name.includes("ZIP-ZAP") || href.includes("kmphotos.cv/download"),
  BUZZHEAVIER: (name, href) =>
    name.includes("BUZZHEAVIER") ||
    name.includes("BUZZHIEVER") ||
    href.includes("bzzhr.co"),
  SKYDROP: (name, href) =>
    name.includes("SKYDROP") || href.includes("skydrop.sbs/"),
  GOFILE: (name, href) =>
    name.includes("GOFILE") || href.includes("gofile.io/"),
};

function getResponseCookies(setCookie: string | string[] | undefined): string {
  const cookies = Array.isArray(setCookie)
    ? setCookie
    : setCookie
      ? [setCookie]
      : [];
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function getMagicLinksPage(url: string, axios: any, requestHeaders: any) {
  const redirectResponse = await axios.get(url, {
    headers: requestHeaders,
    maxRedirects: 0,
    responseType: "text",
    validateStatus: (status: number) => status >= 200 && status < 400,
  });

  const location = redirectResponse.headers?.location;
  if (!location || redirectResponse.status < 300) return redirectResponse;

  const destination = new URL(location, url);
  destination.searchParams.set("_ml", Date.now().toString());

  return axios.get(destination.href, {
    headers: {
      ...requestHeaders,
      Cookie: getResponseCookies(redirectResponse.headers?.["set-cookie"]),
      Referer: url,
    },
    responseType: "text",
  });
}

async function getWithWAF(
  url: string,
  axios: any,
  openWebView: any,
): Promise<any> {
  const baseUrl = url.split("/").slice(0, 3).join("/");
  const requestHeaders = { ...headers, Referer: baseUrl };
  try {
    if (new URL(url).hostname.includes("magiclinks.lol")) {
      return await getMagicLinksPage(url, axios, requestHeaders);
    }
    return await axios.get(url, {
      headers: requestHeaders,
      responseType: "text",
    });
  } catch (error: any) {
    if (error.response?.status === 403 && openWebView) {
      console.log(`WAF detected (403) for ${url}, using solver...`);
      const wafResult = await openWebView(baseUrl, {
        title: "Solve the captcha below and click done",
        description: "Required to bypass anti-bot protection.",
        headers: { ...headers, Referer: baseUrl },
        waitForCookie: "cf_clearance",
      });
      return await axios.get(url, {
        headers: { ...headers, Referer: baseUrl, Cookie: wafResult.cookies },
        responseType: "text",
      });
    }
    throw error;
  }
}

function extractDownloadLinks($: any): { server: ServerName; link: string }[] {
  const links: { server: ServerName; link: string }[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_: number, element: any) => {
    const href = $(element).attr("href")?.trim();
    if (!href || seen.has(href)) return;
    const name = $(element).text().replace(/\s+/g, " ").trim().toUpperCase();

    for (const [server, matches] of Object.entries(SERVER_PATTERNS)) {
      if (matches(name, href)) {
        seen.add(href);
        links.push({ server: server as ServerName, link: href });
        return;
      }
    }
  });

  return links;
}

async function captureRedirect(
  url: string,
  axios: any,
  requestHeaders: any,
): Promise<string> {
  const response = await axios.get(url, {
    headers: requestHeaders,
    maxRedirects: 0,
    validateStatus: (status: number) => status >= 200 && status < 400,
  });
  return response.headers?.location
    ? new URL(response.headers.location, url).href
    : "";
}

async function resolveZipZap(
  link: string,
  axios: any,
  cheerio: any,
  commonHeaders: Record<string, string>,
): Promise<Stream | null> {
  const downloadUrl = new URL(link);
  const requestHeaders = {
    ...headers,
    ...commonHeaders,
    Referer: downloadUrl.origin,
  };

  const pageResponse = await axios.get(downloadUrl.href, {
    headers: requestHeaders,
  });
  const $ = cheerio.load(pageResponse.data);
  const r2Href = $("a[href*='dl=r2']").first().attr("href");
  if (!r2Href) return null;

  const r2Url = new URL(r2Href, downloadUrl);
  const rawUrl = await captureRedirect(r2Url.href, axios, {
    ...requestHeaders,
    Referer: downloadUrl.href,
  });
  return rawUrl ? { server: "ZIP-ZAP", link: rawUrl, type: "mkv" } : null;
}

async function resolveBuzzheavier(
  link: string,
  axios: any,
  cheerio: any,
  commonHeaders: Record<string, string>,
): Promise<Stream | null> {
  const origin = new URL(link).origin;
  const requestHeaders = {
    ...browserHeaders,
    ...commonHeaders,
    Referer: origin,
  };

  const pageResponse = await axios.get(link, { headers: requestHeaders });
  const $ = cheerio.load(pageResponse.data);
  const downloadPath = $("a.download-btn").attr("hx-get");
  if (!downloadPath) return null;

  const downloadUrl = new URL(downloadPath, origin).href;
  console.log("Buzzheavier download path:", downloadUrl);

  const rawUrl = await captureRedirect(downloadUrl, axios, {
    ...requestHeaders,
    Referer: link,
  });
  return rawUrl ? { server: "BUZZHEAVIER", link: rawUrl, type: "mkv" } : null;
}

async function resolveSkyDrop(
  link: string,
  axios: any,
): Promise<Stream | null> {
  const skyDropUrl = new URL(link);
  const id = skyDropUrl.searchParams.get("id");
  if (!id) return null;

  const response = await axios.get(`${skyDropUrl.origin}/api.php`, {
    params: { id },
    headers,
  });
  if (!response.data?.success || !response.data.link) return null;
  return { server: "SkyDrop", link: response.data.link, type: "mkv" };
}

async function resolveGofile(link: string, axios: any): Promise<Stream | null> {
  const gofileUrl = new URL(link);
  const id = gofileUrl.pathname.split("/").filter(Boolean).pop();
  if (!id) return null;

  const result = await gofileExtractor(id, axios);
  if (!result.link || !result.token) return null;

  return {
    server: "Gofile",
    link: result.link,
    type: "mkv",
    headers: {
      Referer: "https://gofile.io/",
      Cookie: `accountToken=${result.token}`,
    },
  };
}

export async function getStream({
  link,
  type,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}) {
  const { axios, cheerio, openWebView, commonHeaders } = providerContext;

  try {
    const res = await getWithWAF(link, axios, openWebView);
    const $ = cheerio.load(res.data);
    const downloadLinks = extractDownloadLinks($);

    const resolvers: Record<
      ServerName,
      (link: string) => Promise<Stream | null>
    > = {
      "ZIP-ZAP": (l) => resolveZipZap(l, axios, cheerio, commonHeaders || {}),
      BUZZHEAVIER: (l) =>
        resolveBuzzheavier(l, axios, cheerio, commonHeaders || {}),
      SKYDROP: (l) => resolveSkyDrop(l, axios),
      GOFILE: (l) => resolveGofile(l, axios),
    };

    const streams: Stream[] = [];
    const seen = new Set<string>();

    for (const server of [
      "ZIP-ZAP",
      "BUZZHEAVIER",
      "SKYDROP",
      "GOFILE",
    ] as ServerName[]) {
      for (const { link } of downloadLinks.filter((d) => d.server === server)) {
        try {
          const stream = await resolvers[server](link);
          if (stream && !seen.has(stream.link)) {
            seen.add(stream.link);
            streams.push(stream);
          }
        } catch (error: any) {
          console.log(`${server} failed:`, error.message);
        }
      }
    }

    return streams;
  } catch (error: any) {
    console.log("getStream error:", error.message);
    return [];
  }
}
