import { ProviderContext, Stream } from "../types";
import { hubcloudExtractor } from "../extractors/hubcloud";
import { gdflixExtractor } from "../extractors/gdflix";
import { throwProviderError } from "../providerErrors";

const headers = {
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "accept-language": "en-US,en;q=0.9,en-IN;q=0.8",
  "cache-control": "no-cache",
  pragma: "no-cache",
  priority: "u=0, i",
  "sec-ch-ua":
    '"Chromium";v="140", "Not=A?Brand";v="24", "Microsoft Edge";v="140"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
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
    console.log("Joya9tv getStream link:", link);

    if (link.includes("gdflix")) {
      return await gdflixExtractor(
        link,
        signal,
        axios,
        cheerio,
        commonHeaders,
        providerContext,
      );
    }

    let hubcloudLink = "";
    let gdflixLink = "";
    let filepressLink = "";

    if (link.includes("hubcloud") || link.includes("hubcdn")) {
      hubcloudLink = link;
    } else {
      const dotlinkRes = await fetch(`${link}`, { headers, signal });
      if (!dotlinkRes.ok) {
        throw new Error(
          `HTTP ${dotlinkRes.status} ${dotlinkRes.statusText} | URL ${link}`,
        );
      }
      const dotlinkText = await dotlinkRes.text();
      const $ = cheerio.load(dotlinkText);

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href")?.trim() || "";
        if (!href) return;

        if (
          !hubcloudLink &&
          (href.includes("hubcloud") || href.includes("hubcdn"))
        ) {
          hubcloudLink = href;
        } else if (!gdflixLink && href.includes("gdflix")) {
          gdflixLink = href;
        } else if (!filepressLink && href.includes("filepress")) {
          filepressLink = href;
        }
      });

      if (!hubcloudLink) {
        const hubMatch =
          dotlinkText.match(/<a\s+href="([^"]*hubcloud\.[^"]*)"/i) ||
          dotlinkText.match(/<a\s+href="([^"]*hubcdn\.[^"]*)"/i);
        if (hubMatch?.[1]) {
          hubcloudLink = hubMatch[1];
        }
      }

      if (!gdflixLink) {
        const gdMatch = dotlinkText.match(/<a\s+href="([^"]*gdflix\.[^"]*)"/i);
        if (gdMatch?.[1]) {
          gdflixLink = gdMatch[1];
        }
      }

      // filepress link
      try {
        const fpTarget =
          filepressLink ||
          $(
            '.btn.btn-sm.btn-outline[style="background:linear-gradient(135deg,rgb(252,185,0) 0%,rgb(0,0,0)); color: #fdf8f2;"]',
          )
            .parent()
            .attr("href");

        if (fpTarget) {
          const filepressID = fpTarget.split("/").pop();
          const filepressBaseUrl = fpTarget.split("/").slice(0, -2).join("/");

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
      } catch (error) {
        console.log("filepress error:", error);
      }
    }

    if (hubcloudLink) {
      try {
        const hubStreams = await hubcloudExtractor(
          hubcloudLink,
          signal,
          axios,
          cheerio,
          commonHeaders,
          providerContext,
          isDownload,
          "Joya9tv",
        );
        if (Array.isArray(hubStreams) && hubStreams.length > 0) {
          streamLinks.push(...hubStreams);
        }
      } catch (err) {
        console.log("hubcloudExtractor error:", err);
      }
    }

    if (gdflixLink) {
      try {
        const gdStreams = await gdflixExtractor(
          gdflixLink,
          signal,
          axios,
          cheerio,
          commonHeaders,
          providerContext,
        );
        if (Array.isArray(gdStreams) && gdStreams.length > 0) {
          streamLinks.push(...gdStreams);
        }
      } catch (err) {
        console.log("gdflixExtractor error:", err);
      }
    }

    return streamLinks;
  } catch (error: any) {
    throwProviderError("Joya9TV", "stream", error);
  }
}
