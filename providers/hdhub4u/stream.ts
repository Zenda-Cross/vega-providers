import { ProviderContext } from "../types";
import { hubcloudExtractor } from "../extractors/hubcloud";
import { throwProviderError } from "../providerErrors";

function rot13(str: string) {
  return str.replace(/[a-zA-Z]/g, function (char) {
    const charCode = char.charCodeAt(0);
    const isUpperCase = char <= "Z";
    const baseCharCode = isUpperCase ? 65 : 97;
    return String.fromCharCode(
      ((charCode - baseCharCode + 13) % 26) + baseCharCode,
    );
  });
}

const safeAtob = (str: string) => {
  try {
    return atob(str);
  } catch (e) {
    return null;
  }
};

export function decodeString(encryptedString: string) {
  if (!encryptedString) return null;
  try {
    // First base64 decode
    let decoded = atob(encryptedString);
    // Second base64 decode
    decoded = atob(decoded);
    // ROT13 decode
    decoded = rot13(decoded);
    // Third base64 decode
    decoded = atob(decoded);
    // Parse JSON
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

export async function getStream({
  link,
  type,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}) {
  const { axios, cheerio, commonHeaders: headers } = providerContext;
  let hubdriveLink = "";

  if (link.includes("hubcloud") || link.includes("/drive/")) {
    return await hubcloudExtractor(
      link,
      signal,
      axios,
      cheerio,
      headers,
      providerContext,
      isDownload,
      "hdhub4u",
    );
  }

  if (link.includes("hubdrive")) {
    const hubdriveRes = await axios.get(link, { headers, signal });
    const hubdriveText = hubdriveRes.data;
    const $ = cheerio.load(hubdriveText);
    hubdriveLink =
      $(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href") || link;
  } else {
    let currentLink = link;
    let text = "";
    try {
      const res = await axios.get(currentLink, { headers, signal });
      text = res.data || "";

      // Check for reurl in script
      const reurlMatch = text.match(/var\s+reurl\s*=\s*["']([^"']+)["']/i);
      if (reurlMatch) {
        currentLink = reurlMatch[1];
        const res2 = await axios.get(currentLink, {
          headers: { ...headers, Referer: link },
          signal,
        });
        text = res2.data || "";
      }

      // Check for s('o', '...')
      const encryptedString = text.split("s('o','")?.[1]?.split("',180")?.[0];
      if (encryptedString) {
        const decoded = decodeString(encryptedString);
        if (decoded?.o) {
          const nextUrl = safeAtob(decoded.o);
          if (nextUrl) {
            currentLink = nextUrl;
            const res3 = await axios.get(currentLink, {
              headers: { ...headers, Referer: currentLink },
              signal,
            });
            text = res3.data || "";
          }
        }
      }
    } catch {
      // fallback to original parsing
    }

    const $ = cheerio.load(text);
    const directR2 = $('a[href*="r2.dev"]').attr("href");
    if (directR2) {
      return [
        {
          server: "HubCDN",
          link: directR2,
          type: "mkv",
        },
      ];
    }

    const driveLinks: { quality: string; link: string }[] = [];
    $('a[href*="hubcloud"][href*="/drive/"], a[href*="hubdrive"]').each((i, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      // Stop at the nearest labelled row; wider containers include other qualities.
      let quality = "Unknown";
      let row = $(el);
      for (let depth = 0; depth < 4 && row.length; depth++, row = row.parent()) {
        const text = row.text();
        const matches = [...text.matchAll(/\b(2160|1080|720|480|360)p\b|\b4k\b/gi)];
        const values = [...new Set(matches.map(m => /4k|2160/i.test(m[0]) ? "4k" : m[1] + "p"))];
        if (values.length === 1) { quality = values[0]; break; }
        if (values.length > 1) break;
      }

      driveLinks.push({ quality, link: href });
    });

    const qualityValue = (q: string) => q === "4k" ? 2160 : Number(q.replace("p", "")) || 0;
    const saved = await providerContext.kvStore?.get<string[]>("hdhub4u_preferredQualities");
    const preferences = (Array.isArray(saved) ? saved : ["1080"])
      .map(q => qualityValue(String(q))).filter(q => q > 0);
    if (!preferences.length) preferences.push(1080);
    const known = driveLinks.filter(d => qualityValue(d.quality));
    let selected = known.filter(d => preferences.includes(qualityValue(d.quality)));
    if (!selected.length && known.length) {
      const distance = (d: {quality: string}) => Math.min(...preferences.map(q => Math.abs(q - qualityValue(d.quality))));
      known.sort((a,b) => distance(a) - distance(b) || qualityValue(b.quality) - qualityValue(a.quality));
      selected = known.filter(d => d.quality === known[0].quality);
    }
    if (!selected.length && driveLinks.length) selected = [driveLinks[0]];
    selected.sort((a,b) => qualityValue(b.quality) - qualityValue(a.quality));
    // HubDrive and HubCloud buttons in one row are mirrors of the same file.
    const unique = selected.filter((item, i, all) => all.findIndex(d => d.quality === item.quality) === i);
    if (unique.length) {
      const streams = [];
      for (const item of unique) {
        try {
          const resolved = await getStream({link: item.link, type, signal, providerContext, isDownload});
          streams.push(...resolved.map(stream => ({...stream, quality: stream.quality || String(qualityValue(item.quality)), server: item.quality + " · " + stream.server})));
        } catch (error) {
          if (signal?.aborted) throw error;
          if (unique.length === 1) throw error;
        }
      }
      if (streams.length) return streams;
      throw new Error("Could not resolve the selected HDHub4u qualities. Please retry.");
    }

    hubdriveLink =
      driveLinks[0]?.link ||
      text.match(/href="(https:\/\/hubcloud\.[^\/]+\/drive\/[^"]+)"/)?.[1] ||
      "";

    if (
      !hubdriveLink &&
      (currentLink.includes("hubcloud") || currentLink.includes("hubdrive"))
    ) {
      hubdriveLink = currentLink;
    }

    if (hubdriveLink.includes("hubdrive")) {
      const hubdriveRes = await axios.get(hubdriveLink, { headers, signal });
      const hubdriveText = hubdriveRes.data;
      const $$ = cheerio.load(hubdriveText);
      hubdriveLink =
        $$(".btn.btn-primary.btn-user.btn-success1").attr("href") || "";
    }
  }

  let hubcloudLink = hubdriveLink;
  try {
    if (hubdriveLink) {
      const hubdriveLinkRes = await axios.get(hubdriveLink, { headers, signal });
      const hubcloudText = hubdriveLinkRes.data;
      hubcloudLink =
        hubcloudText.match(
          /<META HTTP-EQUIV="refresh" content="0; url=([^"]+)">/i,
        )?.[1] || hubdriveLink;
    }
  } catch (error: any) {
    // ignore
  }

  try {
    return await hubcloudExtractor(
      hubcloudLink,
      signal,
      axios,
      cheerio,
      headers,
      providerContext,
      isDownload,
      "hdhub4u",
    );
  } catch (error: any) {
    throwProviderError("HDHub4u", "stream", error);
  }
}
