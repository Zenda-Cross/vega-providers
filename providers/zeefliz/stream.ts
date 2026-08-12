import { ProviderContext, Stream } from "../types";
import { hubcloudExtractor } from "../extractors/hubcloud";
import { gdflixExtractor } from "../extractors/gdflix";
import { throwProviderError } from "../providerErrors";

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
    "ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=nJQQ9ncb6m2Nc7HoxzuphPhnQgLzI6nBmzl2D.9oY4E-1759137994-1.2.1.1-pe7DiQHVsfZjnbHWTnaNbMiTYEuk.VvpPGaMeTtHOh7p9TKG5auBIDGDDW93devKuNcOlkhe6mk4v5OcsM0H_q3Te02eCPoTNgZsW8terjwvnQUebbbe8QKjMaVsVKgnbiAxS2ESM9aB3fbiQ9diuNT6ziY.2U4mPaJ0Y4vCu3404o5qBEw5c2psIuabKUTZviA2NJvN.lx5jAFQnB.HXeXJnUuCcbQac7G1BYBfdso",
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
  const { axios, cheerio, commonHeaders, openWebView } = providerContext;
  try {
    const streamLinks: Stream[] = [];
    console.log("dotlink", link);

    if (link.includes("gdflix")) {
      return await gdflixExtractor(
        link,
        signal,
        axios,
        cheerio,
        commonHeaders,
        providerContext,
      );
    }

    if (
      type === "movie" ||
      link.includes("nexdrive") ||
      link.includes("dotlink") ||
      link.includes("multicloud")
    ) {
      // vlink
      let dotlinkText = "";
      try {
        const dotlinkRes = await axios(`${link}`, { headers, signal });
        dotlinkText = dotlinkRes.data;
      } catch (error: any) {
        if (error.response?.status === 403 && openWebView) {
          console.log(
            `ZeeFliz: WAF detected (403) for ${link}, using solver...`,
          );
          const baseUrl = link.split("/").slice(0, 3).join("/");
          const wafResult = await openWebView(baseUrl, {
            title: "Solve the captcha below and click done",
            description: "Required to bypass anti-bot protection.",
            headers: { ...headers, Referer: baseUrl },
            waitForCookie: "cf_clearance",
            force: true,
          });
          if (wafResult.userAgent) headers["User-Agent"] = wafResult.userAgent;
          headers["Cookie"] =
            (headers["Cookie"] ? headers["Cookie"] + "; " : "") +
            wafResult.cookies;
          const retryRes = await axios(`${link}`, { headers, signal });
          dotlinkText = retryRes.data;
        } else {
          throw error;
        }
      }

      const vlink = dotlinkText.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i) || [];
      console.log("vLink", vlink[1]);
      if (vlink[1]) {
        link = vlink[1];
      }

      // filepress link
      try {
        const $ = cheerio.load(dotlinkText);
        const filepressLink = $(
          '.btn.btn-sm.btn-outline[style="background:linear-gradient(135deg,rgb(252,185,0) 0%,rgb(0,0,0)); color: #fdf8f2;"]',
        )
          .parent()
          .attr("href");
        // console.log('filepressLink', filepressLink);
        const filepressID = filepressLink?.split("/").pop();
        const filepressBaseUrl = filepressLink
          ?.split("/")
          .slice(0, -2)
          .join("/");
        // console.log('filepressID', filepressID);
        // console.log('filepressBaseUrl', filepressBaseUrl);
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
          },
        );
        // console.log('filepressTokenRes', filepressTokenRes.data);
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
            },
          );
          // console.log('filepressStreamLink', filepressStreamLink.data);
          streamLinks.push({
            server: "filepress",
            link: filepressStreamLink.data?.data?.[0],
            type: "mkv",
          });
        }
      } catch (error) {
        console.log("filepress error: ");
        // console.error(error);
      }
    }

    const hubStreams = await hubcloudExtractor(
      link,
      signal,
      axios,
      cheerio,
      commonHeaders,
      providerContext,
    );

    if (Array.isArray(hubStreams) && hubStreams.length > 0) {
      streamLinks.push(...hubStreams);
      return streamLinks;
    }

    return streamLinks;
  } catch (error: any) {
    throwProviderError("ZeeFliz", "stream", error);
  }
}
