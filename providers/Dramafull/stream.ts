import { ProviderContext, Stream } from "../types";

const headers = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://dramafull.cc/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

export async function getStream({
  link,
  signal,
  providerContext,
}: {
  link: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios } = providerContext;

  try {
    /**
     * STEP 1: Load watch page
     */
    const watchRes = await axios.get(link, {
      headers,
      signal,
    });

    const html: string = watchRes.data;

    /**
     * STEP 2: Extract signed API URL
     * window.signedUrl = "https://dramafull.cc/api/get-link/504936?...";
     */
    const signedUrlMatch = html.match(
      /window\.signedUrl\s*=\s*"([^"]+)"/
    );

    if (!signedUrlMatch) return [];

    const apiUrl = signedUrlMatch[1].replace(/\\\//g, "/");

    /**
     * STEP 3: Call signed API
     */
    const apiRes = await axios.get(apiUrl, {
      headers,
      signal,
    });

    const data = apiRes.data;
    if (!data?.success || !data.video_source) return [];

    const streams: Stream[] = [];

    /**
     * STEP 4: Build stream list
     */
    for (const [quality, videoUrl] of Object.entries(
      data.video_source
    )) {
      streams.push({
        server: "dramafull-sharepoint",
        link: videoUrl as string,
        type: "mp4",
        subtitles: data.sub?.[quality]?.map((sub: string) => ({
          lang: "en",
          url: `https://dramafull.cc${sub}`,
        })),
      });
    }

    return streams;
  } catch (err: any) {
    console.error("getStream error:", err.message);
    return [];
  }
}
