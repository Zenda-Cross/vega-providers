import { Info, Link, ProviderContext } from "../types";

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
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
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
};

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
        force: true,
      });
      return await axios.get(url, {
        headers: { ...headers, Referer: baseUrl, Cookie: wafResult.cookie },
      });
    }
    throw error;
  }
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio, openWebView } = providerContext;
    console.log("Fetching metadata from UHD...", link, providerContext);
    const url = link;
    const res = await getWithWAF(url, axios, openWebView, headers);
    const html = await res.data;
    const $ = cheerio.load(html);

    const title = $("h2:first").text() || "";
    const image = $("h2").siblings().find("img").attr("src") || "";
    // const trailer = $('iframe').attr('src') || '';

    // console.log({ title, image, trailer });

    // Links
    const episodes: Link[] = [];

    // new structure
    $(".mks_separator,p:contains('mks_separator')").each((index, element) => {
      $(element)
        .nextUntil(".mks_separator")
        .each((index, element) => {
          const title = $(element).text();
          const episodesList: { title: string; link: string }[] = [];
          $(element)
            .next("p")
            .find("a")
            .each((index, element) => {
              const title = $(element).text();
              const link = $(element).attr("href");
              if (title && link && !title.toLocaleLowerCase().includes("zip")) {
                episodesList.push({ title, link });
                //   console.log({ title, link });
              }
            });
          if (title && episodesList.length > 0) {
            episodes.push({
              title,
              directLinks: episodesList,
            });
          }
        });
    });

    // old structure
    $("hr").each((index, element) => {
      $(element)
        .nextUntil("hr")
        .each((index, element) => {
          const title = $(element).text();
          const episodesList: { title: string; link: string }[] = [];
          $(element)
            .next("p")
            .find("a")
            .each((index, element) => {
              const title = $(element).text();
              const link = $(element).attr("href");
              if (title && link && !title.toLocaleLowerCase().includes("zip")) {
                episodesList.push({ title, link });
                //   console.log({ title, link });
              }
            });
          if (title && episodesList.length > 0) {
            episodes.push({
              title,
              directLinks: episodesList,
            });
          }
        });
    });
    // console.log(episodes);
    return {
      title: title.match(/^Download\s+([^(\[]+)/i)
        ? title?.match(/^Download\s+([^(\[]+)/i)?.[1] || ""
        : title.replace("Download", "") || "",
      image,
      imdbId: "",
      synopsis: title,
      type: "",
      linkList: episodes,
    };
  } catch (error) {
    console.error(error);
    return {
      title: "",
      image: "",
      imdbId: "",
      synopsis: "",
      linkList: [],
      type: "uhd",
    };
  }
};
