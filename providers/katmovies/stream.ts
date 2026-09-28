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

function parseSvelteData(html: string): any {
  const match = html.match(/resolve\(\{\s*id:\s*\d+,\s*data:/);
  if (!match || match.index === undefined) return null;
  const start = match.index + match[0].length;
  const errorIdx = html.indexOf(",error:", start);
  if (errorIdx === -1) return null;
  const dataStr = html.substring(start, errorIdx);
  try {
    return Function(`"use strict"; return (${dataStr});`)();
  } catch {
    return null;
  }
}

async function extractKmhdLink(
  katlink: string,
  providerContext: ProviderContext,
) {
  const { axios, openWebView, commonHeaders } = providerContext;
  let origin = "https://links.kmhd.me";
  try {
    origin = new URL(katlink).origin;
  } catch {}

  let pageData: string = "";
  try {
    const res = await getWithWAF(katlink, axios, openWebView, commonHeaders, {
      Cookie: "unlocked=true",
      Referer: origin + "/",
    });
    pageData = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  } catch (e) {
    console.log("getWithWAF error for katlink:", katlink, e);
  }

  // 1. Extract direct stream links & active HubCloud domain from SvelteKit SSR data
  if (pageData) {
    const parsed = parseSvelteData(pageData);
    const uploadLinks = parsed?.val?.upload_links || parsed?.data?.val?.upload_links;
    const linksMeta = parsed?.links || parsed?.data?.links;

    const hubId = uploadLinks?.hubdrive_res;
    if (hubId && hubId !== "None") {
      const hubBase = linksMeta?.hubdrive_res?.link || "https://hubcloud.cx/drive/";
      return hubBase + hubId;
    }
    const gdId = uploadLinks?.gdflix_res;
    if (gdId && gdId !== "None") {
      const gdBase = linksMeta?.gdflix_res?.link || "https://gd.kmhd.eu/file/";
      return gdBase + gdId;
    }

    const hubMatch = pageData.match(/hubdrive_res:\s*"([^"]+)"/)?.[1];
    if (hubMatch && hubMatch !== "None") {
      const hubLinkMatch = pageData.match(
        /hubdrive_res\s*:\s*{[^}]*?link\s*:\s*"([^"]+)"/,
      )?.[1]?.replace("hubcloud.foo", "hubcloud.cx");
      const base = hubLinkMatch || "https://hubcloud.cx/drive/";
      return base + hubMatch;
    }
  }

  // 2. Fallback to API call using dynamically extracted token & API host
  const fileIdMatch = katlink.match(/[\w]+_[a-f0-9]{8}/);
  if (fileIdMatch) {
    const fileId = fileIdMatch[0];
    const dynamicToken = pageData.match(/"PUBLIC_TOKEN"\s*:\s*"([^"]+)"/)?.[1];
    const token =
      dynamicToken ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTgwNzQ4NDIzMywiaWF0IjoxNzA3NDg0MjMzfQ.7u5bF9PcMhvClSDZgsd6EU-CQnp1Ec--wsezkDEgiZo";

    const chibiMatch = pageData.match(
      /"PUBLIC_CHIBI_PATH"\s*:\s*"https?:\/\/([^"\/]+)"/,
    )?.[1];
    const apiHost = chibiMatch
      ? chibiMatch.replace(/^upload-[^.]+\./, "api.")
      : "api.dandndn.one";

    try {
      const res = await axios.get(`https://${apiHost}/api/v1/file/${fileId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...commonHeaders,
          Origin: origin,
          Referer: origin + "/",
        },
      });
      const hubId = res.data?.upload_links?.hubdrive_res;
      if (hubId && hubId !== "None") {
        return `https://hubcloud.cx/drive/${hubId}`;
      }
      const gdId = res.data?.upload_links?.gdflix_res;
      if (gdId && gdId !== "None") {
        return `https://new.gdflix.cfd/file/${gdId}`;
      }
    } catch (e) {
      console.log(`${apiHost} error, trying fallback...`, e);
    }
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
    if (link.includes("gdflix") || link.includes("gd.kmhd")) {
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
      if (hubcloudLink.includes("gdflix") || hubcloudLink.includes("gd.kmhd")) {
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
