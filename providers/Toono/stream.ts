// providers/rareanimes/stream.ts
import { ProviderContext, Stream } from "../types";

var headers = {
  Referer: "https://google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
};

// Proxy base URL — apun ka server jahan se stream pass karega
const PROXY_BASE = "http://localhost:3000/proxy?url=";

function getStream(options: {
  link: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  var link = options.link;
  var providerContext = options.providerContext;
  var signal = options.signal;
  var directLinks: Stream[] = [];
  var seen = new Set<string>();
  var axios = providerContext.axios;
  var cheerio = providerContext.cheerio;

  return new Promise(function (resolve, reject) {
    axios
      .get(link, { headers: headers, signal: signal })
      .then(function (res) {
        var $ = cheerio.load(res.data);

        // --- iframe streams ---
        $("iframe").each(function (_, el) {
          var src = $(el).attr("src");
          if (!src || seen.has(src)) return;
          if (!/^http/.test(src)) src = new URL(src, link).href;
          seen.add(src);
          directLinks.push({
            server: "RareAnimes Iframe",
            link: PROXY_BASE + encodeURIComponent(src),
            type: "episode",
            quality: "auto",
            headers: headers,
          });
        });

        // --- static mp4/m3u8 links ---
        $("a").each(function (_, el) {
          var href = $(el).attr("href");
          var text = $(el).text().trim();
          if (!href || seen.has(href)) return;

          if (!/^http/.test(href)) href = new URL(href, link).href;

          if (/\.(mp4|m3u8)$/i.test(href) || /(480|720|1080|2160|4K)p?/i.test(text)) {
            seen.add(href);
            directLinks.push({
              server: "RareAnimes Static",
              link: PROXY_BASE + encodeURIComponent(href),
              type: "episode",
              headers: headers,
            });
          }
        });

        if (!directLinks.length) return reject(new Error("No streams available"));
        resolve(directLinks);
      })
      .catch(function (err) {
        console.error("❌ RareAnimes stream fetch error:", err);
        resolve([]);
      });
  });
}

export { getStream };



