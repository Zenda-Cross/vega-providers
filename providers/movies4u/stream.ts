import { ProviderContext, Stream } from "../types";
import { hubcloudExtractor } from "../extractors/hubcloud";

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
    if (type === "movie") {
      let dotlinkRes;
      let cookies: string | undefined;

      try {
        dotlinkRes = await axios(`${link}`, {
          headers: {
            ...commonHeaders,
            Referer: link,
          },
        });
      } catch (error: any) {
        if (error.response?.status === 403) {
          console.log("Solving WAF for Movies4U...");
          const wafResult = await openWebView(link, {
            title: "Solve the captcha below and click done",
            description:
              "This is required to bypass the anti-bot protection and retrieve the stream link.",
            headers: {
              ...commonHeaders,
              Referer: link,
            },
            force: true,
            waitForCookie: "cf_clearance",
          });
          console.log("WAF solved", wafResult.cookies);
          cookies = wafResult.cookies;

          dotlinkRes = await axios(`${link}`, {
            headers: {
              ...commonHeaders,
              Referer: link,
              Cookie: cookies,
            },
          });
        } else {
          throw error;
        }
      }

      const dotlinkText = dotlinkRes.data;
      // console.log('dotlinkText', dotlinkText);
      const vlink = dotlinkText.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i) || [];
      // console.log('vLink', vlink[1]);
      if (vlink[1]) {
        link = vlink[1];
      } else {
        // Try to find hubcloud or gdflix links directly
        const $ = cheerio.load(dotlinkText);
        const directLink = $("a")
          .filter((i, el) => {
            const href = $(el).attr("href") || "";
            return (
              href.includes("hubcloud") ||
              href.includes("gdflix") ||
              href.includes("filebee") ||
              href.includes("fastdl")
            );
          })
          .first()
          .attr("href");

        if (directLink) {
          link = directLink;
        }
      }

      // If it's a fastdl link, extract the redirect URL
      if (link.includes("fastdl.zip")) {
        try {
          const fastdlRes = await axios.get(link, { headers });
          const reurlMatch = fastdlRes.data.match(/var reurl = "([^"]+)";/);
          if (reurlMatch && reurlMatch[1]) {
            const actualLink = reurlMatch[1].replace(
              "https://fastdl.zip/dl.php?link=",
              "",
            );
            streamLinks.push({
              server: "fastdl",
              link: actualLink,
              type: "mkv",
            });
            return streamLinks;
          }
        } catch (error) {
          console.log("fastdl error: ", error);
        }
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

    return await hubcloudExtractor(link, signal, axios, cheerio, commonHeaders);
  } catch (error: any) {
    console.log("getStream error: ", error);
    if (error.message.includes("Aborted")) {
    } else {
    }
    return [];
  }
}
