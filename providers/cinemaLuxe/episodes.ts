import { EpisodeLink, ProviderContext } from "../types";

const headers = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Cache-Control": "no-store",
  "Accept-Language": "en-US,en;q=0.9",
  DNT: "1",
  "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

export const getEpisodes = ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> => {
  const { axios, cheerio } = providerContext;
  console.log("Fetching episodes from:", url);

  return axios
    .get(url, { headers })
    .then((res) => {
      const $ = cheerio.load(res.data);
      const episodes: EpisodeLink[] = [];

      // Series ke liye: section aria-label="Download links for episodes"
      $('section[aria-label*="Download links for episodes"]').each((_, section) => {
        const section$ = $(section);

        section$.find("p a").each((_, aEl) => {
          const anchor = $(aEl);
          const btnText = anchor.text().trim();
          const href = anchor.attr("href") || "";

          // sirf V-Cloud wale link
          if (btnText.includes("V-Cloud") && href) {
            let finalLink = href;

            // agar href relative hai (starting with /dl.php) to absolute bana do
            if (href.startsWith("/")) {
              const base = url.split("/").slice(0, 3).join("/");
              finalLink = base + href;
            }

            episodes.push({ title: btnText, link: finalLink });
          }
        });
      });

      return episodes;
    })
    .catch((err) => {
      console.log("getEpisodes error:", err);
      return [];
    });
};
