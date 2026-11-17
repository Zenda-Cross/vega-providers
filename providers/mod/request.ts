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
    original = new Error('Moviesmod: Cloudflare verification required');
  } catch (error: any) {
    if (!challenged(error?.response)) throw error;
    original = error;
  }
  if (signal?.aborted) throw original;
  if (typeof context.openWebView !== 'function') throw new Error('Moviesmod: Cloudflare verification requires an app with WebView support');
  const result = await context.openWebView(url, {
    title: 'Verify access to Moviesmod', description: 'Complete the website verification to continue.',
    headers, waitForCookie: 'cf_clearance', force: false, timeoutMs: 120000,
  });
  if (signal?.aborted) throw new Error('Moviesmod: request cancelled');
  if (new URL(result.url || url).origin !== origin) throw new Error('Moviesmod: verification returned a different website');
  if (!result.cookies) throw new Error('Moviesmod: verification did not return cookies');
  const verified = {cookies: result.cookies, userAgent: result.userAgent || headers['User-Agent'] || ''};
  await context.kvStore?.set(cacheKey, verified);
  // A completed dialog can already contain the requested page.
  if (result.data && !challenged({data: result.data}) && new URL(result.url || url).pathname === new URL(url).pathname) {
    return {data: result.data, status: 200};
  }
  const response = await context.axios.get(url, {signal, headers: {...headers, Cookie: verified.cookies, ...(verified.userAgent ? {'User-Agent': verified.userAgent} : {})}});
  if (challenged(response)) throw new Error('Moviesmod: verification was not accepted; please retry');
  return response;
}
