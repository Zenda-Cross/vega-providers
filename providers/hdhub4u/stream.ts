// Corrected stream.ts for Cloudflare Workers

import { ProviderContext } from "../types";

// Helper functions (kept from original, but simplified where possible)
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
    
    // The original while loop is replaced with a single, reliable fetch.
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
  const { extractors, commonHeaders: headers } = providerContext;
  const { hubcloudExtracter } = extractors;
  let hubdriveLink = "";

  try {
    if (link.includes("hubdrive")) {
      const hubdriveRes = await fetch(link, { headers, signal });
      const hubdriveText = await hubdriveRes.text();
      // Use HTMLRewriter to find the link
      const links: string[] = [];
      new HTMLRewriter()
        .on('a.btn.btn-primary.btn-user.btn-success1.m-1', {
          element(element) {
            const href = element.getAttribute('href');
            if (href) links.push(href);
          }
        })
        .transform(new Response(hubdriveText));
      
      hubdriveLink = links[0] || link;

    } else {
      const res = await fetch(link, { headers, signal });
      const text = await res.text();
      const encryptedString = text.split("s('o','")?.[1]?.split("',180")?.[0];
      const decodedString: any = decodeString(encryptedString);
      const firstRedirectLink = atob(decodedString?.o);
      const redirectLink = await getRedirectLinks(firstRedirectLink, headers);

      const redirectLinkRes = await fetch(redirectLink, { headers, signal });
      const redirectLinkText = await redirectLinkRes.text();
      
      const hubdriveLinks: string[] = [];
      new HTMLRewriter()
        .on('h3:contains("1080p") a', {
          element(element) {
            const href = element.getAttribute('href');
            if (href) hubdriveLinks.push(href);
          }
        })
        .on('a[href*="hubcloud"]', {
          element(element) {
            const href = element.getAttribute('href');
            if (href && href.includes('hubdrive')) {
              hubdriveLinks.push(href);
            }
          }
        })
        .transform(new Response(redirectLinkText));
      
      hubdriveLink = hubdriveLinks[0] || "";

      if (hubdriveLink.includes("hubdrive")) {
        const hubdriveRes = await fetch(hubdriveLink, { headers, signal });
        const hubdriveText = await hubdriveRes.text();
        const finalLinks: string[] = [];
        new HTMLRewriter()
          .on('a.btn.btn-primary.btn-user.btn-success1.m-1', {
            element(element) {
              const href = element.getAttribute('href');
              if (href) finalLinks.push(href);
            }
          })
          .transform(new Response(hubdriveText));
        hubdriveLink = finalLinks[0] || hubdriveLink;
      }
    }

    const hubdriveLinkRes = await fetch(hubdriveLink, { headers, signal });
    const hubcloudText = await hubdriveLinkRes.text();
    const hubcloudLink =
      hubcloudText.match(/<META HTTP-EQUIV="refresh" content="0; url=([^"]+)">/i)?.[1] || hubdriveLink;

    return await hubcloudExtracter(hubcloudLink, signal);
  } catch (error: any) {
    console.error("hd hub 4 getStream error: ", error);
    return [];
  }
}
