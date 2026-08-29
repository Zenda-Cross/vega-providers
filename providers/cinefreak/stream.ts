import { ProviderContext, Stream } from "../types";
import { hubcloudExtractor } from "../extractors/hubcloud";
import { zcloudExtractor } from "../extractors/zcloud";
import { throwProviderError } from "../providerErrors";

function decodeBase64Safe(str: string): string {
  try {
    return atob(str);
  } catch {
    try {
      return Buffer.from(str, "base64").toString("utf8");
    } catch {
      return str;
    }
  }
}

function resolveCinecloudUrl(link: string): string {
  try {
    if (link.includes("generate.php") && link.includes("id=")) {
      const urlObj = new URL(link);
      const rawId = urlObj.searchParams.get("id") || "";
      if (rawId) {
        const decoded = decodeBase64Safe(rawId);
        if (decoded.startsWith("http")) {
          // Clean possible suffix like 'newgo32'
          const cleaned = decoded.replace(/newgo\d*$/i, "");
          return cleaned;
        }
      }
    }
  } catch {
    // Keep link unchanged on parsing errors
  }
  return link;
}

async function followRedirect(
  link: string,
  headers: any,
  signal: AbortSignal | undefined,
  cheerio: any,
  axios: any
): Promise<string> {
  try {
    const res1 = await axios.get(link, {
      headers,
      signal,
      maxRedirects: 0,
      timeout: 8000,
      validateStatus: (s: number) => s >= 200 && s < 400,
    });

    let newLink = link;
    if (res1.headers?.["location"]) {
      newLink = res1.headers["location"];
    } else if (res1.status === 200 && typeof res1.data === "string") {
      try {
        const $ = cheerio.load(res1.data);
        const instantLink = $(
          "a.instant-download, a.download-btn, a.fsl-btn, a.server-btn, a.btn-success"
        ).attr("href");
        if (instantLink && instantLink !== "#") {
          newLink = instantLink;
        }
      } catch {}
    }

    if (newLink.startsWith("/")) {
      const url = new URL(link);
      newLink = `${url.origin}${newLink}`;
    }

    if (newLink.includes("googleusercontent")) {
      newLink = newLink.split("?link=")[1] || newLink;
    } else if (newLink !== link && newLink.startsWith("http")) {
      try {
        const res2 = await axios.get(newLink, {
          headers,
          signal,
          maxRedirects: 0,
          timeout: 8000,
          validateStatus: (s: number) => s >= 200 && s < 400,
        });
        if (res2.headers?.["location"]) {
          const loc = res2.headers["location"];
          newLink = loc.includes("?link=") ? loc.split("?link=")[1] : loc;
        }
      } catch {}
    }

    return newLink;
  } catch {
    return link;
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
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  const { axios, cheerio, commonHeaders } = providerContext;
  try {
    let targetLink = resolveCinecloudUrl(link);

    // If still pointing to generate.php, fetch and extract location
    if (targetLink.includes("generate.php")) {
      try {
        const res = await axios.get(targetLink, {
          headers: commonHeaders,
          signal,
        });
        const match = res.data?.match(
          /window\.location\.href\s*=\s*["'](https?:\/\/[^"']+)["']/i,
        );
        if (match?.[1]) {
          targetLink = match[1];
        }
      } catch (e) {
        console.warn("CineFreak: Failed to resolve generate.php via fetch", e);
      }
    }

    const streamLinks: Stream[] = [];
    let baseUrl = "";
    try {
      baseUrl = new URL(targetLink).origin;
    } catch {
      baseUrl = "https://new5.cinecloud.site";
    }

    const idMatch = targetLink.match(/\/(?:x|f|d|w|gp)\/([a-zA-Z0-9]+)/);
    const id = idMatch ? idMatch[1] : "";
    const mainPageUrl = id ? `${baseUrl}/f/${id}` : targetLink;

    let pageHtml = "";
    try {
      const res = await axios.get(mainPageUrl, {
        headers: commonHeaders,
        signal,
      });
      pageHtml = res.data;
    } catch (e: any) {
      if (e.response?.status === 403 && providerContext.openWebView) {
        const cleanHeaders = { ...commonHeaders, Referer: baseUrl };
        delete cleanHeaders["User-Agent"];
        delete cleanHeaders["sec-ch-ua"];
        delete cleanHeaders["sec-ch-ua-mobile"];
        delete cleanHeaders["sec-ch-ua-platform"];
        delete cleanHeaders["Cookie"];

        const wafResult = await providerContext.openWebView(baseUrl, {
          title: "Solve the captcha below and click done",
          description: "Required to bypass anti-bot protection.",
          headers: cleanHeaders,
          waitForCookie: "cf_clearance",
          force: true,
        });
        if (wafResult.userAgent) commonHeaders["User-Agent"] = wafResult.userAgent;
        commonHeaders["Cookie"] = (commonHeaders["Cookie"] ? commonHeaders["Cookie"] + "; " : "") + wafResult.cookies;
        const retryRes = await axios.get(mainPageUrl, { headers: commonHeaders, signal });
        pageHtml = retryRes.data;
      } else {
        throw e;
      }
    }

    const $ = cheerio.load(pageHtml);
    const linkElements = $(".server-btn");

    for (const el of linkElements) {
      const btn = $(el);
      let href = btn.attr("href") || "";
      if (!href || href === "#") continue;

      if (href.startsWith("/")) {
        href = `${baseUrl}${href}`;
      }

      const text = btn.text().trim().toLowerCase();

      try {
        if (href.includes(".dev") && !href.includes("/?id=")) {
          streamLinks.push({ server: "Fast Cloud", link: href, type: "mkv" });
        } else if (href.includes("/w/") || href.includes("/gp/") || text.includes("instant download")) {
          const newLink = await followRedirect(href, commonHeaders, signal, cheerio, axios);
          if (newLink && newLink !== href) {
            streamLinks.push({
              server: text.includes("v2") || href.includes("/gp/") ? "Instant V2 (download only)" : "Instant (download only)",
              link: newLink,
              type: "mkv"
            });
          }
        } else if (href.includes("/d/") || text.includes("cloud [resumable]")) {
          let dPageHtml = "";
          try {
            const dPageRes = await axios.get(href, { headers: commonHeaders, signal });
            dPageHtml = dPageRes.data;
          } catch (e: any) {
            if (e.response?.status === 403 && providerContext.openWebView) {
              const retryRes = await axios.get(href, { headers: commonHeaders, signal });
              dPageHtml = retryRes.data;
            }
          }

          if (dPageHtml && !dPageHtml.includes("File not Found") && !dPageHtml.includes("cannot be found")) {
            const $dPage = cheerio.load(dPageHtml);
            let dPageLink: string | null | undefined = $dPage("a.download-now, a.btn-warning, a:contains('Download Now')").attr("href");

            if (dPageLink && (dPageLink.includes("/x/") || dPageLink.includes("/w/") || dPageLink.includes("/gp/") || dPageLink === "#")) {
              dPageLink = null;
            }

            if (!dPageLink) {
              $dPage("a[href]").each((_, aEl) => {
                const h = $dPage(aEl).attr("href") || "";
                if (h.includes("cloudflarestorage") || h.includes(".r2.dev") || h.includes("response-content-disposition")) {
                  dPageLink = h;
                }
              });
            }

            if (!dPageLink) {
              const match = dPageHtml.match(/https?:\/\/[^\s"'<>]*(?:cloudflarestorage|r2\.dev)[^\s"'<>]*/);
              if (match) {
                dPageLink = match[0];
              }
            }

            if (dPageLink && dPageLink.startsWith("http") && !dPageLink.includes("/x/")) {
              streamLinks.push({ server: "Cloud Resumable", link: dPageLink, type: "mkv" });
            }
          }
        } else if (href.includes("/x/") || text.includes("stream online")) {
          try {
            const xRes = await axios.get(href, { headers: commonHeaders, signal });
            const $x = cheerio.load(xRes.data);
            const iframeSrc = $x("iframe").attr("src");
            if (iframeSrc) {
              const u = new URL(iframeSrc.startsWith("//") ? "https:" + iframeSrc : iframeSrc);
              const rawId = u.searchParams.get("id");
              if (rawId && rawId.startsWith("http")) {
                streamLinks.push({ server: "Stream Online", link: rawId, type: "mkv" });
              }
            }
          } catch (err) {}
        }
      } catch (error) {
        console.warn(`Cinefreak extraction error for ${href}:`, error);
      }
    }

    let preferredServer = "auto";
    try {
      preferredServer = (
        (await providerContext?.kvStore?.get<string>("cinefreak_preferredDownloadServer")) ||
        "auto"
      )
        .toLowerCase()
        .trim();
    } catch {}

    const getPriority = (server: string = "") => {
      const s = server.toLowerCase();
      if (
        isDownload &&
        preferredServer !== "auto" &&
        preferredServer !== "" &&
        s.includes(preferredServer)
      ) {
        return 0;
      }
      if (isDownload) {
        if (s.includes("resumable") || s.includes("storage")) return 1;
        if (s.includes("instant (download only)")) return 2;
        if (s.includes("instant v2")) return 3;
        if (s.includes("stream online")) return 4;
        if (s.includes("fast cloud") || s.includes("worker")) return 5;
      } else {
        if (s.includes("resumable") || s.includes("storage")) return 1;
        if (s.includes("fast cloud") || s.includes("worker")) return 2;
        if (s.includes("stream online")) return 3;
        if (s.includes("instant (download only)")) return 4;
        if (s.includes("instant v2")) return 5;
      }
      return 6;
    };

    streamLinks.sort((a, b) => getPriority(a.server) - getPriority(b.server));



    return streamLinks;
  } catch (error: any) {
    throwProviderError("CineFreak", "stream", error);
    return [];
  }
}

