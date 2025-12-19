import { Stream, ProviderContext } from "../types";

export const getStream = function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, cheerio, commonHeaders } = providerContext;

  // ---------------- EXTRACT EPISODE ID ----------------
  const epMatch = link.match(/[?&]ep=(\d+)/);
  const episodeId = epMatch ? epMatch[1] : null;

  if (!episodeId) return Promise.resolve([]);

  const serversUrl = `https://kaido.to/ajax/episode/servers?episodeId=${episodeId}`;

  // ---------------- STEP 1: GET SERVERS ----------------
  return axios
    .get(serversUrl, { headers: commonHeaders })
    .then((res: any) => {
      const data = res.data;
      if (!data || !data.html) return [];

      const $ = cheerio.load(data.html);
      const serverTasks: Promise<Stream[]>[] = [];

      $(".server-item").each((_, el) => {
        const item = $(el);
        const sourceId = item.attr("data-id");
        const type = item.attr("data-type"); // sub | dub

        if (!sourceId) return;

        serverTasks.push(
          resolveSource(sourceId, type || "sub", axios, commonHeaders)
        );
      });

      return Promise.all(serverTasks).then((all) =>
        all.flat().filter(Boolean)
      );
    })
    .catch(() => []);
};

// ---------------- RESOLVE SOURCE → M3U8 ----------------
function resolveSource(
  sourceId: string,
  type: string,
  axios: any,
  headers: any
): Promise<Stream[]> {
  const sourceUrl = `https://kaido.to/ajax/episode/sources?id=${sourceId}`;

  return axios
    .get(sourceUrl, { headers })
    .then((res: any) => {
      const data = res.data;
      if (!data || !data.link) return [];

      // extract rapid-cloud video id
      const match = data.link.match(/\/e-\d+\/([^?]+)/);
      const videoId = match ? match[1] : null;
      if (!videoId) return [];

      const rapidApi = `https://rapid-cloud.co/embed-2/v2/e-1/getSources?id=${videoId}`;

      return axios.get(rapidApi, { headers }).then((apiRes: any) => {
        const srcData = apiRes.data;
        if (!srcData) return [];

        const subtitles =
          Array.isArray(srcData.tracks)
            ? srcData.tracks
                .filter((t: any) => t.kind === "captions")
                .map((t: any) => ({
                  title: t.label || "English",
                  language: (t.label || "en").toLowerCase(),
                  type: "text/vtt",
                  uri: t.file,
                }))
            : [];

        const streams: Stream[] = [];

        if (Array.isArray(srcData.sources)) {
          srcData.sources.forEach((s: any) => {
            if (s.type === "hls" && s.file) {
              streams.push({
                server: type === "dub" ? "kaido-dub" : "kaido-sub",
                link: s.file,
                type: "m3u8",
                subtitles,
              });
            }
          });
        }

        return streams;
      });
    })
    .catch(() => []);
}
