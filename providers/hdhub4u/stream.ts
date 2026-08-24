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
      const t =
        $(el).text().toLowerCase() +
        $(el).parent().text().toLowerCase() +
        $(el).parent().parent().text().toLowerCase();

      let quality = "Unknown";
      if (t.includes("2160p") || t.includes("4k")) quality = "4k";
      else if (t.includes("1080p")) quality = "1080p";
      else if (t.includes("720p")) quality = "720p";
      else if (t.includes("480p")) quality = "480p";

      driveLinks.push({ quality, link: href });
    });

    const qualityOrder: Record<string, number> = {
      "4k": 4,
      "1080p": 3,
      "720p": 2,
      "480p": 1,
      Unknown: 0,
    };
    driveLinks.sort((a, b) => qualityOrder[b.quality] - qualityOrder[a.quality]);

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
