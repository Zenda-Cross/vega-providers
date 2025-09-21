import { Stream, ProviderContext } from "../types";

export const getStream = async function ({
  link,
  type,
  providerContext,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    const { axios, cheerio } = providerContext;

    const res = await axios.get(link, {
      headers: {
        Referer: "https://google.com",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(res.data);
    const streams: { priority: number; stream: Stream }[] = [];

    const excludeServers = ["DropGalaxy", "DropGalaxy[Instant]", "Watch Online"];
    const excludeDomains = ["gofile.io", "mengaup", "vikingfile.com/f/6fdsb9d1tz"];

    const links = $("section[aria-label*='Download'] a[href]").toArray();

    for (const el of links) {
      const $el = $(el);
      let href = ($el.attr("href") || "").trim();
      let serverName = ($el.text() || "").trim() || "Direct";

      if (!href) continue;
      if (!href.startsWith("http")) href = new URL(href, link).href;
      if (excludeServers.some((s) => serverName.includes(s))) continue;
      if (excludeDomains.some((d) => href.includes(d))) continue;

      // ✅ V-Cloud conversion
      if (serverName.includes("V-Cloud")) {
        try {
          const encodedId = new URLSearchParams(new URL(href, link).search).get("id");
          if (encodedId) {
            const dlPage = await axios.get(`https://www.9xlinks.xyz/dl.php?id=${encodedId}`, {
              headers: { Referer: link, "User-Agent": "Mozilla/5.0" },
            });
            const $dl = cheerio.load(dlPage.data);

            $dl("div.mt-6 a[href]").each((_, a) => {
              const aEl = $dl(a);
              const realHref = aEl.attr("href")?.trim();
              const text = aEl.find("span").text().trim() || "Direct";

              if (realHref) {
                let priority = 3;
                if (text.toLowerCase().includes("direct")) {
                  priority = 1; // ✅ V-Cloud Direct sabse upar
                } else if (text.toLowerCase().includes("pixeldrain")) {
                  priority = 2; // Pixeldrain baad me
                }
                streams.push({
                  priority,
                  stream: { server: text, link: realHref, type: "file" },
                });
              }
            });

            continue; // skip default push
          }
        } catch (e) {
          console.error("V-Cloud conversion error:", e);
        }
      }

      // ✅ Default links
      const parentText = $el.parent().text() || "";
      const sizeMatch = parentText.match(/\[(.*?)\]/);
      const size = sizeMatch ? ` [${sizeMatch[1]}]` : "";

      let priority = 3;
      if (serverName.toLowerCase().includes("direct")) {
        priority = 2; // ✅ Direct (Instant) second
      }

      streams.push({
        priority,
        stream: { server: serverName + size, link: href, type: "file" },
      });
    }

    // ✅ Sort by priority: 1 → 2 → 3
    return streams.sort((a, b) => a.priority - b.priority).map((s) => s.stream);
  } catch (err) {
    console.error("getStream error:", err);
    return [];
  }
};
