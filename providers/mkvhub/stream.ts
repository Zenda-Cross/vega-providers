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
    console.log("🔗 Fetching source page:", link);

    // Step 1️⃣: Fetch the main linkszilla page
    const pageRes = await axios.get(link, { headers });
    const html = pageRes.data;

    // Step 2️⃣: Find hubcloud.one link
    const hubcloudMatch = html.match(/https?:\/\/hubcloud\.one\/drive\/[a-zA-Z0-9]+/i);
    if (!hubcloudMatch) {
      console.error("❌ Hubcloud link not found in the page");
      return [];
    }

    const hubcloudLink = hubcloudMatch[0];
    console.log("✅ Found hubcloud link:", hubcloudLink);

    // Step 3️⃣: Extract direct download link from hubcloud.one
    const downloadLinks = await hubcloudExtracter(hubcloudLink, signal);

    if (downloadLinks?.length > 0) {
      console.log("🎯 Extracted stream links:", downloadLinks);
      streamLinks.push(...downloadLinks);
    } else {
      console.warn("⚠️ No direct download links found from hubcloud extractor");
    }

    return streamLinks;
  } catch (error: any) {
    console.error("💥 getStream error:", error.message);
    return [];
  }
}
