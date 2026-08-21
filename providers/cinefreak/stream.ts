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

async function followRedirect(link: string, headers: any, signal: AbortSignal, cheerio: any): Promise<string> {
  const newLinkRes = await fetch(link, {
    method: "GET",
    headers,
    signal,
    redirect: "manual",
  });

  let newLink = link;
  if (newLinkRes.status >= 300 && newLinkRes.status < 400) {
    newLink = newLinkRes.headers.get("location") || link;
  } else if (newLinkRes.status === 200) {
    // Some cinecloud links return a 200 page with the real link in the DOM
    try {
      const html = await newLinkRes.text();
      const $ = cheerio.load(html);
      let instantLink = $("a.instant-download, a.download-btn, a.fsl-btn, a.server-btn").attr("href");

      // Some templates use btn-success for the initial page redirect
      if (!instantLink) {
        instantLink = $("a.btn-success").attr("href");
      }

      if (instantLink && instantLink !== "#") {
        newLink = instantLink;
      }
    } catch (e) {
      console.warn("followRedirect: failed to parse 200 body", e);
    }
  } else if (newLinkRes.url && newLinkRes.url !== link) {
    newLink = newLinkRes.url;
  } else {
    newLink = newLinkRes.headers.get("location") || link;
  }

  if (newLink.startsWith("/")) {
    const url = new URL(link);
    newLink = `${url.origin}${newLink}`;
  }

  if (newLink.includes("googleusercontent")) {
    newLink = newLink.split("?link=")[1] || newLink;
  } else if (newLink !== link) {
    const newLinkRes2 = await fetch(newLink, {
      method: "GET",
      headers,
      signal,
      redirect: "manual",
    });

    if (newLinkRes2.status >= 300 && newLinkRes2.status < 400) {
      newLink = newLinkRes2.headers.get("location")?.split("?link=")[1] || newLink;
    } else if (newLinkRes2.url && newLinkRes2.url !== newLink) {
      newLink = newLinkRes2.url.split("?link=")[1] || newLinkRes2.url;
    } else {
      newLink = newLinkRes2.headers.get("location")?.split("?link=")[1] || newLink;
    }
  }

  return newLink;
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
          const newLink = await followRedirect(href, commonHeaders, signal, cheerio);
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
        (await providerContext?.kvStore?.get<string>("preferredDownloadServer")) ||
        "auto"
      )
        .toLowerCase()
        .trim();
    } catch {}

    const getPriority = (server: string = "") => {
      const s = server.toLowerCase();
      if (
        preferredServer !== "auto" &&
        preferredServer !== "" &&
        s.includes(preferredServer)
      ) {
        return 0;
      }
      if (isDownload) {
        if (s.includes("fast cloud")) return 1;
        if (s.includes("resumable")) return 2;
        if (s.includes("instant (download only)")) return 3;
        if (s.includes("instant v2")) return 4;
        if (s.includes("stream online")) return 5;
      } else {
        if (s.includes("fast cloud")) return 1;
        if (s.includes("stream online")) return 2;
        if (s.includes("resumable")) return 3;
        if (s.includes("instant (download only)")) return 4;
        if (s.includes("instant v2")) return 5;
      }
      return 6;
    };

    streamLinks.sort((a, b) => getPriority(a.server) - getPriority(b.server));

    if (isDownload && streamLinks.length > 0) {
      const checkHealth = async (linkUrl: string): Promise<boolean> => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          if (signal) {
            signal.addEventListener("abort", () => controller.abort(), { once: true });
          }
          const res = await fetch(linkUrl, {
            method: "HEAD",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            signal: controller.signal,
            redirect: "follow",
          });
          clearTimeout(timeoutId);
          if (res.status >= 200 && res.status < 400) return true;
          if (res.status === 405 || res.status === 403) {
            const getController = new AbortController();
            const getTimeoutId = setTimeout(() => getController.abort(), 4000);
            if (signal) {
              signal.addEventListener("abort", () => getController.abort(), { once: true });
            }
            const getRes = await fetch(linkUrl, {
              method: "GET",
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                Range: "bytes=0-0",
              },
              signal: getController.signal,
            });
            clearTimeout(getTimeoutId);
            return getRes.status >= 200 && getRes.status < 400;
          }
          return false;
        } catch {
          return false;
        }
      };

      const isTopHealthy = await checkHealth(streamLinks[0].link);
      if (!isTopHealthy) {
        let healthyIndex = -1;
        for (let i = 1; i < streamLinks.length; i++) {
          const isHealthy = await checkHealth(streamLinks[i].link);
          if (isHealthy) {
            healthyIndex = i;
            break;
          }
        }
        if (healthyIndex > 0) {
          const [workingStream] = streamLinks.splice(healthyIndex, 1);
          streamLinks.unshift(workingStream);
        }
      }
    }

    return streamLinks;
  } catch (error: any) {
    throwProviderError("CineFreak", "stream", error);
    return [];
  }
}

