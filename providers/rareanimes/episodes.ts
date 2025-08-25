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
  const { axios, cheerio, extractors, commonHeaders: headers } = providerContext;
  const { hubcloudExtracter } = extractors;

  try {
    const res = await axios.get(link, { headers, signal });
    const $ = cheerio.load(res.data);

    const streamLinks: { title: string; link: string; type: string; quality?: string }[] = [];

    // --- 1. Episodes
    $('a:contains("Episode"), a:contains("EPiSODE")').each((_, el) => {
      const epLink = $(el).attr("href");
      const epTitle = $(el).text().trim();
      if (!epLink) return;

      streamLinks.push({
        title: epTitle,
        link: epLink.startsWith("http") ? epLink : new URL(epLink, link).href,
        type: "episode",
      });
    });

    // --- 2. Movies / Quality links
    $('a')
      .filter((_, el) => /480|720|1080|2160|4K|mp4|m3u8/i.test($(el).text()))
      .each((_, el) => {
        const qLink = $(el).attr("href");
        if (!qLink) return;

        const quality = $(el).text().match(/\b(480p|720p|1080p|2160p|4K|mp4|m3u8)\b/i)?.[0] || "";

        streamLinks.push({
          title: $(el).text().trim() || "Movie",
          link: qLink.startsWith("http") ? qLink : new URL(qLink, link).href,
          type: "movie",
          quality,
        });
      });

    // --- 3. JS / HubCloud / encrypted streaming
    const scriptData = $("script")
      .map((i, el) => $(el).html())
      .get()
      .join(" ");

    const encryptedMatches = scriptData.match(/s\('o','(.+?)',180\)/);
    if (encryptedMatches?.[1]) {
      const decoded: any = decodeString(encryptedMatches[1]);
      const hubLink = decoded?.o ? atob(decoded.o) : null;

      if (hubLink) {
        const resolvedLinks = await hubcloudExtracter(hubLink, signal);
        streamLinks.push(...resolvedLinks.map((l: any) => ({ ...l, type: "movie" })));
      }
    }

    return streamLinks;
  } catch (err) {
    console.error("❌ RareAnimes stream fetch error:", err);
    return [];
  }
}

// --- Helpers ---
function decodeString(encryptedString: string): any {
  try {
    let decoded = atob(encryptedString);
    decoded = atob(decoded);
    decoded = rot13(decoded);
    decoded = atob(decoded);
    return JSON.parse(decoded);
  } catch (err) {
    console.error("Error decoding string:", err);
    return null;
  }
}

function rot13(str: string): string {
  return str.replace(/[a-zA-Z]/g, (char) => {
    const charCode = char.charCodeAt(0);
    const isUpper = char >= "A" && char <= "Z";
    const base = isUpper ? 65 : 97;
    return String.fromCharCode(((charCode - base + 13) % 26) + base);
  });
}

