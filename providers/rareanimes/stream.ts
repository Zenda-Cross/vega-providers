import { ProviderContext } from "../types";

export async function getStream({
  link,
  signal,
  providerContext,
}: {
  link: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}) {
  const { axios, cheerio, commonHeaders: headers } = providerContext;

  try {
    // 1️⃣ Page fetch
    const res = await axios.get(link, { headers, signal });
    const $ = cheerio.load(res.data);

    const streamLinks: { title: string; link: string; type: string }[] = [];

    // 2️⃣ Direct quality links (480p/720p/1080p/2160p/4K/mp4/m3u8)
    $('a')
      .filter((_, el) => /480|720|1080|2160|4K|mp4|m3u8/i.test($(el).text()))
      .each((_, el) => {
        const qLink = $(el).attr("href");
        if (!qLink) return;
        streamLinks.push({
          title: $(el).text().trim() || "Movie",
          link: qLink.startsWith("http") ? qLink : new URL(qLink, link).href,
          type: "movie",
        });
      });

    // 3️⃣ Episodes links
    $('a:contains("Episode"), a:contains("EPiSODE")').each((_, el) => {
      const epLink = $(el).attr("href");
      if (!epLink) return;
      streamLinks.push({
        title: $(el).text().trim(),
        link: epLink.startsWith("http") ? epLink : new URL(epLink, link).href,
        type: "episode",
      });
    });

    // 4️⃣ JS encrypted streaming links
    const scripts = $("script")
      .map((i, el) => $(el).html())
      .get()
      .join(" ");

    const encryptedMatches = [...scripts.matchAll(/s\('o','([^']+)',180\)/g)];
    for (const m of encryptedMatches) {
      try {
        const decoded = decodeEncrypted(m[1]);
        if (decoded?.o) {
          streamLinks.push({
            title: "Stream",
            link: decoded.o.startsWith("http") ? decoded.o : new URL(decoded.o, link).href,
            type: "movie",
          });
        }
      } catch {}
    }

    // 5️⃣ Return all collected stream links
    return streamLinks;
  } catch (err) {
    console.error("❌ RareAnimes stream fetch error:", err);
    return [];
  }
}

// --- Helper: Decode RareAnimes encrypted JS strings
function decodeEncrypted(encryptedString: string) {
  try {
    let decoded: any = atob(encryptedString);
    decoded = atob(decoded);
    decoded = rot13(decoded);
    decoded = atob(decoded);
    return JSON.parse(decoded);
  } catch (err) {
    console.error("Error decoding stream:", err);
    return null;
  }
}

// --- Helper: ROT13 decoder
function rot13(str: string) {
  return str.replace(/[a-zA-Z]/g, (char) => {
    const charCode = char.charCodeAt(0);
    const isUpper = char >= "A" && char <= "Z";
    const base = isUpper ? 65 : 97;
    return String.fromCharCode(((charCode - base + 13) % 26) + base);
  });
}
