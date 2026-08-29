import { throwProviderError } from "../providerErrors";
import { gofileExtractor } from "./gofile";

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



async function resolveGofileLink(
  gofileLink: string,
  axios: any,
  providerContext?: any,
) {
  try {
    const gofileUrl = new URL(gofileLink);
    const id = gofileUrl.pathname.split("/").filter(Boolean).pop();
    if (!id) return null;
    const gfResult = await gofileExtractor(id, axios, providerContext);
    if (!gfResult?.link || !gfResult?.token) return null;
    return {
      server: "Gofile",
      link: gfResult.link,
      type: "mkv",
      headers: {
        Referer: "https://gofile.io/",
        Cookie: `accountToken=${gfResult.token}`,
      },
    };
  } catch (error) {
    console.log("hubcloudExtractor: resolveGofileLink error:", error);
    return null;
  }
}

export async function hubcloudExtractor(
  link: string,
  signal: AbortSignal,
  axios: any,
  cheerio: any,
  headers: Record<string, string>,
  providerContext?: any,
  isDownload?: boolean,
  providerValue?: string,
) {
  try {
    if (!headers["Cookie"]) {
      headers["Cookie"] =
        "ext_name=ojplmecpdpgccookcobabopnaifgidhf; xla=s4t; cf_clearance=woQrFGXtLfmEMBEiGUsVHrUBMT8s3cmguIzmMjmvpkg-1770053679-1.2.1.1-xBrQdciOJsweUF6F2T_OtH6jmyanN_TduQ0yslc_XqjU6RcHSxI7.YOKv6ry7oYo64868HYoULnVyww536H2eVI3R2e4wKzsky6abjPdfQPxqpUaXjxfJ02o6jl3_Vkwr4uiaU7Wy596Vdst3y78HXvVmKdIohhtPvp.vZ9_L7wvWdce0GRixjh_6JiqWmWMws46hwEt3hboaS1e1e4EoWCvj5b0M_jVwvSxBOAW5emFzvT3QrnRh4nyYmKDERnY";
    }
    console.log("hubcloudExtractor", link);
    // console.log("headers", headers);
    const baseUrl = link.split("/").slice(0, 3).join("/");
    const streamLinks: any[] = [];
    const openWebView = providerContext?.openWebView;

    let vLinkRes: any;
    try {
      vLinkRes = await axios(`${link}`, { headers, signal });
    } catch (error: any) {
      if (error.response?.status === 403) {
        if (openWebView) {
          console.log(
            `hubcloudExtractor: WAF detected (403) for ${link}, using solver...`,
          );
          const cleanHeaders = { ...headers, Referer: baseUrl };
          delete cleanHeaders["User-Agent"];
          delete cleanHeaders["sec-ch-ua"];
          delete cleanHeaders["sec-ch-ua-mobile"];
          delete cleanHeaders["sec-ch-ua-platform"];
          delete cleanHeaders["Cookie"];

          const wafResult = await openWebView(baseUrl, {
            title: "Solve the captcha below and click done",
            description: "Required to bypass anti-bot protection.",
            headers: cleanHeaders,
            waitForCookie: "cf_clearance",
            force: true,
          });
          if (wafResult.userAgent) headers["User-Agent"] = wafResult.userAgent;
          headers["Cookie"] =
            (headers["Cookie"] ? headers["Cookie"] + "; " : "") +
            wafResult.cookies;
          vLinkRes = await axios(`${link}`, { headers, signal });
        } else {
          console.log(
            `hubcloudExtractor: 403 Forbidden for ${link}, but openWebView solver is not available!`,
          );
          throw error;
        }
      } else {
        throw error;
      }
    }

    const vLinkText = vLinkRes.data;
    const $vLink = cheerio.load(vLinkText);

    // Check if initial page contains any direct Gofile download button/links
    const vLinkGofileBtns = $vLink("a[href*='gofile.io']");
    for (const el of vLinkGofileBtns) {
      const gfHref = $vLink(el).attr("href");
      if (gfHref) {
        const gfStream = await resolveGofileLink(gfHref, axios, providerContext);
        if (gfStream && !streamLinks.some((s) => s.link === gfStream.link)) {
          streamLinks.push(gfStream);
        }
      }
    }

    let vcloudLink =
      extractUrlFromScript(vLinkText) ||
      $vLink(".fa-file-download.fa-lg").parent().attr("href") ||
      link;
    console.log("vcloudLink", vcloudLink);
    if (vcloudLink?.startsWith("/")) {
      vcloudLink = `${baseUrl}${vcloudLink}`;
      console.log("New vcloudLink", vcloudLink);
    }

    // If vcloudLink is directly a Gofile URL
    if (vcloudLink?.includes("gofile.io")) {
      const gfStream = await resolveGofileLink(vcloudLink, axios, providerContext);
      if (gfStream && !streamLinks.some((s) => s.link === gfStream.link)) {
        streamLinks.push(gfStream);
      }
    }

    let vcloudText = "";
    if (vcloudLink && !vcloudLink.includes("gofile.io") && vcloudLink !== link) {
      try {
        const vcloudRes = await axios.get(vcloudLink, { headers, signal });
        vcloudText = vcloudRes.data;
      } catch (error: any) {
        if (error.response?.status === 403 && openWebView) {
          console.log(
            `hubcloudExtractor: WAF detected (403) for ${vcloudLink}, using solver...`,
          );
          const vcloudBaseUrl = vcloudLink.split("/").slice(0, 3).join("/");
          const cleanHeaders2 = { ...headers, Referer: vcloudBaseUrl };
          delete cleanHeaders2["User-Agent"];
          delete cleanHeaders2["sec-ch-ua"];
          delete cleanHeaders2["sec-ch-ua-mobile"];
          delete cleanHeaders2["sec-ch-ua-platform"];
          delete cleanHeaders2["Cookie"];

          const wafResult = await openWebView(vcloudBaseUrl, {
            title: "Solve the captcha below and click done",
            description: "Required to bypass anti-bot protection.",
            headers: cleanHeaders2,
            waitForCookie: "cf_clearance",
            force: true,
          });
          if (wafResult.userAgent) headers["User-Agent"] = wafResult.userAgent;
          headers["Cookie"] =
            (headers["Cookie"] ? headers["Cookie"] + "; " : "") +
            wafResult.cookies;
          const retryRes = await axios.get(vcloudLink, { headers, signal });
          vcloudText = retryRes.data;
        } else {
          throw error;
        }
      }
    }
    const $ = cheerio.load(vcloudText);
    // console.log("vcloudRes", $.text());

    const linkClass = $(".btn-success.btn-lg.h6,.btn-danger,.btn-secondary");
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
          streamLinks.push({ server: "CF Worker", link: link, type: "mkv" });
          break;

        case link?.includes("hubcloud") || link?.includes("/?id="):
          try {
            let newLink = link;

            // 1. Try fetch with redirect: "follow" (ideal for mobile WebWorkers)
            try {
              if (typeof fetch !== "undefined") {
                const fRes = await fetch(link, {
                  headers,
                  signal,
                  redirect: "follow",
                });
                if (fRes.url && fRes.url.includes("googleusercontent")) {
                  newLink = fRes.url.split("?link=")[1] || fRes.url;
                } else if (fRes.url && fRes.url !== link) {
                  newLink = fRes.url;
                }
              }
            } catch {}

            // 2. Fallback to axios with maxRedirects: 0 (for Node/desktop)
            if (!newLink.includes("googleusercontent")) {
              try {
                const res1 = await axios.get(newLink, {
                  headers,
                  signal,
                  maxRedirects: 0,
                  validateStatus: (s: number) => s >= 200 && s < 400,
                });
                if (res1.headers?.["location"]) {
                  newLink = res1.headers["location"];
                }
                if (newLink.includes("googleusercontent")) {
                  newLink = newLink.split("?link=")[1] || newLink;
                } else if (newLink.includes("http")) {
                  const res2 = await axios.get(newLink, {
                    headers,
                    signal,
                    maxRedirects: 0,
                    validateStatus: (s: number) => s >= 200 && s < 400,
                  });
                  if (res2.headers?.["location"]) {
                    const loc2 = res2.headers["location"];
                    newLink = loc2.includes("?link=") ? loc2.split("?link=")[1] : loc2;
                  }
                }
              } catch {}
            }

            if (newLink.includes("?link=")) {
              newLink = newLink.split("?link=")[1] || newLink;
            }

            streamLinks.push({
              server: "GDrive (download only)",
              link: newLink,
              type: "mkv",
            });
          } catch (error) {
            console.log("hubcloudExtractor error in hubcloud link: ", error);
          }
          break;

        case link?.includes("gofile.io"):
          try {
            const gfStream = await resolveGofileLink(link, axios, providerContext);
            if (gfStream && !streamLinks.some((s) => s.link === gfStream.link)) {
              streamLinks.push(gfStream);
            }
          } catch (error) {
            console.log("hubcloudExtractor error in gofile link: ", error);
          }
          break;

        case link?.includes("cloudflarestorage"):
          streamLinks.push({ server: "CF Storage", link: link, type: "mkv" });
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
            const serverName = "CF Worker";
            streamLinks.push({ server: serverName, link: link, type: "mkv" });
          }
          break;
      }
    }

    let preferredServer = "auto";
    try {
      const specificKey = providerValue
        ? `${providerValue}_preferredDownloadServer`
        : "";
      preferredServer = (
        (specificKey
          ? await providerContext?.kvStore?.get<string>(specificKey)
          : undefined) ||
        (await providerContext?.kvStore?.get<string>("preferredDownloadServer")) ||
        "auto"
      )
        .toLowerCase()
        .trim();
    } catch {}

    const getPriority = (serverName: string = "") => {
      const s = serverName.toLowerCase();
      if (
        isDownload &&
        preferredServer !== "auto" &&
        preferredServer !== "" &&
        s.includes(preferredServer)
      ) {
        return 0;
      }
      if (isDownload) {
        if (s.includes("cf storage") || s.includes("storage") || s.includes("resumable")) return 1;
        if (s.includes("gdrive") || s.includes("google") || s.includes("instant")) return 2;
        if (s.includes("pixeldrain")) return 3;
        if (s.includes("gofile")) return 4;
        if (s.includes("fastdl") || s.includes("fsl")) return 5;
        if (s.includes("hubcdn")) return 6;
        if (s.includes("cf worker") || s.includes("worker") || s.includes("fast cloud")) return 8;
        return 10;
      } else {
        if (s.includes("cf storage") || s.includes("storage")) return 1;
        if (s.includes("cf worker") || s.includes("worker") || s.includes("fast cloud")) return 2;
        if (s.includes("gofile")) return 3;
        if (s.includes("pixeldrain")) return 4;
        if (s.includes("fastdl") || s.includes("fsl")) return 5;
        if (s.includes("hubcdn")) return 6;
        if (s.includes("gdrive") || s.includes("google")) return 7;
        return 10;
      }
    };

    streamLinks.sort((a, b) => getPriority(a.server) - getPriority(b.server));



    console.log("streamLinks", streamLinks);
    return streamLinks;
  } catch (error: any) {
    throwProviderError("HubCloud", `extract ${link}`, error);
  }
}
