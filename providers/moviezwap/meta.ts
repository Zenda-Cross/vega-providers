import { Info, Link, ProviderContext } from "../types";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio, getBaseUrl } = providerContext;
    const baseUrl = await getBaseUrl("moviezwap");
    const url = link.startsWith("http") ? link : `${baseUrl}${link}`;
    const res = await axios.get(url);
    const data = res.data;
    const $ = cheerio.load(data);

    // 1. Poster image find  image with width 260
    let image = $('img[width="260"]').attr("src") || "";
    if (image && !image.startsWith("http")) {
      image = baseUrl + image;
    }

    const tags = $("font[color='steelblue']")
      .map((i, el) => $(el).text().trim())
      .get()
      .slice(0, 2);

    // 2. Title
    const title = $("title").text().replace(" - MoviezWap", "").trim() || "";

    // 3. Info table
    let synopsis = "";
    let imdbId = "";
    let type = "movie";
    let infoRows: string[] = [];
    $("td:contains('Movie Information')")
      .parent()
      .nextAll("tr")
      .each((i, el) => {
        const tds = $(el).find("td");
        if (tds.length === 2) {
          const key = tds.eq(0).text().trim();
          const value = tds.eq(1).text().trim();
          infoRows.push(`${key}: ${value}`);
          if (key.toLowerCase().includes("plot")) synopsis = value;
          if (key.toLowerCase().includes("imdb")) imdbId = value;
        }
      });
    if (!synopsis) {
      // fallback: try to find a <p> with plot
      synopsis = $("p:contains('plot')").text().trim();
    }

    // 4. Download links (multiple qualities)
    const links: Link[] = [];
    $('a[href*="download.php?file="], a[href*="dwload.php?file="]').each(
      (i, el) => {
        const downloadPage =
          $(el).attr("href")?.replace("dwload.php", "download.php") || "";
        const text = $(el).text().trim();
        if (downloadPage && /\d+p/i.test(text)) {
          // Only add links with quality in text
          links.push({
            title: text,
            directLinks: [{ title: "Movie", link: baseUrl + downloadPage }],
          });
        }
      }
    );

    $("img[src*='/images/play.png']").each((i, el) => {
      const downloadPage = $(el).siblings("a").attr("href");
      const text = $(el).siblings("a").text().trim();
      console.log("Found link:🔥🔥", text, downloadPage);
      if (downloadPage && text) {
        links.push({
          title: text,
          episodesLink: baseUrl + downloadPage,
        });
      }
    });

    return {
      title,
      synopsis,
      image,
      imdbId,
      tags,
      type,
      linkList: links,
      //info: infoRows.join("\n"),
    };
  } catch (err) {
    console.error(err);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };
  }
};
