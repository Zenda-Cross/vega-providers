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
}) {
  const { axios, cheerio, extractors } = providerContext;
  const { hubcloudExtracter } = extractors;

  try {
    const streamLinks: Stream[] = [];

    // Fetch the HTML page
    const res = await axios(link, { headers });
    const html = res.data;

    const $ = cheerio.load(html);

    // 1️⃣ HubCloud link
    const hubcloudLink = $('a:contains("Cloud- HubCloud")').attr("href");
    if (hubcloudLink) {
      const hubcloudStreams = await hubcloudExtracter(hubcloudLink, signal);
      streamLinks.push(...hubcloudStreams);
    }

    // 2️⃣ Direct Download (filesdl / gdflix)
    $("a").each((_, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim();

      if (href && /Direct Download/i.test(text)) {
        streamLinks.push({
          server: "direct",
          link: href,
          type: "mkv",
        });
      }
    });

    // 3️⃣ Resumable (GoFile.io)
    const gofileLink = $('a:contains("GoFile.io")').attr("href");
    if (gofileLink) {
      streamLinks.push({
        server: "gofile",
        link: gofileLink,
        type: "mkv",
      });
    }

    // 4️⃣ Telegram Bot link
    const telegramLink = $('a[href*="t.me/Filesdl_cab3_bot"]').attr("href");
    if (telegramLink) {
      streamLinks.push({
        server: "telegram",
        link: telegramLink,
        type: "mkv",
      });
    }

    return streamLinks;
  } catch (error: any) {
    console.log("getStream error: ", error);
    return [];
  }
}
