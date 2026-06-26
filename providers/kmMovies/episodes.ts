import { EpisodeLink, ProviderContext } from "../types";

async function getWithWAF(
  url: string,
  axios: any,
  openWebView: any,
  headers: any,
): Promise<any> {
  const baseUrl = url.split("/").slice(0, 3).join("/");
  try {
    return await axios.get(url, { headers: { ...headers, Referer: baseUrl } });
  } catch (error: any) {
    if (error.response?.status === 403 && openWebView) {
      console.log(`WAF detected (403) for ${url}, using solver...`);
      const wafResult = await openWebView(baseUrl, {
        title: "Solve the captcha below and click done",
        description: "Required to bypass anti-bot protection.",
        headers: { ...headers, Referer: baseUrl },
        waitForCookie: "cf_clearance",
      });
      return await axios.get(url, {
        headers: { ...headers, Referer: baseUrl, Cookie: wafResult.cookie },
      });
    }
    throw error;
  }
}

export async function getEpisodeLinks({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    const { axios, cheerio, openWebView, commonHeaders } = providerContext;
    const res = await getWithWAF(url, axios, openWebView, commonHeaders);
    const $ = cheerio.load(res.data || "");
    const episodes: EpisodeLink[] = [];

    $("h4.fittexted_for_content_h4").each((_, h4El) => {
      const epTitle = $(h4El).text().trim();
      if (!epTitle) return;

      // Next until next <h4> or <hr> ke andar saare <a> links
      $(h4El)
        .nextUntil("h4, hr")
        .find("a[href]") // sirf <a> tags
        .each((_, linkEl) => {
          let href = ($(linkEl).attr("href") || "").trim();
          if (!href) return;
          if (!href.startsWith("http")) href = new URL(href, url).href;

          const btnText = $(linkEl).text().trim() || "Watch Episode";

          // --- Sirf SkyDrop links include karo
          const lowerHref = href.toLowerCase();
          if (lowerHref.includes("skydro") || lowerHref.includes("flexplayer.buzz")) {
            episodes.push({
              title: `${epTitle} - ${btnText}`,
              link: href,
            });
          }
        });
    });

    // --- Sort by episode number extracted from title
    episodes.sort((a, b) => {
      const numA = parseInt(a.title.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.title.match(/\d+/)?.[0] || "0");
      return numA - numB;
    });

    return episodes;
  } catch (err) {
    console.error("getEpisodeLinks error:", err);
    return [];
  }
}

// --- System wrapper
export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  return await getEpisodeLinks({ url, providerContext });
}
