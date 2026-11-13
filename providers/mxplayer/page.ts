import { ProviderContext } from '../types';
export const MAIN_URL = 'https://www.mxplayer.in';
export const API_URL = 'https://api.mxplayer.in/v1/web';
export const headers = (context: ProviderContext) => ({...context.commonHeaders, Referer: MAIN_URL + '/', Origin: MAIN_URL});
export const imageUrl = (value?: string): string => !value ? '' : /^https?:\/\//i.test(value) ? value : value.startsWith('//') ? 'https:' + value : 'https://qqcdnpictest.mxplay.com/' + value.replace(/^\/+/, '');
export function pageUrl(link: string): string {
  const url = new URL(link, MAIN_URL);
  if (!/^https?:$/.test(url.protocol) || !/(^|\.)mxplayer\.in$/i.test(url.hostname)) throw new Error('MXPlayer: invalid title URL');
  return url.href;
}
export function contentId(link: string): string {
  const path = new URL(pageUrl(link)).pathname;
  return path.match(/([a-f\d]{32})(?:\/)?$/i)?.[1] || path.match(/\/detail\/(?:movie|episode|tvshow|show)\/([^/]+)/i)?.[1] || '';
}
// Read just the JSON assignment: leading whitespace and subsequent scripts are common.
// Never execute page JavaScript in the provider sandbox.
export function parseState(script: string): any {
  const assignment = /window\.__mxs__\s*=\s*/g.exec(script);
  if (!assignment) return undefined;
  const start = assignment.index + assignment[0].length;
  if (script[start] !== '{') return undefined;
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < script.length; i++) {
    const char = script[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) {
      try { return JSON.parse(script.slice(start, i + 1)); } catch { return undefined; }
    }
  }
}
export function entitiesOf(state: any): any[] {
  const found: any[] = [];
  const visit = (value: any, depth: number, key?: string) => {
    if (!value || typeof value !== 'object' || depth > 5) return;
    if (!Array.isArray(value) && (value.title || value.name) && (value.id || key)) found.push({...value, id: value.id || key});
    for (const [key, child] of Object.entries(value)) if (child && typeof child === 'object') visit(child, depth + 1, key);
  };
  visit(state?.entities, 0);
  return found;
}
export async function loadPage(link: string, context: ProviderContext, signal?: AbortSignal) {
  const url = pageUrl(link);
  const response = await context.axios.get(url, {headers: headers(context), signal, timeout: 20000});
  const html = String(response.data);
  if (/not available in your (?:region|country)|access denied|request could not be satisfied/i.test(html)) throw new Error('MXPlayer: access blocked or unavailable in your region');
  const $ = context.cheerio.load(html);
  const entities: any[] = [];
  $('script').each((_, element) => entities.push(...entitiesOf(parseState($(element).html() || ''))));
  const id = contentId(url);
  const entity = entities.find(item => String(item.id).toLowerCase() === id.toLowerCase()) || (entities.length === 1 ? entities[0] : undefined);
  return {$, entity, entities, url};
}
export async function videoDetail(link: string, context: ProviderContext, signal?: AbortSignal): Promise<any> {
  const id = contentId(link);
  if (!id) throw new Error('MXPlayer: could not identify this title');
  const type = /\/episode\//.test(link) ? 'episode' : 'movie';
  const response = await context.axios.get(`${API_URL}/detail/video?type=${type}&id=${encodeURIComponent(id)}&platform=com.mxplay.desktop&content-languages=hi,en&kids-mode-enabled=false`, {headers: headers(context), signal, timeout: 20000});
  const item = response.data?.data || response.data;
  if (!item?.title) throw new Error('MXPlayer: title metadata unavailable');
  return item;
}
