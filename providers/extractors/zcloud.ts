import { throwProviderError } from "../providerErrors";

const hubcloudDecode = function (value: string) {
  if (value === undefined) {
    return "";
  }
  return atob(value.toString());
};

const extractUrlFromScript = (html: string): string => {
  const doubleAtobMatch = html.match(
    /(?:var|let|const)\s+\w+\s*=\s*atob\(atob\(['"]([^'"]+)['"]\)\)/,
  );
  if (doubleAtobMatch?.[1]) {
    return atob(atob(doubleAtobMatch[1]));
  }
  const plainMatch = html.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/);
  return (
    hubcloudDecode(plainMatch?.[1]?.split("r=")?.[1] ?? "") ||
    plainMatch?.[1] ||
    ""
  );
};

const getPixelDrainUrl = (html: string) => {
  const match = html.match(/var\s+pxl\s*=\s*['"]([^'"]+)['"];?/i);
  return match?.[1] || "";
};

const getRedirectedPixelDrainUrl = (
  ...htmlSources: Array<string | undefined>
) => {
  for (const html of htmlSources) {
    if (!html) {
      continue;
    }

    const redirectedUrl = getPixelDrainUrl(html);
    if (redirectedUrl) {
      return redirectedUrl;
    }
  }

  return "";
};

export async function zcloudExtractor(
  link: string,
  signal: AbortSignal,
  axios: any,
  cheerio: any,
  headers: Record<string, string>,
  providerContext?: any,
) {
  try {
    console.log("zcloudExtractor", link);
    // console.log("headers", headers);
    const baseUrl = link.split("/").slice(0, 3).join("/");
    const streamLinks: any[] = [];
    const openWebView = providerContext?.openWebView;
    // WebView and native HTTP can receive different WAF responses. Reuse a
    // successfully loaded file page instead of immediately requesting it again.
    const pageFromWebView = (result: any): string => {
      const html = typeof result.data === "string" ? result.data : "";
      if (/<title[^>]*>\s*(?:Just a moment|Attention Required)|Sorry, you have been blocked/i.test(html)) return "";
      return html.trim() ? html : "";
    };
    const useWebViewSession = (result: any, requestHeaders: Record<string, string>) => {
      // Retry the same explicit headers used to load the WebView, including
      // Referer. Cookies and User-Agent come from that completed browser session.
      for (const key of Object.keys(headers)) delete headers[key];
      Object.assign(headers, requestHeaders);
      if (result.userAgent) headers["User-Agent"] = result.userAgent;
      if (result.cookies) headers["Cookie"] = result.cookies;
    };

    let vLinkRes: any;
    try {
      vLinkRes = await axios(`${link}`, { headers, signal });
    } catch (error: any) {
      if (error.response?.status === 403) {
        if (openWebView) {
          console.log(
            `zcloudExtractor: WAF detected (403) for ${link}, using solver...`,
          );
          const cleanHeaders = { ...headers, Referer: baseUrl };
          for (const key of Object.keys(cleanHeaders)) {
            if (/^(cookie|user-agent|sec-ch-ua(?:-.*)?)$/i.test(key)) delete cleanHeaders[key];
          }

          const wafResult = await openWebView(link, {
            title: "Open download page",
            description: "If the download page is visible, tap Done. Complete verification only if requested.",
            headers: cleanHeaders,
            force: true,
          });
          useWebViewSession(wafResult, cleanHeaders);
          vLinkRes = pageFromWebView(wafResult)
            ? {data: pageFromWebView(wafResult)}
            : await axios(`${link}`, { headers, signal });
        } else {
          console.log(
            `zcloudExtractor: 403 Forbidden for ${link}, but openWebView solver is not available!`,
          );
          throw error;
        }
      } else {
        throw error;
      }
    }

    const vLinkText = vLinkRes.data;
    const doubleAtobMatch = vLinkText.match(/atob\(atob\(['"]([^'"]+)['"]\)\)/);
    let vcloudLink = link;
    if (doubleAtobMatch?.[1]) {
      const decoded = atob(atob(doubleAtobMatch[1]));
      try {
        const linkUrl = new URL(link);
        const decodedUrl = new URL(decoded);
        decodedUrl.protocol = linkUrl.protocol;
        decodedUrl.host = linkUrl.host;
        vcloudLink = decodedUrl.toString();
      } catch (e) {
        vcloudLink = decoded.replace(/https?:\/\/(?:www\.)?vcloud\.fit/gi, baseUrl);
      }
    }
    console.log("vcloudLink", vcloudLink);

    let vcloudText = "";
    try {
      const vcloudRes = vcloudLink === link
        ? vLinkRes
        : await axios.get(vcloudLink, { headers, signal });
      vcloudText = vcloudRes.data;
    } catch (error: any) {
      if (error.response?.status === 403 && openWebView) {
        console.log(
          `zcloudExtractor: WAF detected (403) for ${vcloudLink}, using solver...`,
        );
        const vcloudBaseUrl = vcloudLink.split("/").slice(0, 3).join("/");
        const cleanHeaders2 = { ...headers, Referer: vcloudBaseUrl };
        for (const key of Object.keys(cleanHeaders2)) {
          if (/^(cookie|user-agent|sec-ch-ua(?:-.*)?)$/i.test(key)) delete cleanHeaders2[key];
        }

        const wafResult = await openWebView(vcloudLink, {
          title: "Open download page",
          description: "If the download page is visible, tap Done. Complete verification only if requested.",
          headers: cleanHeaders2,
          force: true,
        });
        useWebViewSession(wafResult, cleanHeaders2);
        const retryRes = pageFromWebView(wafResult)
          ? {data: pageFromWebView(wafResult)}
          : await axios.get(vcloudLink, { headers, signal });
        vcloudText = retryRes.data;
      } else {
        if (error.response?.status === 403 && !openWebView) {
          console.log(
            `zcloudExtractor: 403 Forbidden for ${vcloudLink}, but openWebView solver is not available!`,
          );
        }
        // Fallback to fetch
        let fetchRes = await fetch(vcloudLink, {
          headers,
          signal,
          redirect: "follow",
        });

        if (fetchRes.status === 403 && openWebView) {
          console.log(
            `zcloudExtractor: WAF detected (403) for ${vcloudLink}, using solver...`,
          );
          const vcloudBaseUrl = vcloudLink.split("/").slice(0, 3).join("/");
          const cleanHeaders3 = { ...headers, Referer: vcloudBaseUrl };
          for (const key of Object.keys(cleanHeaders3)) {
            if (/^(cookie|user-agent|sec-ch-ua(?:-.*)?)$/i.test(key)) delete cleanHeaders3[key];
          }

          const wafResult = await openWebView(vcloudLink, {
            title: "Open download page",
            description: "If the download page is visible, tap Done. Complete verification only if requested.",
            headers: cleanHeaders3,
            force: true,
          });
          useWebViewSession(wafResult, cleanHeaders3);
          fetchRes = pageFromWebView(wafResult)
            ? {ok: true, text: async () => pageFromWebView(wafResult)}
            : await fetch(vcloudLink, {
            headers,
            signal,
            redirect: "follow",
          });
        }

        if (!fetchRes.ok) {
          throw new Error(
            `HTTP ${fetchRes.status} ${fetchRes.statusText} | URL ${vcloudLink}`,
          );
        }
        vcloudText = await fetchRes.text();
      }
    }
    const $ = cheerio.load(vcloudText);
    // console.log("vcloudRes", $.text());

    const linkClass = $("a.server[href], a.btn-success.btn-lg.h6[href]");
    for (const element of linkClass) {
      const itm = $(element);
      let link = itm.attr("href") || "";

      switch (true) {
        case link?.includes("pixeld"):
          console.log("Pixeldrain link found:", link);
          if (!link?.includes("api")) {
            const redirectedPixelDrainUrl = getRedirectedPixelDrainUrl(
              vLinkText,
              vcloudText,
            );
            if (redirectedPixelDrainUrl) {
              console.log(
                "Special case for token negn6f",
                redirectedPixelDrainUrl,
              );
              link = redirectedPixelDrainUrl;
            }

            const token = link.split("/").pop()?.split("?")[0];
            const baseUrl = link.split("/").slice(0, -2).join("/");
            link = `${baseUrl}/api/file/${token}?download`;
          }
          streamLinks.push({ server: "Pixeldrain", link: link, type: "mkv" });
          break;

        case link?.includes(".dev") && !link?.includes("/?id="):
          streamLinks.push({ server: "Cf Worker", link: link, type: "mkv" });
          break;

        case link?.includes("hubcloud") || link?.includes("/?id="):
          try {
            const newLinkRes = await fetch(link, {
              method: "HEAD",
              headers,
              signal,
              redirect: "manual",
            });

            // Check if response is a redirect (301, 302, etc.)
            let newLink = link;
            if (newLinkRes.status >= 300 && newLinkRes.status < 400) {
              newLink = newLinkRes.headers.get("location") || link;
            } else if (newLinkRes.url && newLinkRes.url !== link) {
              // Fallback: check if URL changed (redirect was followed)
              newLink = newLinkRes.url;
            } else {
              newLink = newLinkRes.headers.get("location") || link;
            }
            if (newLink.includes("googleusercontent")) {
              newLink = newLink.split("?link=")[1];
            } else {
              const newLinkRes2 = await fetch(newLink, {
                method: "HEAD",
                headers,
                signal,
                redirect: "manual",
              });

              // Check if response is a redirect
              if (newLinkRes2.status >= 300 && newLinkRes2.status < 400) {
                newLink =
                  newLinkRes2.headers.get("location")?.split("?link=")[1] ||
                  newLink;
              } else if (newLinkRes2.url && newLinkRes2.url !== newLink) {
                // Fallback: URL changed due to redirect
                newLink = newLinkRes2.url.split("?link=")[1] || newLinkRes2.url;
              } else {
                newLink =
                  newLinkRes2.headers.get("location")?.split("?link=")[1] ||
                  newLink;
              }
            }

            streamLinks.push({
              server: "hubcloud",
              link: newLink,
              type: "mkv",
            });
          } catch (error) {
            console.log("zcloudExtractor error in zcloud link: ", error);
          }
          break;

        case link?.includes("cloudflarestorage"):
          streamLinks.push({ server: "CfStorage", link: link, type: "mkv" });
          break;

        case link?.includes("fastdl") || link?.includes("fsl."):
          streamLinks.push({ server: "FastDl", link: link, type: "mkv" });
          break;

        case link.includes("hubcdn") && !link.includes("/?id="):
          streamLinks.push({
            server: "HubCdn",
            link: link,
            type: "mkv",
          });
          break;

        default:
          if (link?.includes(".mkv") || link?.includes("?token=")) {
            const serverName =
              link
                .match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)?.[1]
                ?.replace(/\./g, " ") || "Unknown";
            streamLinks.push({ server: serverName, link: link, type: "mkv" });
          }
          break;
      }
    }

    console.log("streamLinks", streamLinks);
    return streamLinks;
  } catch (error: any) {
    throwProviderError("ZCloud", `extract ${link}`, error);
  }
}
