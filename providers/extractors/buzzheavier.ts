import type {AxiosInstance} from 'axios';
import {ProviderContext, Stream} from '../types';

/** The /download route is an HTMX endpoint, not a playable media URL. */
export async function buzzheavierExtractor(
  link: string,
  axios: AxiosInstance,
  ctx: ProviderContext,
): Promise<Stream | null> {
  try {
    const pageUrl = new URL(link);
    pageUrl.pathname = pageUrl.pathname.replace(/\/download\/?$/, '');
    const headers = {
      ...ctx.commonHeaders,
      Referer: pageUrl.origin + '/',
    };
    const page = await axios.get(pageUrl.href, {headers});
    const $ = ctx.cheerio.load(page.data);
    const path = $('a.download-btn').attr('hx-get');
    if (!path) return null;
    const cookies = page.headers?.['set-cookie'];
    const cookie = (Array.isArray(cookies) ? cookies : [cookies])
      .filter((value): value is string => typeof value === 'string' && !!value)
      .map((value: string) => value.split(';', 1)[0])
      .join('; ');
    const response = await axios.head(new URL(path, pageUrl).href, {
      headers: {
        ...headers,
        Referer: pageUrl.href,
        'HX-Request': 'true',
        'HX-Current-URL': pageUrl.href,
        ...(cookie ? {Cookie: cookie} : {}),
      },
      maxRedirects: 0,
      validateStatus: (status: number) => status >= 200 && status < 400,
    });
    const target = response.headers?.['hx-redirect'] || response.headers?.location;
    if (typeof target !== 'string' || !target) return null;
    const mediaUrl = new URL(target, pageUrl);
    if (!['https:', 'http:'].includes(mediaUrl.protocol)) return null;
    return {
      server: 'Buzzheavier (VegaDrive)',
      link: mediaUrl.href,
      type: 'mkv',
      headers: {...ctx.commonHeaders, Referer: pageUrl.href},
    };
  } catch (error: any) {
    console.warn('Buzzheavier extraction failed:', error?.message || 'request failed');
    return null;
  }
}
