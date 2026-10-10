import { ProviderContext, Stream } from "../types";
import { hubcloudExtractor } from "../extractors/hubcloud";
import { throwProviderError } from "../providerErrors";

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Cache-Control": "no-store",
  "Accept-Language": "en-US,en;q=0.9",
  DNT: "1",
  "sec-ch-ua":
    '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0",
};

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
  const { axios, cheerio, commonHeaders } = providerContext;
  try {
    const streamLinks: Stream[] = [];
    console.log("dotlink", link);

    if (!link.includes("cloud")) {
      try {
        const dotlinkRes = await axios.get(link, {
          headers: { ...commonHeaders, Referer: link.split("/").slice(0, 3).join("/") },
          signal,
          timeout: 10000,
        });
        const dotlinkText = dotlinkRes.data;
        const $ = cheerio.load(dotlinkText);

        // 1. FastDL / G-Direct (Instant Google CDN stream)
        const gDirectLink = $(
          "a:contains('G-Direct'), a:contains('Instant'), a[href*='fastdl']",
        ).attr("href");
        if (gDirectLink) {
          try {
            const fastdlRes = await axios.get(gDirectLink, {
              headers: { ...commonHeaders, Referer: link },
              signal,
              timeout: 10000,
            });
            const m = fastdlRes.data.match(/reurl\s*=\s*["']([^"']+)["']/);
            if (m) {
              const targetUrl = m[1].includes("link=")
                ? decodeURIComponent(m[1].split("link=")[1])
                : m[1];
              if (
                targetUrl.includes("googleusercontent.com") ||
                targetUrl.startsWith("http")
              ) {
                streamLinks.push({
                  server: "Instant (Google CDN)",
                  link: targetUrl,
                  type: "mkv",
                });
              }
            }
          } catch (e: any) {
            console.log("FastDL error:", e?.message);
          }
        }

        // 2. V-Cloud / HubCloud
        const vcloudAnchor = $(
          "a:contains('V-Cloud'), a[href*='vcloud'], a[href*='hubcloud']",
        );
        const vlink =
          vcloudAnchor.attr("href") ||
          (dotlinkText.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i) || [])[1];
        if (vlink) {
          try {
            const hcStreams = await hubcloudExtractor(
              vlink,
              signal,
              axios,
              cheerio,
              commonHeaders,
              providerContext,
              isDownload,
              "vega",
            );
            if (Array.isArray(hcStreams)) {
              for (const s of hcStreams) {
                if (!streamLinks.some((existing) => existing.link === s.link)) {
                  streamLinks.push(s);
                }
              }
            }
          } catch (e: any) {
            console.log("HubCloud vcloud error:", e?.message);
          }
        }

        // 3. Filepress link
        try {
          const filepressAnchor = $(
            '.btn.btn-sm.btn-outline[style*="rgb(252,185,0)"], a:contains("Filepress"), a[href*="filepress"], a[href*="filebee"]',
          ).first();
          const filepressLink =
            filepressAnchor.attr("href") || filepressAnchor.parent().attr("href");
          if (filepressLink) {
            const filepressID = filepressLink.split("/").pop();
            const filepressBaseUrl = filepressLink
              .split("/")
              .slice(0, -2)
              .join("/");
            const filepressTokenRes = await axios.post(
              filepressBaseUrl + "/api/file/downlaod/",
              {
                id: filepressID,
                method: "indexDownlaod",
                captchaValue: null,
              },
              {
                headers: {
                  "Content-Type": "application/json",
                  Referer: filepressBaseUrl,
                },
                timeout: 10000,
              },
            );
            if (filepressTokenRes.data?.status) {
              const filepressToken = filepressTokenRes.data?.data;
              const filepressStreamLink = await axios.post(
                filepressBaseUrl + "/api/file/downlaod2/",
                {
                  id: filepressToken,
                  method: "indexDownlaod",
                  captchaValue: null,
                },
                {
                  headers: {
                    "Content-Type": "application/json",
                    Referer: filepressBaseUrl,
                  },
                  timeout: 10000,
                },
              );
              if (filepressStreamLink.data?.data?.[0]) {
                streamLinks.push({
                  server: "filepress",
                  link: filepressStreamLink.data.data[0],
                  type: "mkv",
                });
              }
            }
          }
        } catch (error: any) {
          console.log("filepress error:", error?.message);
        }
      } catch (err: any) {
        console.log("dotlink error:", err?.message);
      }
    } else {
      const hcStreams = await hubcloudExtractor(
        link,
        signal,
        axios,
        cheerio,
        commonHeaders,
        providerContext,
        isDownload,
        "vega",
      );
      if (Array.isArray(hcStreams)) {
        streamLinks.push(...hcStreams);
      }
    }

    if (streamLinks.length > 0) {
      return streamLinks;
    }

    return await hubcloudExtractor(
      link,
      signal,
      axios,
      cheerio,
      commonHeaders,
      providerContext,
      isDownload,
      "vega",
    );
  } catch (error: any) {
    throwProviderError("Vega", "stream", error);
  }
}
