import { Stream, ProviderContext } from "../types";
import { hubcloudExtractor } from "../extractors/hubcloud";
import { gdflixExtractor } from "../extractors/gdflix";

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
            wafResult.cookies,
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
  const { axios, openWebView, commonHeaders } = providerContext;
  const res = await getWithWAF(katlink, axios, openWebView, commonHeaders, {
    Cookie: "unlocked=true",
  });
  const data = res.data;
  const hubDriveRes = data.match(/hubdrive_res:\s*"([^"]+)"/)[1];
  const hubDriveLink = data.match(
    /hubdrive_res\s*:\s*{[^}]*?link\s*:\s*"([^"]+)"/,
  )[1];
  return hubDriveLink + hubDriveRes;
}
export const getStream = async function ({
  link,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, cheerio, commonHeaders, openWebView } = providerContext;
  const streamLinks: Stream[] = [];
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
    if (link.includes("kmhd")) {
      const hubcloudLink = await extractKmhdLink(link, providerContext);
      return await hubcloudExtractor(
        hubcloudLink,
        signal,
        axios,
        cheerio,
        commonHeaders,
      );
    }
    if (link.includes("gdflix")) {
      // resume link
      try {
        const resumeDrive = link.replace("/file", "/zfile");
        //   console.log('resumeDrive', resumeDrive);
        const resumeDriveRes = await getWithWAF(
          resumeDrive,
          axios,
          openWebView,
          commonHeaders,
        );
        const resumeDriveHtml = resumeDriveRes.data;
        const $resumeDrive = cheerio.load(resumeDriveHtml);
        const resumeLink = $resumeDrive(".btn-success").attr("href");
        console.log("resumeLink", resumeLink);
        if (resumeLink) {
          streamLinks.push({
            server: "ResumeCloud",
            link: resumeLink,
            type: "mkv",
          });
        }
      } catch (err) {
        console.log("Resume link not found");
      }
      //instant link
      try {
        const driveres = await getWithWAF(
          link,
          axios,
          openWebView,
          commonHeaders,
        );
        const $drive = cheerio.load(driveres.data);
        const seed = $drive(".btn-danger").attr("href") || "";
        const instantToken = seed.split("=")[1];
        //   console.log('InstantToken', instantToken);
        const InstantFromData = new FormData();
        InstantFromData.append("keys", instantToken);
        const videoSeedUrl = seed.split("/").slice(0, 3).join("/") + "/api";
        //   console.log('videoSeedUrl', videoSeedUrl);
        const instantLinkRes = await fetch(videoSeedUrl, {
          method: "POST",
          body: InstantFromData,
          headers: {
            "x-token": videoSeedUrl,
          },
        });
        const instantLinkData = await instantLinkRes.json();
        console.log("instantLinkData", instantLinkData);
        if (instantLinkData.error === false) {
          const instantLink = instantLinkData.url;
          streamLinks.push({
            server: "Gdrive-Instant",
            link: instantLink,
            type: "mkv",
          });
        } else {
          console.log("Instant link not found", instantLinkData);
        }
      } catch (err) {
        console.log("Instant link not found", err);
      }
      return streamLinks;
    }
    const stereams = await hubcloudExtractor(
      link,
      signal,
      axios,
      cheerio,
      commonHeaders,
    );
    return stereams;
  } catch (error: any) {
    console.log("katgetStream error: ", error);
    return [];
  }
};
