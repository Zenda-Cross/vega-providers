import { getBaseUrl } from "../getBaseUrl";

let resolvedBaseUrl = "";

export async function getCinewoodBaseUrl(): Promise<string> {
  if (resolvedBaseUrl) return resolvedBaseUrl;
  try {
    let url = await getBaseUrl("1cinevood");
    if (!url || url.includes("cinevood.rocks")) {
      try {
        const res = await fetch(url || "https://cinevood.rocks", {
          method: "HEAD",
          redirect: "follow",
        });
        if (res.url) {
          resolvedBaseUrl = new URL(res.url).origin;
          return resolvedBaseUrl;
        }
      } catch {}
      resolvedBaseUrl = "https://new1.cinevood.cv";
      return resolvedBaseUrl;
    }
    resolvedBaseUrl = url.replace(/\/+$/, "");
    return resolvedBaseUrl;
  } catch {
    return "https://new1.cinevood.cv";
  }
}

export function isWafChallenge(html: string): boolean {
  if (!html || typeof html !== "string") return false;
  return (
    html.includes("<title>Just a moment...</title>") ||
    html.includes("challenges.cloudflare.com") ||
    html.includes("cf-mitigated") ||
    html.includes("cf-chl-widget") ||
    html.includes("Attention Required! | Cloudflare")
  );
}

export async function getWithWAF(
  url: string,
  axios: any,
  openWebView: any,
  headers: any,
): Promise<any> {
  const baseUrl = url.split("/").slice(0, 3).join("/");
  try {
    return await axios.get(url, { headers: { ...headers, Referer: baseUrl } });
  } catch (error: any) {
    if (error.response?.status === 403 && openWebView) {
      console.log(`WAF detected (403) for ${url}, using solver...`);
      const wafResult = await openWebView(url, {
        title: "Solve the captcha below and click done",
        description: "Required to bypass anti-bot protection.",
        headers: { ...headers, Referer: baseUrl },
        waitForCookie: "cf_clearance",
      });

      if (
        wafResult.data &&
        !isWafChallenge(wafResult.data) &&
        wafResult.data.trim().length > 50
      ) {
        return { data: wafResult.data };
      }

      const targetUrl = wafResult.url || url;
      const targetBaseUrl = targetUrl.split("/").slice(0, 3).join("/");
      return await axios.get(targetUrl, {
        headers: {
          ...headers,
          Referer: targetBaseUrl,
          "User-Agent": wafResult.userAgent || headers["User-Agent"],
          Cookie: wafResult.cookies || wafResult.cookie,
        },
      });
    }
    throw error;
  }
}
