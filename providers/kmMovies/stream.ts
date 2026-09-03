import { ProviderContext, Stream } from "../types";
import { gofileExtractor } from "../extractors/gofile";
import { hubcloudExtractor } from "../extractors/hubcloud";
import { throwProviderError } from "../providerErrors";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
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
    '"Not;A=Brand";v="8", "Chromium";v="131", "Microsoft Edge";v="131"',
  "Sec-CH-UA-Mobile": "?0",
  "Sec-CH-UA-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

type ServerName = "ZIP-ZAP" | "BUZZHEAVIER" | "SKYDROP" | "GOFILE" | "HUBCLOUD";

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
    href.includes("gofile.io/") ||
    (name.includes("GOFILE") && !href.includes(".php")),
  HUBCLOUD: (name, href) =>
    name.includes("HUBCLOUD") || href.includes("hubcloud."),
};

async function getMagicLinksPage(
  url: string,
  requestHeaders: Record<string, string>,
) {
  const initialResponse = await fetch(url, {
    headers: requestHeaders,
    credentials: "include",
    cache: "no-store",
    redirect: "manual",
  });
  const location = initialResponse.headers.get("location");
  const setCookie = initialResponse.headers.get("set-cookie");

  if (!location || !setCookie) {
    if (!initialResponse.ok) {
      throw new Error(
        `HTTP ${initialResponse.status} ${initialResponse.statusText} | URL ${url}`,
      );
    }
    return { data: await initialResponse.text() };
  }

  const cookie = setCookie.split(";", 1)[0];
  const destination = new URL(location, url).href;
  const response = await fetch(destination, {
    headers: {
      ...requestHeaders,
      Cookie: cookie,
      Referer: url,
    },
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText} | URL ${destination}`,
    );
  }

  return { data: await response.text() };
}

async function getWithWAF(
  url: string,
  axios: any,
  openWebView: any,
): Promise<any> {
  const baseUrl = url.split("/").slice(0, 3).join("/");
  const requestHeaders = { ...headers, Referer: baseUrl };
  try {
    if (new URL(url).hostname.includes("magiclinks")) {
      return await getMagicLinksPage(url, requestHeaders);
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
        headers: {
          ...headers,
          Referer: baseUrl,
          Cookie: wafResult.cookies || wafResult.cookie,
        },
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
  try {
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
  } catch (err: any) {
    console.log("resolveZipZap error:", err?.message || err);
    return null;
  }
}

async function resolveBuzzheavier(
  link: string,
  axios: any,
  cheerio: any,
  commonHeaders: Record<string, string>,
): Promise<Stream | null> {
  try {
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
    const setCookie = pageResponse.headers?.["set-cookie"];
    const cookie = (Array.isArray(setCookie) ? setCookie : [setCookie])
      .filter(Boolean)
      .map((value: string) => value.split(";", 1)[0])
      .join("; ");
    const downloadResponse = await axios.head(downloadUrl, {
      headers: {
        ...requestHeaders,
        Referer: link,
        "HX-Request": "true",
        "HX-Current-URL": link,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      validateStatus: (status: number) => status >= 200 && status < 300,
    });
    const redirectUrl = downloadResponse.headers?.["hx-redirect"];
    if (!redirectUrl) return null;

    return {
      server: "BUZZHEAVIER",
      link: new URL(redirectUrl, origin).href,
      type: "mkv",
      headers: {
        Referer: link,
        "User-Agent": requestHeaders["User-Agent"],
      },
    };
  } catch (err: any) {
    console.log("resolveBuzzheavier error:", err?.message || err);
    return null;
  }
}

async function resolveSkyDrop(
  link: string,
  axios: any,
  providerContext?: any,
): Promise<Stream | null> {
  try {
    const skyDropUrl = new URL(link);
    const origin = skyDropUrl.origin;
    const id = skyDropUrl.searchParams.get("id");
    if (!id) return null;

    const reqHeaders: Record<string, string> = {
      ...headers,
      Referer: link,
      Origin: origin,
      "X-Requested-With": "XMLHttpRequest",
    };

    // Step 1: Initial GET to download.php to capture session cookies
    const getRes = await axios.get(link, { headers: reqHeaders });
    let setCookie =
      getRes.headers?.["set-cookie"] ||
      getRes.headers?.["Set-Cookie"] ||
      getRes.headers?.["x-set-cookie"] ||
      getRes.headers?.["X-Set-Cookie"] ||
      (typeof getRes.headers?.get === "function"
        ? getRes.headers.get("x-set-cookie") || getRes.headers.get("set-cookie")
        : "");

    if (!setCookie && providerContext?.openWebView) {
      try {
        const waf = await providerContext.openWebView(link, {
          headers: reqHeaders,
          waitForCookie: "skydrop_download",
        });
        if (waf?.cookies) {
          setCookie = waf.cookies;
        }
      } catch {}
    }

    if (setCookie) {
      const cookieHeader = (Array.isArray(setCookie) ? setCookie : [setCookie])
        .map((c: string) => c.split(";")[0])
        .join("; ");
      reqHeaders["Cookie"] = cookieHeader;
    }

    // Step 2: POST /resolve/
    const resolveRes = await axios.post(
      `${origin}/resolve/`,
      {},
      { headers: reqHeaders },
    );
    if (resolveRes.data?.success && resolveRes.data?.ready_url) {
      const readyUrl = new URL(resolveRes.data.ready_url, origin).href;

      // Step 3: GET the ready_url to establish download state
      const readyRes = await axios.get(readyUrl, {
        headers: {
          ...reqHeaders,
          Referer: link,
        },
      });
      const extraCookieRaw =
        readyRes.headers?.["set-cookie"] ||
        readyRes.headers?.["Set-Cookie"] ||
        (typeof readyRes.headers?.get === "function"
          ? readyRes.headers.get("set-cookie")
          : "");
      if (extraCookieRaw) {
        const extraCookie = (
          Array.isArray(extraCookieRaw) ? extraCookieRaw : [extraCookieRaw]
        )
          .map((c: string) => c.split(";")[0])
          .join("; ");
        reqHeaders["Cookie"] =
          (reqHeaders["Cookie"] ? reqHeaders["Cookie"] + "; " : "") + extraCookie;
      }

      let finalLocation = "";

      // 1. Try axios with maxRedirects: 0
      try {
        const fetchRes = await axios.post(
          `${origin}/fetch/`,
          {},
          {
            headers: {
              ...reqHeaders,
              Referer: readyUrl,
            },
            maxRedirects: 0,
            validateStatus: (status: number) => status >= 200 && status < 400,
          },
        );
        const loc =
          fetchRes.headers?.location ||
          fetchRes.headers?.["location"] ||
          (typeof fetchRes.headers?.get === "function"
            ? fetchRes.headers.get("location")
            : "") ||
          fetchRes.request?.responseURL ||
          "";
        if (loc && (loc.includes("http") || loc.startsWith("/"))) {
          finalLocation = new URL(loc, origin).href;
        }
      } catch (err: any) {
        const loc =
          err.response?.headers?.location ||
          err.response?.headers?.["location"] ||
          err.request?.responseURL;
        if (loc && (loc.includes("http") || loc.startsWith("/"))) {
          finalLocation = new URL(loc, origin).href;
        }
      }

      // 2. Fallback to fetch if needed
      if (!finalLocation && typeof fetch !== "undefined") {
        const controller = new AbortController();
        try {
          const fRes = await fetch(`${origin}/fetch/`, {
            method: "POST",
            headers: {
              ...reqHeaders,
              Referer: readyUrl,
            },
            signal: controller.signal,
          });
          if (fRes.url && fRes.url.includes("googleusercontent")) {
            finalLocation = fRes.url;
          } else if (fRes.headers.get("location")) {
            finalLocation = fRes.headers.get("location") || "";
          }
        } catch {} finally {
          controller.abort();
        }
      }

      if (finalLocation && finalLocation.includes("googleusercontent")) {
        return {
          server: "G-Drive (download only)",
          link: finalLocation,
          type: "mkv",
        };
      }

      return {
        server: finalLocation ? "G-Drive (download only)" : "SkyDrop (download only)",
        link: finalLocation || `${origin}/fetch/`,
        type: "mkv",
        headers: {
          Referer: readyUrl,
          ...(reqHeaders["Cookie"] ? { Cookie: reqHeaders["Cookie"] } : {}),
          "User-Agent": headers["User-Agent"],
        },
      };
    }
  } catch (err: any) {
    console.log("resolveSkyDrop error:", err?.message || err);
  }
  return null;
}

async function resolveGofile(
  link: string,
  axios: any,
  providerContext?: any,
): Promise<Stream | null> {
  try {
    if (!link.includes("gofile.io")) return null;
    const gofileUrl = new URL(link);
    const id = gofileUrl.pathname.split("/").filter(Boolean).pop();
    if (!id || id.endsWith(".php") || id.endsWith(".html")) return null;

    const result = await gofileExtractor(id, axios, providerContext);
    if (!result?.link || !result?.token) return null;

    return {
      server: "Gofile",
      link: result.link,
      type: "mkv",
      headers: {
        Referer: "https://gofile.io/",
        Cookie: `accountToken=${result.token}`,
      },
    };
  } catch (err: any) {
    console.log("resolveGofile error:", err?.message || err);
    return null;
  }
}

async function resolveHubcloud(
  link: string,
  signal: AbortSignal,
  axios: any,
  cheerio: any,
  commonHeaders: Record<string, string>,
  providerContext?: ProviderContext,
  isDownload?: boolean,
): Promise<Stream | null> {
  try {
    const streams = await hubcloudExtractor(
      link,
      signal,
      axios,
      cheerio,
      {
        ...headers,
        Referer: link,
        ...commonHeaders,
      },
      providerContext,
    );
    if (!streams?.length) return null;

    if (isDownload) {
      streams.sort((a, b) => {
        const aIsDownload = a.server.toLowerCase().includes("download");
        const bIsDownload = b.server.toLowerCase().includes("download");
        if (aIsDownload && !bIsDownload) return -1;
        if (!aIsDownload && bIsDownload) return 1;
        return 0;
      });
    }

    return streams[0];
  } catch (err: any) {
    console.log("resolveHubcloud error:", err?.message || err);
    return null;
  }
}

export async function getStream({
  link,
  type,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}) {
  const { axios, cheerio, openWebView, commonHeaders } = providerContext;

  try {
    const resolvers: Record<
      ServerName,
      (link: string) => Promise<Stream | null>
    > = {
      "ZIP-ZAP": (l) => resolveZipZap(l, axios, cheerio, commonHeaders || {}),
      BUZZHEAVIER: (l) =>
        resolveBuzzheavier(l, axios, cheerio, commonHeaders || {}),
      SKYDROP: (l) => resolveSkyDrop(l, axios, providerContext),
      GOFILE: (l) => resolveGofile(l, axios, providerContext),
      HUBCLOUD: (l) =>
        resolveHubcloud(
          l,
          signal,
          axios,
          cheerio,
          commonHeaders || {},
          providerContext,
          isDownload,
        ),
    };

    // 1. Check if the link itself is already a direct server link (test URL only, empty name)
    for (const [server, matches] of Object.entries(SERVER_PATTERNS)) {
      if (matches("", link)) {
        try {
          const stream = await resolvers[server as ServerName](link);
          if (stream) return [stream];
        } catch (err: any) {
          console.log(`Direct ${server} check failed:`, err?.message || err);
        }
      }
    }

    // 2. Otherwise fetch the page and extract all server buttons
    const res = await getWithWAF(link, axios, openWebView);
    const $ = cheerio.load(res.data);
    const downloadLinks = extractDownloadLinks($);

    const streams: Stream[] = [];
    const seen = new Set<string>();
    const resolverFailures: string[] = [];

    const serverOrder: ServerName[] = isDownload
      ? ["SKYDROP", "ZIP-ZAP", "BUZZHEAVIER", "GOFILE", "HUBCLOUD"]
      : ["ZIP-ZAP", "BUZZHEAVIER", "GOFILE", "HUBCLOUD", "SKYDROP"];

    for (const server of serverOrder) {
      for (const { link: dlLink } of downloadLinks.filter(
        (d) => d.server === server,
      )) {
        try {
          const stream = await resolvers[server](dlLink);
          if (stream && !seen.has(stream.link)) {
            seen.add(stream.link);
            streams.push(stream);
            break;
          }
        } catch (error: any) {
          console.log(`${server} failed:`, error?.message || error);
          resolverFailures.push(`${server}: ${error?.message || String(error)}`);
        }
      }
    }

    if (
      downloadLinks.length > 0 &&
      streams.length === 0 &&
      resolverFailures.length > 0
    ) {
      throw new Error(
        `All stream resolvers failed: ${resolverFailures.join("; ")}`,
      );
    }

    return streams;
  } catch (error: any) {
    throwProviderError("KMMovies", "stream", error);
  }
}
