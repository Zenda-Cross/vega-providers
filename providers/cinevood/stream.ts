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
  const streams: Stream[] = [];

  try {
    const { axios, cheerio } = providerContext;

    console.log("Fetching HubCloud page:", link);
    // 1️⃣ HubCloud page fetch
    const res = await axios.get(link, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(res.data);

    // 2️⃣ GamerXYT intermediate link dhundo
    const gamerXYTLink = $("span:contains('HubCloud Download')")
      .closest("button")
      .next("button a")
      .attr("href");

    if (!gamerXYTLink) {
      console.log("GamerXYT link not found!");
      return streams;
    }

    console.log("Found GamerXYT link:", gamerXYTLink);

    // 3️⃣ GamerXYT page fetch
    const gamerRes = await axios.get(gamerXYTLink, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });

    const $$ = cheerio.load(gamerRes.data);

    // 4️⃣ Direct download link dhundo
    const directLink = $$("#download").attr("href");
    if (directLink) {
      console.log("Direct download link found:", directLink);
      streams.push({
        server: "HubCloud / GamerXYT Direct",
        link: directLink,
        type: "file",
      });
    } else {
      console.log("Direct download link not found on GamerXYT page!");
    }

    return streams;
  } catch (err) {
    console.error("Error in getStream:", err);
    return streams;
  }
};
