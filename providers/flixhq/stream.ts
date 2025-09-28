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
  // Removed hubcloudExtracter from destructuring as requested
  const { axios, cheerio } = providerContext;

  try {
    const streamLinks: Stream[] = [];
    console.log("DotLink page URL:", link);

    const dotlinkRes = await axios(link, { headers, signal });
    const dotlinkText = dotlinkRes.data;
    const $ = cheerio.load(dotlinkText);

    // --- GDFlix Link Extraction (Scrape GDFlix for final PixelDrain link) ---
    try {
      // 1. Get the GDFlix intermediary link from the DotLink page
      const gdflixButton = $(
        'a[href*="gdflix.dev"] button:contains("GDFlix")'
      )
        .first()
        .parent(); // Get the parent <a> tag

      const gdflixLink = gdflixButton.attr("href");

      if (gdflixLink) {
        console.log("GDFlix Intermediary Link Found:", gdflixLink);

        // 2. Fetch the GDFlix page content
        const gdflixRes = await axios(gdflixLink, {
          headers: { ...headers, Referer: gdflixLink.split("/").slice(0, 3).join("/") },
          signal,
        });
        const gdflix$ = cheerio.load(gdflixRes.data);

        // 3. Scrape the GDFlix page for the final PixelDrain link
        const pixeldrainButton = gdflix$('a.btn.btn-success:contains("PixelDrain")').first();
        const pixeldrainLink = pixeldrainButton.attr("href");

        if (pixeldrainLink) {
          console.log("Final PixelDrain Link Found:", pixeldrainLink);
          streamLinks.push({
            server: "PixelDrain (Final Download)",
            link: pixeldrainLink,
            type: "download", // Explicitly mark as download type
          });
        }
      }
    } catch (error) {
      console.log("GDFlix/PixelDrain extraction error.");
      // console.error(error);
    }

    // --- Filepress Link Extraction (Existing complex API logic) ---
    // This logic attempts to follow a specific Filepress API flow to get a final download link.
    try {
      // Selector matching the Filepress button style from previous iteration
      const filepressLink = $(
        '.btn.btn-sm.btn-outline[style="background:linear-gradient(135deg,rgb(252,185,0) 0%,rgb(0,0,0)); color: #fdf8f2;"]'
      )
        .parent()
        .attr("href");

      if (filepressLink && filepressLink.includes("filepress")) {
        // Safety check
        console.log("Filepress Link Found:", filepressLink);

        const filepressID = filepressLink?.split("/").pop();
        const filepressBaseUrl = filepressLink?.split("/").slice(0, -2).join("/");

        if (filepressID && filepressBaseUrl) {
          // Step 1: Get Token
          const filepressTokenRes = await axios.post(
            `${filepressBaseUrl}/api/file/downlaod/`,
            { id: filepressID, method: "indexDownlaod", captchaValue: null },
            {
              headers: { "Content-Type": "application/json", Referer: filepressBaseUrl },
              signal,
            }
          );

          if (filepressTokenRes.data?.status && filepressTokenRes.data?.data) {
            const filepressToken = filepressTokenRes.data.data;

            // Step 2: Get Stream Link using Token
            const filepressStreamLinkRes = await axios.post(
              `${filepressBaseUrl}/api/file/downlaod2/`,
              { id: filepressToken, method: "indexDownlaod", captchaValue: null },
              {
                headers: { "Content-Type": "application/json", Referer: filepressBaseUrl },
                signal,
              }
            );

            if (filepressStreamLinkRes.data?.data?.[0]) {
              streamLinks.push({
                server: "Filepress (Direct Download)",
                link: filepressStreamLinkRes.data.data[0],
                type: "mkv",
              });
            }
          }
        }
      }
    } catch (error) {
      console.log("Filepress API extraction error. Skipping.");
      // console.error(error);
    }

    // Return all collected download links (PixelDrain and Filepress)
    return streamLinks;
  } catch (error: any) {
    console.log("getStream error: ", error.message);
    if (error.message.includes("Aborted")) {
      // Request was intentionally cancelled
    } else {
      // Log other errors
    }
    return [];
  }
}
