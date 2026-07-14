import { ProviderContext, Stream } from "../types";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
};

const browserNavigationHeaders = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-US,en;q=0.9,en-IN;q=0.8",
  "Cache-Control": "no-cache",
  DNT: "1",
  Pragma: "no-cache",
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
    responseType: "arraybuffer",
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
    responseType: "arraybuffer",
  });
}

async function getWithWAF(
  url: string,
  axios: any,
  openWebView: any,
  headers: any,
): Promise<any> {
  const baseUrl = url.split("/").slice(0, 3).join("/");
  const requestHeaders = { ...headers, Referer: baseUrl };
  try {
    if (new URL(url).hostname.includes("magiclinks.lol")) {
      return await getMagicLinksPage(url, axios, requestHeaders);
    }

    return await axios.get(url, {
      headers: requestHeaders,
      responseType: "arraybuffer",
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
        responseType: "arraybuffer",
      });
    }
    throw error;
  }
}

type DownloadLink = {
  server: "ZIP-ZAP" | "BUZZHEAVIER" | "SKYDROP";
  link: string;
};

function extractDownloadLinks($: any): DownloadLink[] {
  const links: DownloadLink[] = [];
  const seenLinks = new Set<string>();

  $("a[href]").each((_: number, element: any) => {
    const anchor = $(element);
    const href = anchor.attr("href")?.trim();
    const serverName = anchor.text().replace(/\s+/g, " ").trim();
    const normalizedName = serverName.toUpperCase();
    const isZipZap =
      normalizedName.includes("ZIP-ZAP") ||
      href?.includes("kmphotos.cv/download");
    const isBuzzheavier =
      normalizedName.includes("BUZZHEAVIER") ||
      normalizedName.includes("BUZZHIEVER") ||
      href?.includes("bzzhr.co");
    const isSkyDrop =
      normalizedName.includes("SKYDROP") || href?.includes("skydrop.sbs/");

    if (
      !href ||
      seenLinks.has(href) ||
      (!isZipZap && !isBuzzheavier && !isSkyDrop)
    )
      return;

    seenLinks.add(href);
    links.push({
      server: isZipZap ? "ZIP-ZAP" : isBuzzheavier ? "BUZZHEAVIER" : "SKYDROP",
      link: href,
    });
  });

  return links;
}

async function getRedirectLocation(
  url: string,
  axios: any,
  commonHeaders: Record<string, string>,
  cheerio: any,
): Promise<string> {
  const downloadUrl = new URL(url);
  const requestHeaders = downloadUrl.hostname.includes("bzzhr.co")
    ? { ...browserNavigationHeaders, ...commonHeaders }
    : { ...headers, ...commonHeaders, Referer: downloadUrl.origin };

  if (downloadUrl.hostname.includes("kmphotos.cv")) {
    const pageResponse = await axios.get(downloadUrl.href, {
      headers: requestHeaders,
    });
    const $ = cheerio.load(pageResponse.data);
    const r2Href = $("a[href*='dl=r2']").first().attr("href");
    if (!r2Href) return "";

    const r2Url = new URL(r2Href, downloadUrl);
    const r2Response = await axios.get(r2Url.href, {
      headers: { ...requestHeaders, Referer: downloadUrl.href },
      maxRedirects: 0,
      validateStatus: (status: number) => status >= 200 && status < 400,
    });
    return r2Response.headers?.location
      ? new URL(r2Response.headers.location, r2Url).href
      : "";
  }

  const response = await axios.get(downloadUrl.href, {
    headers: {
      ...requestHeaders,
      cookie:
        "ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=DnddJFWOmvOOCKwRCDxJZ9E.RopxVD78H9UiLf7U7Aw-1784052819-1.2.1.1-It9hFhZRIjGqs8lHCx9ljjBQ3tcPOgVUtMbZ8JmhsgNmICGCf1Q_Usv9ZDuoXX8EoMK3N4B1dIz_l5CngONyCilnHvtlO61rE6WYlzPMzmXaUtaqzL3chTkDy4xCRZDyzt8dRaJRm91dzNIwsev5WMltEiJe2Lcd_AXecc3YGV22gZ4XWg3Gr33pScbpIui6ddG1KfZKQUgWYJa77m5lys9vQms0M6lDjuF.y3ODQpAOtrXIrj_ZLdgL53OVF8kuU7cRM4e8Dkz2l0OoYxYjIJCYingEUE6uPcUs.unJUSFtOqG_BxdFa2Ic0k1fSikd5E819MkPcST7Uj0QuK7Z9Q",
    },
    maxRedirects: 0,
    validateStatus: (status: number) => status >= 200 && status < 400,
  });

  return response.headers?.location
    ? new URL(response.headers.location, downloadUrl).href
    : "";
}

async function resolveDownloadLink(
  downloadLink: DownloadLink,
  axios: any,
  commonHeaders: Record<string, string>,
  cheerio: any,
): Promise<Stream[]> {
  if (downloadLink.server === "SKYDROP") {
    const skyDropUrl = new URL(downloadLink.link);
    const id = skyDropUrl.searchParams.get("id");
    if (!id) return [];

    const response = await axios.get(`${skyDropUrl.origin}/api.php`, {
      params: { id },
      headers,
    });
    return response.data?.success && response.data.link
      ? [
          {
            server: "SkyDrop",
            link: response.data.link,
            type: "mkv",
          },
        ]
      : [];
  }

  const rawUrl = await getRedirectLocation(
    downloadLink.link,
    axios,
    commonHeaders,
    cheerio,
  );
  return rawUrl
    ? [{ server: downloadLink.server, link: rawUrl, type: "mkv" }]
    : [];
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
    // Fetch the page HTML
    const res = await getWithWAF(link, axios, openWebView, headers);
    const $ = cheerio.load(new TextDecoder().decode(res.data));
    const downloadLinks = extractDownloadLinks($);
    for (const server of ["ZIP-ZAP", "BUZZHEAVIER", "SKYDROP"] as const) {
      const downloadLink = downloadLinks.find((item) => item.server === server);
      if (!downloadLink) continue;

      try {
        const streams = await resolveDownloadLink(
          downloadLink,
          axios,
          commonHeaders || {},
          cheerio,
        );
        if (streams.length > 0) return streams;
      } catch (error: any) {
        console.log(`${server} resolution failed:`, error.message);
      }
    }

    return [];
  } catch (error: any) {
    console.log("getStream error: ", error.message);
    return [];
  }
}
