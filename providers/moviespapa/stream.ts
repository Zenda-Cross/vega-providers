import { Stream, ProviderContext } from "../types";

export const getStream = function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, cheerio } = providerContext;
  const streams: Stream[] = [];

  // Headers to mimic a real browser (prevents blocking during scraping)
  const commonHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Referer": link,
    "Origin": new URL(link).origin,
  };

  console.log("Processing:", link);

  // 1. First GET request to load the Uptobhai page
  return axios
    .get(link, { headers: commonHeaders })
    .then((res) => {
      const $ = cheerio.load(res.data);

      // ===========================
      // 🔓 BYPASS LOCK / CSRF
      // ===========================
      const csrfInput = $("input[name^='_csrf_token']");

      if (csrfInput.length > 0) {
        console.log("🔒 Locked page detected. Unlocking...");

        const name = csrfInput.attr("name");
        const value = csrfInput.attr("value");

        // Create Form Data manually
        const postBody = `${name}=${value}`;

        // POST request to unlock
        return axios
          .post(link, postBody, {
            headers: {
              ...commonHeaders,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          })
          .then((postRes) => postRes.data); // Return the unlocked HTML
      }

      // If no lock found, just return the original HTML
      return res.data;
    })
    .then((html) => {
      // ===========================
      // 🔍 LINK EXTRACTION
      // ===========================
      const $ = cheerio.load(html);

      // Try Selector First
      let extractedLinks = $("div.view-well a")
        .map((_, el) => $(el).attr("href"))
        .get()
        .filter((l) => l && l.startsWith("http"));

      // Fallback: Regex if selector fails
      if (extractedLinks.length === 0) {
        console.log("Using Regex fallback...");
        const regex = /href=["'](https?:\/\/[^"']+)["']/g;
        const matches = [...html.matchAll(regex)];
        extractedLinks = matches.map((m) => m[1]);
      }

      console.log(`Found ${extractedLinks.length} potential links`);

      // ===========================
      // ⚡ RESOLVE HOSTS
      // ===========================
      const tasks = extractedLinks.map((url) => {
        // --- 1. Luluvid Extraction (Added Headers) ---
        if (url.includes("luluvid") || url.includes("lulustream")) {
          return axios
            .get(url, { headers: commonHeaders })
            .then((luluRes) => {
              const luluHtml = luluRes.data;
              // Extract m3u8 using regex from JWPlayer config
              const match = luluHtml.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/);

              if (match && match[1]) {
                streams.push({
                  server: "Luluvid",
                  link: match[1],
                  type: "m3u8",
                  // 🚨 CRITICAL: Add headers so the player can access the stream
                  headers: {
                    "Referer": url,
                    "Origin": new URL(url).origin,
                    "User-Agent": commonHeaders["User-Agent"],
                  },
                });
              } else {
                // Fallback: push the original link if extraction fails
                streams.push({
                  server: "Luluvid",
                  link: url,
                  type: "mp4",
                });
              }
            })
            .catch((err) => console.log("Luluvid error:", err.message));
        }

        // --- 2. Strmup ---
        else if (url.includes("strmup.to") || url.includes("strmupcdn")) {
          const filecode = url.split("/").pop()?.replace(".html", "");
          if (filecode) {
            const apiUrl = `https://strmup.to/ajax/stream?filecode=${filecode}`;
            return axios
              .get(apiUrl, { headers: commonHeaders })
              .then((apiRes) => {
                const directUrl = apiRes.data?.streaming_url;
                if (directUrl) {
                  streams.push({
                    server: "Strmup",
                    link: directUrl,
                    type: "m3u8",
                  });
                }
              })
              .catch(() => {});
          }
        }

        // --- 3. Gofile ---
       

        // --- 4. PixelDrain ---
        else if (url.includes("pixeldrain.com")) {
          const direct = url.replace("/u/", "/api/file/");
          streams.push({ server: "Pixeldrain", link: direct, type: "mp4" });
        }

        // --- 5. Generic Fallbacks ---
      
        return Promise.resolve();
      });

      return Promise.all(tasks).then(() => streams);
    })
    .catch((err) => {
      console.error("getStream Error:", err.message);
      return [];
    });
};