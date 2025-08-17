import { ProviderContext } from "../types";

// Helper function to decode a string using a series of transformations
function rot13(str: string) {
  return str.replace(/[a-zA-Z]/g, (char) => {
    const charCode = char.charCodeAt(0);
    const isUpperCase = char <= "Z";
    const baseCharCode = isUpperCase ? 65 : 97;
    return String.fromCharCode(
      ((charCode - baseCharCode + 13) % 26) + baseCharCode
    );
  });
}

function decodeString(encryptedString: string) {
  try {
    let decoded = atob(encryptedString);
    decoded = atob(decoded);
    decoded = rot13(decoded);
    decoded = atob(decoded);
    return JSON.parse(decoded);
  } catch (error) {
    console.error("Error decoding string:", error);
    return null;
  }
}

// Function to get the redirect links. This is the main point of failure in the original code.
async function getRedirectLinks(link: string, headers: any) {
  try {
    const res = await fetch(link, { headers });
    const resText = await res.text();
    const regex = /ck\('_wp_http_\d+','([^']+)'/g;
    let combinedString = "";
    let match;
    while ((match = regex.exec(resText)) !== null) {
      combinedString += match[1];
    }

    const decodedString = atob(atob(rot13(atob(combinedString))));
    const data = JSON.parse(decodedString);
    const token = btoa(data?.data);
    const blogLink = `${data?.wp_http1}?re=${token}`;

    // The original code has a problematic while loop and timeout.
    // Instead, we can simply fetch the link and parse the final URL.
    // We can use a retry mechanism with a backoff strategy if needed,
    // but for a Cloudflare Worker, a single attempt with correct parsing is more efficient.
    const blogRes = await fetch(blogLink, { headers });
    const blogResText = await blogRes.text();
    const vcloudMatch = blogResText.match(/var reurl = "([^"]+)"/);

    return vcloudMatch ? vcloudMatch[1] : link;
  } catch (err) {
    console.log("Error in getRedirectLinks", err);
    return link;
  }
}

export async function getStream({
  link,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}) {
  const { axios, cheerio, extractors, commonHeaders: headers } = providerContext;
  const { hubcloudExtracter } = extractors;
  let hubdriveLink = "";

  // The original logic had a lot of duplication. This refactored version
  // streamlines the process by first determining the hubdriveLink
  // and then proceeding with the rest of the logic.
  try {
    if (link.includes("hubdrive")) {
      const hubdriveRes = await axios.get(link, { headers, signal });
      const $ = cheerio.load(hubdriveRes.data);
      hubdriveLink =
        $(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href") || link;
    } else {
      const res = await axios.get(link, { headers, signal });
      const text = res.data;
      const encryptedString = text.split("s('o','")?.[1]?.split("',180")?.[0];
      const decodedString: any = decodeString(encryptedString);
      const firstRedirectLink = atob(decodedString?.o);
      const redirectLink = await getRedirectLinks(firstRedirectLink, headers);
      const redirectLinkRes = await axios.get(redirectLink, { headers, signal });
      const $ = cheerio.load(redirectLinkRes.data);
      
      hubdriveLink =
        $('h3:contains("1080p")').find("a").attr("href") ||
        redirectLinkRes.data.match(
          /href="(https:\/\/hubcloud\.[^\/]+\/drive\/[^"]+)"/
        )?.[1] || "";

      if (hubdriveLink.includes("hubdrive")) {
        const hubdriveRes = await axios.get(hubdriveLink, { headers, signal });
        const $$ = cheerio.load(hubdriveRes.data);
        hubdriveLink =
          $$(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href") ||
          hubdriveLink;
      }
    }

    const hubdriveLinkRes = await axios.get(hubdriveLink, { headers, signal });
    const hubcloudText = hubdriveLinkRes.data;
    const hubcloudLink =
      hubcloudText.match(
        /<META HTTP-EQUIV="refresh" content="0; url=([^"]+)">/i
      )?.[1] || hubdriveLink;

    return await hubcloudExtracter(hubcloudLink, signal);
  } catch (error) {
    console.error("hd hub 4 getStream error:", error);
    return [];
  }
}
