import { Info, Link, ProviderContext } from "../types";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;
  const res = await axios.get(link);
  const $ = cheerio.load(res.data);

  const ogDesc = $("meta[property='og:description']").attr("content") || "";
  const ogImage = $("meta[property='og:image']").attr("content") || "";

  const title =
    ogDesc.match(/Name:(.*?)\(/)?.[1]?.trim() ||
    $("h1").first().text().trim();

  const year = ogDesc.match(/\((\d{4})\)/)?.[1];
  const isMovie = ogDesc.startsWith("Movie");

  let synopsis = "";
  $("p").each((_, p) => {
    const strong = $(p).find("strong").text().toLowerCase();
    if (strong.includes("plot")) {
      $(p).find("strong").remove();
      synopsis = $(p).text().trim();
    }
  });

  // 🔥 IMPORTANT PART – linkList
  const linkList: Link[] = [];

  $("iframe").each((index, iframe) => {
    const src = $(iframe).attr("src");
    if (!src) return;

    const label =
      $(iframe).prev("p").text().trim() || `Server ${index + 1}`;

    linkList.push({
      title: label,
      quality: "HDRip",
      episodesLink: link, // same page
      directLinks: [
        {
          title: label,
          link: src, // 👈 iframe link → stream.ts
          type: isMovie ? "movie" : "series",
        },
      ],
    });
  });

  return {
    title,
    synopsis,
    image: ogImage,
    imdbId: "",
    type: isMovie ? "movie" : "series",
    linkList, // ✅ NOW IT APPEARS
  };
}
