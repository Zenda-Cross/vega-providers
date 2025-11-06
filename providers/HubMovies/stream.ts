import { ProviderContext, Stream } from "../types";

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
  "Sec-Fetch-User": "?1",
  Cookie:
    "xla=s4t; _ga=GA1.1.1081149560.1756378968; _ga_BLZGKYN5PF=GS2.1.s1756378968$o1$g1$t1756378984$j44$l0$h0",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

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
  const { axios, cheerio, extractors } = providerContext;
  const { hubcloudExtracter } = extractors;

  try {
    const streamLinks: Stream[] = [];
    console.log("dotlink", link);

    if (type === "movie") {
      // Load target page HTML
      const dotlinkRes = await axios(`${link}`, { headers });
      const dotlinkText = dotlinkRes.data;

      // Load HTML in cheerio
      const $ = cheerio.load(dotlinkText);

      // 🔹 STEP 1: Find PixelDrain link
      const pixelPageLink = $('a.btn.btn-success[href*="pixeldrain"]').attr("href");

      if (pixelPageLink) {
        console.log("✅ PixelDrain page link found:", pixelPageLink);

        // 🔹 STEP 2: Convert to direct playable link
        // Example: https://pixeldrain.dev/u/DM671W6u  ➜  https://pixeldrain.dev/api/file/DM671W6u?download
        const fileId = pixelPageLink.split("/u/")[1];
        const pixelDirectLink = `https://pixeldrain.dev/api/file/${fileId}?download`;

        // Optional: verify content type
        try {
          const headCheck = await axios.head(pixelDirectLink);
          const contentType = headCheck.headers["content-type"];
          if (contentType?.startsWith("video") || contentType?.startsWith("application/octet-stream")) {
            streamLinks.push({
              server: "pixeldrain",
              link: pixelDirectLink,
              type: "mp4",
            });
            console.log("🎬 PixelDrain direct stream ready:", pixelDirectLink);
            return streamLinks;
          } else {
            console.warn("⚠️ PixelDrain link not a video:", contentType);
          }
        } catch (e) {
          console.warn("⚠️ Could not verify PixelDrain link, using fallback:", pixelDirectLink);
          streamLinks.push({
            server: "pixeldrain",
            link: pixelDirectLink,
            type: "mp4",
          });
          return streamLinks;
        }
      }

      // 🔹 STEP 3: Fallback logic (cloud or filepress)
      const vlink = dotlinkText.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i) || [];
      if (vlink[1]) {
        link = vlink[1];
      }

      try {
        const filepressLink = $(
          '.btn.btn-sm.btn-outline[style="background:linear-gradient(135deg,rgb(252,185,0) 0%,rgb(0,0,0)); color: #fdf8f2;"]'
        )
          .parent()
          .attr("href");

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
            }
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
              }
            );

            streamLinks.push({
              server: "filepress",
              link: filepressStreamLink.data?.data?.[0],
              type: "mkv",
            });
          }
        }
      } catch (error) {
        console.log("filepress error:");
      }
    }

    // 🔹 STEP 4: Final fallback — hubcloud
    return await hubcloudExtracter(link, signal);
  } catch (error: any) {
    console.log("getStream error:", error.message);
    return [];
  }
}
