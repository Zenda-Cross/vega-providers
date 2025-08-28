import { Stream, ProviderContext } from "../types";

export const getStream = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, cheerio } = providerContext;
  const streams: Stream[] = [];

  try {
    const res = await axios.get(link);
    const $ = cheerio.load(res.data);

    // --- Find all player options (servers / episodes)
    const playerOptions = $("#playeroptionsul li");
    if (playerOptions.length === 0) {
      // fallback: single iframe
      const iframeLink = $("iframe").attr("src");
      if (iframeLink) {
        streams.push({
          link: iframeLink.startsWith("//") ? "https:" + iframeLink : iframeLink,
          type: "embed",
          quality: "auto",
          server: "Main",
        });
      }
      return streams;
    }

    playerOptions.each((_, el) => {
      const option = $(el);
      const serverName = option.find(".title").text().trim() || "Server";
      const postId = option.attr("data-post");
      const numeId = option.attr("data-nume");

      if (!postId || !numeId || numeId === "trailer") return;

      streams.push({
        link: `https://hdmovie2.careers/wp-json/dooplayer/v2/${postId}/${numeId}`,
        type: "embed",
        quality: "auto",
        server: serverName,
      });
    });
  } catch (err) {
    console.error("HDMovie2 getStream error:", err);
  }

  return streams;
};

