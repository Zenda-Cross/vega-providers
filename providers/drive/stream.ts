import { Stream, ProviderContext } from "../types";
import { hubcloudExtractor } from "../extractors/hubcloud";
import { gdflixExtractor } from "../extractors/gdflix";
import { throwProviderError } from "../providerErrors";

export const getStream = async function ({
  link: url,
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
  const { axios, cheerio, commonHeaders: headers } = providerContext;
  try {
    // If it's an archive or intermediate landing page, unwrap it first
    if (!url.includes("hubcloud") && !url.includes("gdflix")) {
      const res = await axios.get(url, { headers });
      const html = res.data;
      const $ = cheerio.load(html);

      const hubcloudLink =
        $('a[href*="hubcloud"]').attr("href") ||
        $('a:contains("HubCloud")').attr("href") ||
        $(".fa-file-download").parent().attr("href") ||
        html.match(/https:\/\/hubcloud\.[^\/]+\/[^"'\s]+/i)?.[0];

      const gdflixLink =
        $('a[href*="gdflix"]').attr("href") ||
        $('a:contains("GDFliX"), a:contains("GDFlix")').attr("href");

      if (hubcloudLink) {
        url = hubcloudLink;
      } else if (gdflixLink) {
        url = gdflixLink;
      } else {
        const redirectUrl =
          html.match(/<meta\s+http-equiv="refresh"\s+content="[^"]*?;\s*url=([^"]+)"\s*\/?>/i)?.[1] ||
          html.match(/<a\s+[^>]*href="(https:\/\/hubcloud\.[^\/]+\/[^"]+)"/i)?.[1];
        if (redirectUrl) {
          url = redirectUrl;
        }
      }
    }

    if (url.includes("hubcloud")) {
      console.log("Hubcloud stream extraction on:", url);
      return await hubcloudExtractor(
        url,
        signal,
        axios,
        cheerio,
        headers,
        providerContext,
        isDownload,
        "drive",
      );
    } else if (url.includes("gdflix")) {
      console.log("GDFlix stream extraction on:", url);
      return await gdflixExtractor(
        url,
        signal,
        axios,
        cheerio,
        headers,
        providerContext,
      );
    }

    // Final fallback if redirect was still pointing to another intermediate page
    const res2 = await axios.get(url, { headers });
    const $2 = cheerio.load(res2.data);
    const finalHubcloud =
      $2('a[href*="hubcloud"]').attr("href") ||
      $2(".fa-file-download").parent().attr("href") ||
      url;

    return await hubcloudExtractor(
      finalHubcloud,
      signal,
      axios,
      cheerio,
      headers,
      providerContext,
      isDownload,
      "drive",
    );
  } catch (err: any) {
    throwProviderError("Drive", "stream", err);
  }
};
