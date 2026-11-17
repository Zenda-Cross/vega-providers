import { ProviderContext } from '../types';

function challenged(response: any): boolean {
  const data = typeof response?.data === 'string' ? response.data : '';
  return /<title>\s*(?:Just a moment|Attention Required)[^<]*<\/title>|<form[^>]+id=["\']challenge-form["\']|id=["\']cf-challenge-running["\']/i.test(data) || response?.headers?.['cf-mitigated'] === 'challenge';
}
export async function getPage(url: string, context: ProviderContext, signal?: AbortSignal, extraHeaders: Record<string, string> = {}): Promise<any> {
  const origin = new URL(url).origin;
  const cacheKey = 'cloudflare:' + origin;
  const session = await context.kvStore?.get<{cookies: string; userAgent: string}>(cacheKey);
  const headers = {...context.commonHeaders, Referer: origin + '/', ...extraHeaders, ...(session?.cookies ? {Cookie: session.cookies} : {}), ...(session?.userAgent ? {'User-Agent': session.userAgent} : {})};
  let original: any;
  try {
    const response = await context.axios.get(url, {signal, headers});
    if (!challenged(response)) return response;
    original = new Error('Zeefliz: Cloudflare verification required');
  } catch (error: any) {
    const forbiddenSession = error?.response?.status === 403 && (
      /(?:^|;\s*)cf_clearance=/.test(session?.cookies || '') ||
      /(?:^|\.)zeefliz[0-9]*\.[a-z.]+$/i.test(new URL(url).hostname)
    );
    if (!challenged(error?.response) && !forbiddenSession) throw error;
    original = error;
  }
  if (signal?.aborted) throw original;
  if (typeof context.openWebView !== 'function') throw new Error('Zeefliz: Cloudflare verification requires an app with WebView support');
  // The request has already rejected the saved clearance. Do not let the
  // WebView resolver's cookie shortcut reuse it, including after an IP change.
  await context.kvStore?.delete(cacheKey);
  const verificationHeaders = Object.fromEntries(Object.entries(headers).filter(([name]) => name.toLowerCase() !== 'cookie'));
  const result = await context.openWebView(url, {
    title: 'Verify access to Zeefliz', description: 'Complete the website verification to continue.',
    headers: verificationHeaders, waitForCookie: 'cf_clearance', force: true, timeoutMs: 120000,
  });
  if (signal?.aborted) throw new Error('Zeefliz: request cancelled');
  if (new URL(result.url || url).origin !== origin) throw new Error('Zeefliz: verification returned a different website');
  const rendered = !!result.data && !challenged({data: result.data});
  if (!result.cookies && !rendered) throw new Error('Zeefliz: verification did not return cookies or a usable page');
  const verified = {cookies: result.cookies, userAgent: result.userAgent || headers['User-Agent'] || ''};
  await context.kvStore?.set(cacheKey, verified);
  // A completed dialog can already contain the requested page.
  if (rendered) {
    return {data: result.data, status: 200, url: result.url || url};
  }
  const response = await context.axios.get(url, {signal, headers: {...headers, Cookie: verified.cookies, ...(verified.userAgent ? {'User-Agent': verified.userAgent} : {})}});
  if (challenged(response)) throw new Error('Zeefliz: verification was not accepted; please retry');
  return response;
}
