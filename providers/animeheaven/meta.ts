import { Info, Link, ProviderContext } from "../types";

const headers = {
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "en-IN,en;q=0.9",
  "Cache-Control": "max-age=0",
  Connection: "keep-alive",
  Cookie: "_popprepop=1; key=8a93821ca8ad1cb9cd9de1658aa97603",
  Host: "animeheaven.me",
  Referer: "https://animeheaven.me/anime.php?mruwf",
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
};

export const getMeta = ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> => {
  const { axios, cheerio } = providerContext;

  const empty: Info = {
    title: "",
    synopsis: "",
    image: "",
    imdbId: "",
    type: "series",
    linkList: [],
  };

  return axios
    .get(link, { headers })
    .then((res) => {
      const $ = cheerio.load(res.data);

      const title = $(".infotitle").first().text().trim();
      const synopsis = $(".infodes").first().text().trim();
      const image = $(".posterimg").attr("src") || "";

      const directLinks: Link["directLinks"] = [];
      const aTags = $(".linetitle2 a").toArray();

      // iterate sequentially using Promise chain
      let chain = Promise.resolve();

      aTags.forEach((el) => {
        chain = chain.then(() => {
          const aTag = $(el);
          const epiNum = aTag.find(".watch2").text().trim();

          const onclick = aTag.attr("onclick") || "";
          const onmouseover = aTag.attr("onmouseover") || "";
          const onclickMatch = onclick.match(/gate\(["']([a-f0-9]+)["']\)/i);
          const onmouseoverMatch = onmouseover.match(/gateh\(["']([a-f0-9]+)["']\)/i);
          const gateHash = onclickMatch ? onclickMatch[1] : onmouseoverMatch ? onmouseoverMatch[1] : null;

          if (epiNum && gateHash) {
            const formData = new URLSearchParams();
            formData.append("id", gateHash);

            return axios
              .post("https://animeheaven.me/gate.php", formData.toString(), {
                headers: {
                  ...headers,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
              })
              .then((jsonRes) => {
                const realLink = jsonRes.data?.link || `https://animeheaven.me/gate.php?id=${gateHash}`;
                directLinks.push({
                  title: `Episode ${epiNum}`,
                  link: realLink,
                  type: "episode",
                });
              })
              .catch(() => {}); // ignore single episode error
          }
          return Promise.resolve();
        });
      });

      return chain.then(() => {
        const linkList: Link[] = [];
        if (directLinks.length) {
          linkList.push({
            title: `Episodes (${directLinks.length})`,
            quality: "Subbed",
            episodesLink: directLinks[0].link,
            directLinks: directLinks.reverse(),
          });
        }

        return {
          title,
          synopsis,
          image,
          imdbId: "",
          type: "series",
          linkList,
        };
      });
    })
    .catch(() => empty);
};
