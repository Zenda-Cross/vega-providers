import { Stream, ProviderContext } from "../types";

export const getStream = async function ({
  link,
  type,
  providerContext,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    const { axios, cheerio } = providerContext;

    // Step 1: Page fetch karo
    const res = await axios.get(link, {
      headers: {
        Referer: "https://ufilmywap.info",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(res.data);
    const streams: Stream[] = [];

    // Step 2: a.button, a.button2, a.button4 wale links scrape karo
    $("a.button, a.button2, a.button4").each((_, el) => {
  const hrefAttr = $(el).attr("href"); // string | undefined
  if (!hrefAttr) return; // undefined ho to skip
  let href: string = hrefAttr.trim(); // ab string guaranteed

  let text = $(el).text().trim() || "";

  // Agar unwanted source hai to skip
  const unwantedPatterns = [
    /direct download/i,
    /telegram/i,
    /gofile\.io/i,
    /resumable/i,
  ];
  if (unwantedPatterns.some(pat => pat.test(text) || pat.test(href))) return;

  // Agar relative URL hai to absolute banao
  if (!href.startsWith("http")) href = new URL(href, link).href;

  streams.push({
    server: text,
    link: href,
    type: "mp4",
  });
});


    return streams;
  } catch (err) {
    console.error("FilesDL getStream error:", err);
    return [];
  }
};
