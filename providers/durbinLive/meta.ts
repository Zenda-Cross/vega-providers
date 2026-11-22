import { Info, ProviderContext } from "../types";
import { absolute, getBase, getPage } from "./api";
import { throwProviderError } from "../providerErrors";

export async function getMeta({ link, providerContext }: {
  link: string; providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const base = await getBase(providerContext);
    const url = absolute(link, base);
    const $ = providerContext.cheerio.load(await getPage(url, providerContext, `${base}/`));
    const title = $(".poster-dtl-item h2").first().text().trim();
    const watch = $("a[href*='/livetv/watch/'], a[href*='/sports/watch/']").first().attr("href");
    if (!title || !watch) throw new Error("This DurbinLive channel has no public watch page");
    const image = $(".dtl-poster-img img").attr("src") || $("meta[property='og:image']").attr("content") || "";
    const synopsis = $(".poster-dtl-item h3").text().trim() || $("meta[name='description']").attr("content") || "Live channel";
    const categories = $(".dtl-list-link a").map((_, e) => $(e).text().trim()).get().filter(Boolean);
    return {
      title, synopsis, image: image ? absolute(image, base) : "", imdbId: "", type: "movie",
      tags: ["Live", ...categories], webUrl: url,
      linkList: [{ title: "Live TV", directLinks: [{ title: "Watch Live", link: absolute(watch, url), type: "movie" }] }],
    };
  } catch (error) {
    throwProviderError("DurbinLive", "metadata", error);
  }
}
