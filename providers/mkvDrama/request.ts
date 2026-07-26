import { getBaseUrl } from "../getBaseUrl";
import { ProviderContext } from "../types";

export const providerValue = "mkvDrama";

export const mkvDramaHeaders: Record<string, string> = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "max-age=0",
  Priority: "u=0, i",
  "Sec-CH-UA": '"Not;A=Brand";v="8", "Chromium";v="150", "Brave";v="150"',
  "Sec-CH-UA-Arch": '"x86"',
  "Sec-CH-UA-Bitness": '"64"',
  "Sec-CH-UA-Mobile": "?0",
  "Sec-CH-UA-Model": '""',
  "Sec-CH-UA-Platform": '"Windows"',
  "Sec-CH-UA-Platform-Version": '"19.0.0"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-User": "?1",
  "Sec-GPC": "1",
  "Upgrade-Insecure-Requests": "1",
  cookie:
    "ext_name=ojplmecpdpgccookcobabopnaifgidhf; _did=L-1Od04LpLDvj-KnwUZUCQ; LkpgcDuljxiVttMcsesion=eyJmZV9jc3JmX3Rva2VuIjogInpQZGROclRDenZqcXE4V1UzcEhGaUhkTkEwRG1tUE1ndDQ1SktEZHc3emMiLCAiZmVfY3NyZl90b2tlbl9jcmVhdGVkX2F0IjogIjIwMjYtMDctMjVUMDg6MjQ6MjMuNDI4ODcxKzAwOjAwIn0=.amRytw.EU34Y5Oet2q7RoiPiLmITOgD2lM; cf_clearance=w5GY0s9FeC3XEEvbulOW4KEhXq_S5Gf3tAy9Ld.hUrE-1784969771-1.2.1.1-8k59IPqk0ZcVP5GGxMMnD8VmX2.iasFQtuGTnUN57_tmdEHkdSzNjkcwTO5VajEgGTS6U4vHH2E0JXtZYnPFBPJGexxW4A6TdI2pIgpu_xmQ7b.ljrp8gv_bzti5ivuya3uM6ZH8t1TS5s8VYbZBKNSkZIilQLW7.36rnbc7BtBGV1FJibBQPe9U.7.St7Z5AIsCJTtGhrep8XukM_AET3dy4GyWSNk1fZMtF6rWzg0mKLl8khIL4eDXHaXbKhlmkCZtUry1DTyhCIs3P3LkzIU4DlEejA7qhYi8iehi0MaSlZwWjwbLwLgw2OMmmssShMy6Gr5aWcZnDsCPindcbOEx53ZlsZLTLmm_NTkcOQx6sByo84V4OH9ySfRC2fPpWBP3_iiIfV2Rwt4d8a.qkn54YeVGUMTxqDRLZtBi_uvWjtnditxtUv2cKREuggUztX0Yeq04mrcM0iL1fy5c5g",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
};

export type MkvDramaPage = {
  data: string;
  url: string;
  cookies?: string;
  userAgent?: string;
};

export function mergeMkvDramaCookies(
  current: string,
  setCookie: string[] | string | undefined,
): string {
  const cookies = new Map<string, string>();
  current
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => cookies.set(part.split("=", 1)[0], part));

  const values = Array.isArray(setCookie) ? setCookie : [setCookie];
  values.filter(Boolean).forEach((value) => {
    const cookie = String(value).split(";", 1)[0];
    cookies.set(cookie.split("=", 1)[0], cookie);
  });
  return [...cookies.values()].join("; ");
}

export async function getMkvDramaUrl(path: string): Promise<string> {
  const baseUrl = await getBaseUrl(providerValue);
  const url = new URL(path, `${baseUrl}/`);
  if (url.hostname !== new URL(baseUrl).hostname) {
    throw new Error(`Refusing non-MKVDrama WAF request: ${url.hostname}`);
  }
  return url.href;
}

export async function getMkvDramaPage(
  path: string,
  providerContext: ProviderContext,
): Promise<MkvDramaPage> {
  const url = await getMkvDramaUrl(path);
  const baseUrl = new URL(url).origin;
  const headers: Record<string, string> = {
    ...mkvDramaHeaders,
    Referer: baseUrl,
  };
  let forbiddenError: any;

  try {
    const response = await providerContext.axios.get(url, { headers });
    return {
      data: response.data || "",
      url,
      cookies: mergeMkvDramaCookies(
        mkvDramaHeaders.cookie || "",
        response.headers?.["set-cookie"],
      ),
    };
  } catch (error: any) {
    if (error.response?.status !== 403) throw error;
    forbiddenError = error;
  }

  if (typeof providerContext.openWebView !== "function") throw forbiddenError;

  const wafResult = await providerContext.openWebView(url, {
    title: "Open MKVDrama",
    description:
      "Complete the security check, wait for download links to load, then click done.",
    headers,
    waitForCookie: "cf_clearance",
    force: true,
    timeoutMs: 120000,
  });

  return {
    data: wafResult.data || "",
    url: wafResult.url || url,
    cookies: wafResult.cookies,
    userAgent: wafResult.userAgent,
  };
}

export function toProviderPath(link: string, baseUrl: string): string {
  const url = new URL(link, `${baseUrl}/`);
  return `${url.pathname}${url.search}${url.hash}`;
}
