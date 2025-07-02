import axios from "axios";
import * as cheerio from "cheerio";

export async function getMeta(url: string) {
  const res = await axios.get(url);
  const $ = cheerio.load(res.data);
  const title = $("h1, h2, .post-title").first().text().trim();
  const poster = $("img").first().attr("src");
  const description = $("p").first().text().trim();
  const downloads: { label: string; url: string }[] = [];
  // Find download links under headings
  $('h2:contains("Download Links"), h3:contains("Download Links")')
    .nextAll("h3")
    .each((_, el) => {
      const a = $(el).find("a");
      if (a.length) {
        const label = a.text().trim();
        const url = a.attr("href");
        if (url) downloads.push({ label, url });
      }
    });
  // Fallback: find all download <a> tags
  if (downloads.length === 0) {
    $("a").each((_, el) => {
      const text = $(el).text().toLowerCase();
      if (
        text.includes("720p") ||
        text.includes("480p") ||
        text.includes("1080p")
      ) {
        downloads.push({
          label: $(el).text().trim(),
          url: $(el).attr("href")!,
        });
      }
    });
  }
  return { title, poster, description, downloads };
}
