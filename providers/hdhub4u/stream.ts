import { ProviderContext } from "./types";

// Helper functions for string manipulation
const encode = (value: string): string => btoa(value.toString());
const decode = (value: string): string => {
  if (value === undefined) {
    return "";
  }
  return atob(value.toString());
};

const pen = (value: string): string => {
  return value.replace(/[a-zA-Z]/g, (_0x1a470e) => {
    return String.fromCharCode(
      (_0x1a470e <= "Z" ? 90 : 122) >=
        ((_0x1a470e = _0x1a470e.charCodeAt(0) + 13)
        ? _0x1a470e
        : _0x1a470e - 26)
    );
  });
};

const rot13 = (str: string): string => {
  return str.replace(/[a-zA-Z]/g, (char) => {
    const charCode = char.charCodeAt(0);
    const isUpperCase = char <= "Z";
    const baseCharCode = isUpperCase ? 65 : 97;
    return String.fromCharCode(
      ((charCode - baseCharCode + 13) % 26) + baseCharCode
    );
  });
};

export function decodeString(encryptedString: string) {
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

const abortableTimeout = (ms: number, { signal }: { signal?: AbortSignal } = {}) => {
  return new Promise<void>((resolve, reject) => {
    if (signal && signal.aborted) {
      return reject(new Error("Aborted"));
    }
    const timer = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new Error("Aborted"));
      });
    }
  });
};

export async function getRedirectLinks(link: string, signal: AbortSignal, headers: any) {
  try {
    const res = await fetch(link, { headers, signal });
    const resText = await res.text();

    const regex = /ck\('_wp_http_\d+','([^']+)'/g;
    let combinedString = "";
    let match;
    while ((match = regex.exec(resText)) !== null) {
      combinedString += match[1];
    }

    const decodedString = decode(pen(decode(decode(combinedString))));
    const data = JSON.parse(decodedString);
    const token = encode(data?.data);
    const blogLink = data?.wp_http1 + "?re=" + token;

    const wait = abortableTimeout((Number(data?.total_time) + 3) * 1000, { signal });
    await wait;

    let vcloudLink = "Invalid Request";
    while (vcloudLink.includes("Invalid Request")) {
      const blogRes = await fetch(blogLink, { headers, signal });
      const blogResText = await blogRes.text();
      if (blogResText.includes("Invalid Request")) {
        console.log(blogResText);
      } else {
        const urlMatch = blogResText.match(/var reurl = "([^"]+)"/);
        vcloudLink = urlMatch ? urlMatch[1] : "";
        break;
      }
    }
    return blogLink || link;
  } catch (err) {
    console.error("Error in getRedirectLinks", err);
    return link;
  }
}

export async function getStream({ link, signal, providerContext }: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}) {
  const { hubcloudExtracter, commonHeaders: headers } = providerContext;
  let hubdriveLink = "";

  if (link.includes("hubdrive")) {
    const hubdriveRes = await fetch(link, { headers, signal });
    const hubdriveText = await hubdriveRes.text();
    const hubdriveMatch = hubdriveText.match(/<a[^>]+class="btn btn-primary[^>]+href="([^"]+)"/);
    hubdriveLink = hubdriveMatch ? hubdriveMatch[1] : link;
  } else {
    const res = await fetch(link, { headers, signal });
    const text = await res.text();
    const encryptedString = text.split("s('o','")?.[1]?.split("',180")?.[0];
    const decodedString: any = decodeString(encryptedString);
    link = atob(decodedString?.o);

    const redirectLink = await getRedirectLinks(link, signal, headers);
    const redirectLinkRes = await fetch(redirectLink, { headers, signal });
    const redirectLinkText = await redirectLinkRes.text();
    const hubdriveMatch = redirectLinkText.match(/href="(https:\/\/hubcloud\.[^\/]+\/drive\/[^"]+)"/);
    hubdriveLink = hubdriveMatch ? hubdriveMatch[1] : "";

    if (hubdriveLink.includes("hubdrive")) {
      const hubdriveRes = await fetch(hubdriveLink, { headers, signal });
      const hubdriveText = await hubdriveRes.text();
      const finalHubdriveMatch = hubdriveText.match(/<a[^>]+class="btn btn-primary[^>]+href="([^"]+)"/);
      hubdriveLink = finalHubdriveMatch ? finalHubdriveMatch[1] : hubdriveLink;
    }
  }

  const hubdriveLinkRes = await fetch(hubdriveLink, { headers, signal });
  const hubcloudText = await hubdriveLinkRes.text();
  const hubcloudMatch = hubcloudText.match(/<META HTTP-EQUIV="refresh" content="0; url=([^"]+)">/i);
  const hubcloudLink = hubcloudMatch ? hubcloudMatch[1] : hubdriveLink;

  try {
    return await hubcloudExtracter(hubcloudLink, signal);
  } catch (error: any) {
    console.log("hd hub 4 getStream error: ", error);
    return [];
  }
}
