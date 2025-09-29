import { ProviderContext, Stream } from "../types";

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
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
}) {
  const { axios, cheerio } = providerContext;

  try {
    const streamLinks: Stream[] = [];

    // Fetch the page HTML
    const res = await axios.get(link, { headers, signal });
    const $ = cheerio.load(res.data);

    const ALLOWED_SERVERS = ["ONE CLICK", "ZIP-ZAP", "ULTRA FAST", "SKYDROP"];
    // --- Scrape all <a class="download-button"> links
    $("a.download-button").each((_, el) => {
      const btn = $(el);
      const href = btn.attr("href")?.trim();
      const serverName = btn.text().trim() || "Unknown Server";

      // Check for partial matches in server names
      const isAllowed = ALLOWED_SERVERS.some(
        (allowed) =>
          serverName.toUpperCase().includes(allowed) ||
          allowed.includes(serverName.toUpperCase())
      );

      if (href && isAllowed) {
        streamLinks.push({
          server: serverName,
          link: href,
          type: "mkv", // Boss, mostly KMMOVIES MKV hota hai
        });
      }
    });

    return streamLinks;
  } catch (error: any) {
    console.log("getStream error: ", error.message);
    return [];
  }
}
