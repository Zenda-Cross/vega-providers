import { ProviderContext, Stream } from "../types";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
};

async function getWithWAF(
  url: string,
  axios: any,
  openWebView: any,
  headers: any,
): Promise<any> {
  const baseUrl = url.split("/").slice(0, 3).join("/");
  try {
    return await axios.get(url, { headers: { ...headers, Referer: baseUrl } });
  } catch (error: any) {
    if (error.response?.status === 403 && openWebView) {
      console.log(`WAF detected (403) for ${url}, using solver...`);
      const wafResult = await openWebView(baseUrl, {
        title: "Solve the captcha below and click done",
        description: "Required to bypass anti-bot protection.",
        headers: { ...headers, Referer: baseUrl },
        waitForCookie: "cf_clearance",
      });
      return await axios.get(url, {
        headers: { ...headers, Referer: baseUrl, Cookie: wafResult.cookie },
      });
    }
    throw error;
  }
}


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
  const { axios, cheerio, openWebView } = providerContext;

  try {
    const streamLinks: Stream[] = [];

    // Fetch the page HTML
    const res = await getWithWAF(link, axios, openWebView, headers);
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
