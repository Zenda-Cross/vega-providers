import { Stream, ProviderContext } from "../types";
import { hubcloudExtractor } from "../extractors/hubcloud";
import { gdflixExtractor } from "../extractors/gdflix";
import { throwProviderError } from "../providerErrors";

async function getWithWAF(
  url: string,
  axios: any,
  openWebView: any,
  headers: any,
  customHeaders?: any,
): Promise<any> {
  const baseUrl = url.split("/").slice(0, 3).join("/");
  const mergedHeaders = { ...headers, ...customHeaders, Referer: baseUrl };
  try {
    return await axios.get(url, { headers: mergedHeaders });
  } catch (error: any) {
    if (error.response?.status === 403 && openWebView) {
      console.log(`WAF detected (403) for ${url}, using solver...`);
      const wafResult = await openWebView(baseUrl, {
        title: "Solve the captcha below and click done",
        description: "Required to bypass anti-bot protection.",
        headers: mergedHeaders,
        force: true,
        waitForCookie: "cf_clearance",
      });
      return await axios.get(url, {
        headers: {
          ...mergedHeaders,
          Cookie:
            (mergedHeaders.Cookie ? mergedHeaders.Cookie + "; " : "") +
            (wafResult.cookies || wafResult.cookie),
        },
      });
    }
    throw error;
  }
}

async function extractKmhdLink(
  katlink: string,
  providerContext: ProviderContext,
) {
  const fileIdMatch = katlink.match(/[\w]+_[a-f0-9]{8}/);
  if (fileIdMatch) {
    const fileId = fileIdMatch[0];
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTgwNzQ4NDIzMywiaWF0IjoxNzA3NDg0MjMzfQ.7u5bF9PcMhvClSDZgsd6EU-CQnp1Ec--wsezkDEgiZo";
    try {
      const res = await providerContext.axios.get(
        `https://api.dandndn.one/api/v1/file/${fileId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            ...providerContext.commonHeaders,
            Origin: "https://links.kmhd.eu",
            Referer: "https://links.kmhd.eu/",
          },
        }
      );
      const hubId = res.data?.upload_links?.hubdrive_res;
      if (hubId && hubId !== "None") {
        return `https://hubcloud.cx/drive/${hubId}`;
      }
      const gdId = res.data?.upload_links?.gdflix_res;
      if (gdId && gdId !== "None") {
        return `https://gd.kmhd.eu/file/${gdId}`;
      }
    } catch (e) {
      console.log("api.dandndn.one error, trying fallback...", e);
    }
  }

  const { axios, openWebView, commonHeaders } = providerContext;
  const res = await getWithWAF(katlink, axios, openWebView, commonHeaders, {
    Cookie: "unlocked=true",
  });
  const data = res.data;
  const hubDriveRes = data.match(/hubdrive_res:\s*"([^"]+)"/)?.[1];
  const hubDriveLink = data.match(
    /hubdrive_res\s*:\s*{[^}]*?link\s*:\s*"([^"]+)"/,
  )?.[1]?.replace("hubcloud.foo", "hubcloud.cx");
  if (hubDriveLink && hubDriveRes) {
    return hubDriveLink + hubDriveRes;
  }
  return katlink;
}

export const getStream = async function ({
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
}): Promise<Stream[]> {
  const { axios, cheerio, commonHeaders, openWebView } = providerContext;
  console.log("katGetStream", link);
  try {
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
    if (link.includes("kmhd") || link.includes("kmphotos")) {
      const hubcloudLink = await extractKmhdLink(link, providerContext);
      if (hubcloudLink.includes("gdflix")) {
        return await gdflixExtractor(
          hubcloudLink,
          signal,
          axios,
          cheerio,
          commonHeaders,
          providerContext,
        );
      }
      return await hubcloudExtractor(
        hubcloudLink,
        signal,
        axios,
        cheerio,
        commonHeaders,
        providerContext,
        isDownload,
        "katmovies",
      );
    }
    if (link.includes("hubcloud")) {
      return await hubcloudExtractor(
        link,
        signal,
        axios,
        cheerio,
        commonHeaders,
        providerContext,
        isDownload,
        "katmovies",
      );
    }

    // Default to hubcloud extractor
    return await hubcloudExtractor(
      link,
      signal,
      axios,
      cheerio,
      commonHeaders,
      providerContext,
      isDownload,
      "katmovies",
    );
  } catch (err) {
    throwProviderError("KatMovies", "stream", err);
  }
};
