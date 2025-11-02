import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio, commonHeaders } = providerContext;

  console.log("🎬 Fetching episode links from:", url);

  // ✅ Custom realistic headers for better Cloudflare compatibility
  const headers = {
    ...commonHeaders,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    DNT: "1",
    Referer: url,
    "Upgrade-Insecure-Requests": "1",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "sec-ch-ua":
      '"Google Chrome";v="131", "Chromium";v="131", "Not=A?Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    Cookie:
      "prefetchAd_8508552=true; _ga=GA1.1.1001107919.1762037833; _ga_7YXLT91MT2=GS2.1.s1762037832$o1$g1$t1762037851$j41$l0$h0",
  };

  try {
    // Step 1️⃣: Fetch main episode page
    const res = await axios.get(url, { headers });
    const $ = cheerio.load(res.data);

    // Step 2️⃣: Locate all V-Cloud buttons
    const episodes: EpisodeLink[] = [];

    // Finds all anchor tags whose href contains "/reder.php?v="
    $('a[href*="/reder.php?v="]').each((index, element) => {
      const el = $(element);
      const relativeLink = el.attr("href");
      const baseUrl = new URL(url).origin;
      const vcloudLink = new URL(relativeLink ?? "", baseUrl).href;

      const title = "⚡ V-Cloud [Resumable]";
      episodes.push({
        title,
        link: vcloudLink,
      });
    });

    console.log(`✅ Found ${episodes.length} V-Cloud link(s).`);
    return episodes;
  } catch (err: any) {
    console.error("💥 getEpisodes error:", err.message);
    return [];
  }
};
