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
}): Promise<Stream[]> {
  const { axios, cheerio, extractors } = providerContext;
  const { hubcloudExtracter } = extractors;
  try {
    const streamLinks: Stream[] = [];
    console.log("dotlink", link);

    if (type === "movie") {
      // 1. Fetch the initial dotlink page content
      const dotlinkRes = await axios(`${link}`, { headers });
      const dotlinkText = dotlinkRes.data;
      const $ = cheerio.load(dotlinkText);

      // vlink extraction (updates the primary link for hubcloudExtracter)
      const vlink = dotlinkText.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i) || [];
      link = vlink[1] || link; // Fallback to original link if vlink not found

      // 2. filepress link extraction (adds stream to streamLinks)
      try {
        const filepressLink = $(
          '.btn.btn-sm.btn-outline[style="background:linear-gradient(135deg,rgb(252,185,0) 0%,rgb(0,0,0)); color: #fdf8f2;"]'
        )
          .parent()
          .attr("href");

        if (filepressLink) {
          const filepressID = filepressLink?.split("/").pop();
          const filepressBaseUrl = filepressLink
            ?.split("/")
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
              server: "Filepress",
              link: filepressStreamLink.data?.data?.[0],
              type: "mkv",
            });
          }
        }
      } catch (error) {
        console.log("filepress error: ");
        // console.error(error);
      }

      // 3. GDFlix to PixelDrain link extraction (adds stream to streamLinks)
      try {
        // Find the GDFlix link from the initial dotlink page
        const gdflixLink = $('a[href*="gdflix.dev/file/"]').attr('href');
        
        if (gdflixLink) {
          console.log('GDFlix Link found, scraping for PixelDrain:', gdflixLink);
          
          // Request the GDFlix page
          const gdflixRes = await axios(gdflixLink, { headers, signal });
          const gdflixHtml = gdflixRes.data;

          // Load the GDFlix page HTML
          const $$ = cheerio.load(gdflixHtml);
          
          // Find the PixelDrain link (containing the download URL)
          const pixeldrainLink = $$('a[href*="pixeldrain.dev/api/file/"]').attr('href');
          
          if (pixeldrainLink) {
            console.log('PixelDrain Stream Link found:', pixeldrainLink);
            streamLinks.push({
              server: "PixelDrain", 
              link: pixeldrainLink,
              type: "video" // Using 'video' as a general type
            });
          }
        }
      } catch (error) {
        console.log("gdflix/pixeldrain error: ");
        // console.error(error);
      }
    }

    // 4. Extract primary stream (hubcloud) and merge all results
    const hubcloudStreams = await hubcloudExtracter(link, signal);
    return [...streamLinks, ...hubcloudStreams];

  } catch (error: any) {
    console.log("getStream error: ", error);
    if (error.message.includes("Aborted")) {
    } else {
    }
    return [];
  }
}
