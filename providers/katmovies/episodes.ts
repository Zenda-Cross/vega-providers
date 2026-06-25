import { EpisodeLink, ProviderContext } from "../types";

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

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio, openWebView, commonHeaders } = providerContext;
  const episodesLink: EpisodeLink[] = [];
  try {
    if (url.includes("gdflix")) {
      const baseUrl = url.split("/pack")?.[0];
      const res = await getWithWAF(url, axios, openWebView, commonHeaders);
      const data = res.data;
      const $ = cheerio.load(data);
      const links = $(".list-group-item");
      links?.map((i, link) => {
        episodesLink.push({
          title: $(link).text() || "",
          link: baseUrl + $(link).find("a").attr("href") || "",
        });
      });
      if (episodesLink.length > 0) {
        return episodesLink;
      }
    }
    if (url.includes("/pack")) {
      const epIds = await extractKmhdEpisodes(url, providerContext);
      epIds?.forEach((id: string, index: number) => {
        episodesLink.push({
          title: `Episode ${index + 1}`,
          link: url.split("/pack")[0] + "/file/" + id,
        });
      });
    }
    const res = await getWithWAF(url, axios, openWebView, commonHeaders, {
      Cookie:
        "_ga_GNR438JY8N=GS1.1.1722240350.5.0.1722240350.0.0.0; _ga=GA1.1.372196696.1722150754; unlocked=true",
    });
    const episodeData = res.data;
    const $ = cheerio.load(episodeData);
    const links = $(".autohyperlink");
    links?.map((i, link) => {
      episodesLink.push({
        title: $(link).parent().children().remove().end().text() || "",
        link: $(link).attr("href") || "",
      });
    });

    return episodesLink;
  } catch (err) {
    console.error(err);
    return [];
  }
};

export async function extractKmhdLink(
  katlink: string,
  providerContext: ProviderContext,
) {
  const { axios, openWebView, commonHeaders } = providerContext;
  const res = await getWithWAF(katlink, axios, openWebView, commonHeaders);
  const data = res.data;
  const hubDriveRes = data.match(/hubdrive_res:\s*"([^"]+)"/)[1];
  const hubDriveLink = data.match(
    /hubdrive_res\s*:\s*{[^}]*?link\s*:\s*"([^"]+)"/,
  )[1];
  return hubDriveLink + hubDriveRes;
}

async function extractKmhdEpisodes(
  katlink: string,
  providerContext: ProviderContext,
) {
  const { axios, openWebView, commonHeaders } = providerContext;
  const res = await getWithWAF(katlink, axios, openWebView, commonHeaders);
  const data = res.data;
  const ids = data.match(/[\w]+_[a-f0-9]{8}/g);
  return ids;
}
