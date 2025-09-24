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
    console.log("Scraping page:", link);

    // Step 1: BollyDrive page fetch
    const pageRes = await axios.get(link, { headers });
    const $ = cheerio.load(pageRes.data);

    // Step 2: Scrape H-Cloud button link
    let hubcloudLink = "";
    $("button, a").each((_, el) => {
      const $el = $(el);
      const onclick = $el.attr("onclick") || "";
      const text = ($el.text() || "").trim();

      if (text.includes("H-Cloud") && onclick.includes("window.open")) {
        const match = onclick.match(/window\.open\(['"](.+?)['"]/);
        if (match && match[1]) hubcloudLink = match[1];
      }
    });

    if (!hubcloudLink) {
      console.log("No H-Cloud link found on page");
      return [];
    }

    console.log("Found H-Cloud link:", hubcloudLink);

    // Step 3: Call hubcloudExtracter to get final download links
    const hubcloudStreams = await hubcloudExtracter(hubcloudLink, signal);
    streamLinks.push(...hubcloudStreams);

    return streamLinks;
  } catch (error: any) {
    console.log("getStream error:", error);
    return [];
  }
}
