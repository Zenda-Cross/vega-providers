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
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
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

    let pageHtml = "";
    try {
      const res = await axios.get(targetLink, {
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
        const retryRes = await axios.get(targetLink, { headers: commonHeaders, signal });
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
          // Fast Cloud [FSL]
          streamLinks.push({ server: "Fast Cloud", link: href, type: "mkv" });
        } else if (href.includes("/w/") || href.includes("/gp/") || text.includes("instant download")) {
          // Instant Download and Instant Download [V2] - Follow redirects
          const newLink = await followRedirect(href, commonHeaders, signal, cheerio);
          if (newLink && newLink !== href) {
            streamLinks.push({ 
              server: text.includes("v2") || href.includes("/gp/") ? "Instant Download V2" : "Instant Download", 
              link: newLink, 
              type: "mkv" 
            });
          }
        } else if (href.includes("/d/") || text.includes("cloud [resumable]")) {
          // Cloud [Resumable]
          let dPageHtml = "";
          try {
            const dPageRes = await axios.get(href, { headers: commonHeaders, signal });
            dPageHtml = dPageRes.data;
          } catch (e: any) {
            if (e.response?.status === 403 && providerContext.openWebView) {
               const retryRes = await axios.get(href, { headers: commonHeaders, signal });
               dPageHtml = retryRes.data;
            } else {
               throw e;
            }
          }
          
          const $dPage = cheerio.load(dPageHtml);
          let dPageLink = $dPage("a.btn-success, a.btn-primary, a.btn-danger, a.server-btn").attr("href");
          
          if (!dPageLink) {
            const match = dPageHtml.match(/https?:\/\/[^\s"'<>]*(?:cloudflarestorage|r2\.dev)[^\s"'<>]*/);
            if (match) {
              dPageLink = match[0];
            }
          }

          if (dPageLink) {
             if (dPageLink.startsWith("/")) {
                 dPageLink = `${baseUrl}${dPageLink}`;
             }
             streamLinks.push({ server: "Cloud Resumable", link: dPageLink, type: "mkv" });
          }
        } else if (href.includes("/x/") || text.includes("stream online")) {
           // Stream online button
           const newLink = await followRedirect(href, commonHeaders, signal, cheerio);
           if (newLink && newLink !== href) {
              streamLinks.push({ server: "Stream Online", link: newLink, type: "mkv" });
           }
        }
      } catch (error) {
        console.warn(`Cinefreak extraction error for ${href}:`, error);
      }
    }

    return streamLinks;
  } catch (error: any) {
    throwProviderError("CineFreak", "stream", error);
    return [];
  }
}

