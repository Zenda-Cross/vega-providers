import { ProviderContext } from "../types";

export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}) {
  const { axios, cheerio } = providerContext;
  const res = await axios.get(url);
  const $ = cheerio.load(res.data);

  const episodes: { title: string; link: string }[] = [];

  $("p > strong").each((_, el) => {
    const text = $(el).text().trim();
    const match = text.match(/^Episode\s*(\d+)/i);
    if (!match) return;

    const epNum = parseInt(match[1], 10).toString();

    const watchP = $(el).parent().next("p");
    const rawLink = watchP.find("a[href]").attr("href");
    if (!rawLink) return;

    // 🔹 detect season
    const seasonMatch = rawLink.match(/(\d+)x\d+/i);
    const season = seasonMatch ? seasonMatch[1] : "1";

    // 🔥 remove everything after slug
    const slugMatch = rawLink.match(/(https:\/\/toonstream\.one\/episode\/[^\/]+-)/i);
    if (!slugMatch) return;

    const slugBase = slugMatch[1]; // ends with -

    // ✅ FINAL CORRECT URL
    const finalLink = `${slugBase}${season}x${epNum}/`;

    episodes.push({
      title: `Episode ${epNum}`,
      link: finalLink,
    });
  });

  // 🎬 MOVIE FALLBACK
  if (episodes.length === 0) {
    const movieLink = $('a[href*="toonstream.one/movies/"]').first().attr("href");
    if (movieLink) {
      episodes.push({
        title: "Play",
        link: movieLink.endsWith("/") ? movieLink : movieLink + "/",
      });
    }
  }

  return episodes;
}
