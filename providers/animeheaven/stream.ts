import { Stream, ProviderContext } from "../types";

export function getStream(args: {
  link: string;
  type: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {

  var link = args.link;
  var providerContext = args.providerContext;
  var axios = providerContext.axios;

  var streams: Stream[] = [];

  // Extract 32-char id
  var match = link.match(/[?&]id=([a-f0-9]{32})|\/([a-f0-9]{32})/i);
  var id: string | null = null;

  if (match) {
    id = match[1] || match[2];
  }

  if (!id) {
    return Promise.resolve([]);
  }

  var gateUrl = "https://animeheaven.me/gate.php?id=" + id;

  return axios
    .get(gateUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 6.0; Nexus 5) AppleWebKit/537.36 Chrome/143 Mobile Safari/537.36",
        "Referer": "https://animeheaven.me/",
        "Cookie": "key=" + id,
      },
    })
    .then(function (res: any) {
      var html: string = res.data;

      var sourceRegex = /<source\s+src=['"]([^'"]+\.mp4[^'"]*)['"]/gi;
      var matchSrc: RegExpExecArray | null;

      while ((matchSrc = sourceRegex.exec(html)) !== null) {
        streams.push({
          server:
            matchSrc[1].indexOf("po.") !== -1
              ? "AnimeHeaven-PO"
              : "AnimeHeaven-CT",
          link: matchSrc[1],
          type: "mp4",
          subtitles: [],
        });
      }

      return streams;
    })
    .catch(function () {
      return [];
    });
}
