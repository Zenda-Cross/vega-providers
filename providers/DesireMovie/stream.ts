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
    console.log("🎯 Processing link:", link);

    // ✅ Handle Hubcloud / Gyanigurus redirect link
    if (link.includes("gyanigurus.xyz") || link.includes("hubcloud")) {
      console.log("🔍 Detected Hubcloud redirect page, scraping...");

      const res = await axios.get(link, { headers, signal });
      const $ = cheerio.load(res.data || "");

      // Try to find iframe or direct href to hubcloud
      let redirectLink =
        $('iframe[src*="hubcloud"]').attr("src") ||
        $('a[href*="hubcloud"]').attr("href") ||
        link;

      if (redirectLink && !redirectLink.startsWith("http")) {
        redirectLink = new URL(redirectLink, link).href;
      }

      console.log("✅ Found Hubcloud link:", redirectLink);

      // Extract actual streaming URL via hubcloud extractor
      return await hubcloudExtracter(redirectLink, signal);
    }

    // ✅ Handle normal Vegamovies-style movie pages
    if (type === "movie") {
      const dotlinkRes = await axios(link, { headers });
      const dotlinkText = dotlinkRes.data;

      // extract first cloud link
      const vlinkMatch = dotlinkText.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i);
      if (vlinkMatch && vlinkMatch[1]) {
        link = vlinkMatch[1];
      }

      // Try Filepress backup extractor
      try {
        const $ = cheerio.load(dotlinkText);
        const filepressLink = $(
          '.btn.btn-sm.btn-outline[style*="background:linear-gradient"]'
        )
          .parent()
          .attr("href");

        if (filepressLink) {
          const filepressID = filepressLink.split("/").pop();
          const filepressBaseUrl = filepressLink.split("/").slice(0, -2).join("/");

          const tokenRes = await axios.post(
            `${filepressBaseUrl}/api/file/downlaod/`,
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

          if (tokenRes.data?.status) {
            const token = tokenRes.data?.data;
            const streamRes = await axios.post(
              `${filepressBaseUrl}/api/file/downlaod2/`,
              {
                id: token,
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
              server: "Filepress",
              link: streamRes.data?.data?.[0],
              type: "mkv",
            });
          }
        }
      } catch (err) {
        console.warn("⚠️ Filepress extraction failed");
      }
    }

    // ✅ Final: Use Hubcloud extractor as universal fallback
    console.log("⚡ Extracting via Hubcloud Extractor:", link);
    const extracted = await hubcloudExtracter(link, signal);
    return [...streamLinks, ...extracted];
  } catch (error: any) {
    console.error("❌ getStream error:", error?.message || error);
    return [];
  }
}
