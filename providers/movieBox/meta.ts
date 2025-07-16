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
    const baseUrl = await getBaseUrl("movieBox");
    const links: Link[] = [];
    // this is just a proxy please host your own if you want to use this code:- https://github.com/himanshu8443/Cf-Workers/blob/main/src/dob-worker/index.js
    const response = await fetch("https://dob-worker.8man.workers.dev", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: link,
        method: "GET",
      }),
    });
    const data = (await response.json()).data;
    console.log("data", data);

    // metadata
    const title = (data?.title || "").replace(/\s*\[.*?\]\s*$/, "");
    const synopsis = data?.description || "";
    const image = data?.cover?.url || "";
    const rating = data?.imdbRatingValue || "";
    const tags =
      data?.genre?.split(",")?.map((tag: string) => tag.trim()) || [];

    const dubs = data?.dubs || [];

    dubs?.forEach((dub: any) => {
      const link: Link = {
        title: dub?.lanName,
        episodesLink: `${baseUrl}/wefeed-mobile-bff/subject-api/resource?subjectId=${dub?.subjectId}&page=1&perPage=20&all=0&startPosition=1&endPosition=1&pagerMode=0&resolution=1080&se=1&epFrom=1&epTo=1`,
      };
      links.push(link);
    });

    console.log("meta", {
      title,
      synopsis,
      image,
      rating,
      tags,
      links,
    });

    return {
      title,
      synopsis,
      image,
      rating,
      tags,
      imdbId: "",
      type: "movie",
      linkList: links,
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
