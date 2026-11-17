import { getPage } from "./request";
import { ProviderContext, Stream } from "../types";
import { hubcloudExtractor } from "../extractors/hubcloud";
import { zcloudExtractor } from "../extractors/zcloud";
import { gdflixExtractor } from "../extractors/gdflix";
import { throwProviderError } from "../providerErrors";

const headers = {Accept: "text/html,application/xhtml+xml,*/*;q=0.8"};

export async function getStream({
  link,
  type,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
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
      const dotlinkText = (await getPage(link, providerContext, signal)).data;

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

    let hubStreams;
    if (link.includes("zcloud")) {
      hubStreams = await zcloudExtractor(
        link,
        signal,
        axios,
        cheerio,
        headers,
        providerContext,
      );
    } else {
      hubStreams = await hubcloudExtractor(
        link,
        signal,
        axios,
        cheerio,
        headers,
        providerContext,
        isDownload,
        "zeefliz",
      );
    }

    if (Array.isArray(hubStreams) && hubStreams.length > 0) {
      streamLinks.push(...hubStreams);
      return streamLinks;
    }

    return streamLinks;
  } catch (error: any) {
    throwProviderError("ZeeFliz", "stream", error);
  }
}
