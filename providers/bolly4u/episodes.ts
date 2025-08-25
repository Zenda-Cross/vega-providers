// episodes.ts
import { ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  signal,
  providerContext,
}: {
  url: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}) {
  const res = await providerContext.axios.get(url, {
    headers: providerContext.commonHeaders,
    signal,
  });
  const $ = providerContext.cheerio.load(res.data || "");
  const episodes: { title: string; link: string }[] = [];

  $("a").each((_, el) => {
    const $a = $(el);
    const href = $a.attr("href") || "";
    if (/episode|ep/i.test($a.text())) {
      episodes.push({ title: $a.text().trim(), link: href });
    }
  });

  return episodes;
};
