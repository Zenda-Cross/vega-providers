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

async function checkStreamHealth(
  stream: { server: string; link: string; headers?: any },
  headers: Record<string, string>,
  signal?: AbortSignal,
): Promise<boolean> {
  if (!stream?.link) return false;
  const reqHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    ...(headers || {}),
    ...(stream.headers || {}),
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    if (signal) {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    const res = await fetch(stream.link, {
      method: "HEAD",
      headers: reqHeaders,
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeoutId);

    if (res.status >= 200 && res.status < 400) {
      return true;
    }

    if (res.status === 405 || res.status === 403) {
      const getController = new AbortController();
      const getTimeoutId = setTimeout(() => getController.abort(), 4000);
      if (signal) {
        signal.addEventListener("abort", () => getController.abort(), { once: true });
      }
      const getRes = await fetch(stream.link, {
        method: "GET",
        headers: { ...reqHeaders, Range: "bytes=0-0" },
        signal: getController.signal,
      });
      clearTimeout(getTimeoutId);
      return getRes.status >= 200 && getRes.status < 400;
    }
    return false;
  } catch {
    return false;
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
    let vcloudLink =
      extractUrlFromScript(vLinkText) ||
      $vLink(".fa-file-download.fa-lg").parent().attr("href") ||
      link;
    console.log("vcloudLink", vcloudLink);
    if (vcloudLink?.startsWith("/")) {
      vcloudLink = `${baseUrl}${vcloudLink}`;
      console.log("New vcloudLink", vcloudLink);
    }

    let vcloudText = "";
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
        if (error.response?.status === 403 && !openWebView) {
          console.log(
            `hubcloudExtractor: 403 Forbidden for ${vcloudLink}, but openWebView solver is not available!`,
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
            `hubcloudExtractor: WAF detected (403) for ${vcloudLink}, using solver...`,
          );
          const vcloudBaseUrl = vcloudLink.split("/").slice(0, 3).join("/");
          const cleanHeaders3 = { ...headers, Referer: vcloudBaseUrl };
          delete cleanHeaders3["User-Agent"];
          delete cleanHeaders3["sec-ch-ua"];
          delete cleanHeaders3["sec-ch-ua-mobile"];
          delete cleanHeaders3["sec-ch-ua-platform"];
          delete cleanHeaders3["Cookie"];

          const wafResult = await openWebView(vcloudBaseUrl, {
            title: "Solve the captcha below and click done",
            description: "Required to bypass anti-bot protection.",
            headers: cleanHeaders3,
            waitForCookie: "cf_clearance",
            force: true,
          });
          if (wafResult.userAgent) headers["User-Agent"] = wafResult.userAgent;
          headers["Cookie"] =
            (headers["Cookie"] ? headers["Cookie"] + "; " : "") +
            wafResult.cookies;
          fetchRes = await fetch(vcloudLink, {
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
              server: "GDrive (download only)",
              link: newLink,
              type: "mkv",
            });
          } catch (error) {
            console.log("hubcloudExtractor error in hubcloud link: ", error);
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
        preferredServer !== "auto" &&
        preferredServer !== "" &&
        s.includes(preferredServer)
      ) {
        return 0;
      }
      if (isDownload) {
        if (s.includes("cf worker") || s.includes("fast cloud")) return 1;
        if (s.includes("cf storage") || s.includes("resumable")) return 2;
        if (s.includes("gdrive") || s.includes("instant")) return 3;
        if (s.includes("pixeldrain")) return 4;
        if (s.includes("fastdl")) return 5;
        if (s.includes("hubcdn")) return 6;
        return 10;
      } else {
        if (s.includes("cf worker") || s.includes("fast cloud")) return 1;
        if (s.includes("cf storage")) return 2;
        if (s.includes("pixeldrain")) return 3;
        if (s.includes("fastdl")) return 4;
        if (s.includes("hubcdn")) return 5;
        if (s.includes("gdrive")) return 6;
        return 10;
      }
    };

    streamLinks.sort((a, b) => getPriority(a.server) - getPriority(b.server));

    if (isDownload && streamLinks.length > 0) {
      const isTopHealthy = await checkStreamHealth(
        streamLinks[0],
        headers,
        signal,
      );
      if (!isTopHealthy) {
        let healthyIndex = -1;
        for (let i = 1; i < streamLinks.length; i++) {
          const isHealthy = await checkStreamHealth(
            streamLinks[i],
            headers,
            signal,
          );
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

    console.log("streamLinks", streamLinks);
    return streamLinks;
  } catch (error: any) {
    throwProviderError("HubCloud", `extract ${link}`, error);
  }
}
