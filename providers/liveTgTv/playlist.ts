import { ProviderContext, StreamDrm } from '../types';

export const website = 'https://livetgtv.lovable.app';
export const channelsUrl = website + '/api/public/channels';
export const channelDetailUrl = (id: string) => website + '/api/public/channels/' + encodeURIComponent(id);
export const playlistUrl = website + '/api/public/playlist.m3u';
const prefix = 'livetgtv://channel/';
export interface Channel { id: string; title: string; image: string; groups: string[] }
export interface Source { channel: Channel; group: string; url: string; headers: Record<string, string>; properties: Record<string, string> }
export const channelLink = (id: string) => prefix + encodeURIComponent(id);
export function channelId(link: string): string {
  if (!link.startsWith(prefix)) throw new Error('LiveTG TV: invalid channel link');
  return decodeURIComponent(link.slice(prefix.length));
}
function header(headers: Record<string, string>, name: string, value: string) {
  const aliases = {cookie: 'Cookie', origin: 'Origin', referer: 'Referer', referrer: 'Referer', 'user-agent': 'User-Agent'};
  const key = aliases[name.toLowerCase()] || name;
  if (!key || /[\r\n]/.test(key + value)) return;
  const old = Object.keys(headers).find(k => k.toLowerCase() === key.toLowerCase());
  if (old) delete headers[old];
  headers[key] = value;
}
function normalizeImage(image: unknown): string {
  if (typeof image !== 'string') return '';
  const trimmed = image.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith('/') ? website + trimmed : '';
}
function decodeText(data: unknown): string {
  if (typeof data === 'string') return data;
  const bytes = ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(data as ArrayBuffer);
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 8192))));
  return decodeURIComponent(escape(chunks.join('')));
}
function parseJson(data: unknown): unknown {
  if (data && typeof data === 'object' && !ArrayBuffer.isView(data) && !(data instanceof ArrayBuffer)) return data;
  return JSON.parse(decodeText(data));
}
async function requestBuffer(url: string, providerContext: ProviderContext, signal?: AbortSignal): Promise<unknown> {
  const {data} = await providerContext.axios.get(url + (url.includes('?') ? '&' : '?') + '_vega_refresh=' + Date.now(), {
    signal, timeout: 30000, responseType: 'arraybuffer',
    headers: {...providerContext.commonHeaders, 'Cache-Control': 'no-cache', Pragma: 'no-cache'},
  });
  return data;
}
function buildSourceUrl(rawUrl: string, headers: Record<string, string>): string {
  const pipe = rawUrl.indexOf('|');
  const url = pipe < 0 ? rawUrl : rawUrl.slice(0, pipe);
  if (pipe >= 0) new URLSearchParams(rawUrl.slice(pipe + 1)).forEach((value, key) => header(headers, key, value));
  // Signed manifest query parameters are not inherited by relative DASH segments.
  // Jio accepts the same media token as a cookie, which the player forwards
  // to manifest and segment requests without rewriting the MPD.
  const signed = url.match(/^https?:\/\/([^/?#]+)[^?#]*\?([^#]*)/i);
  if (signed && /(?:^|\.)cdn\.jio\.com$/i.test(signed[1])) {
    const token = new URLSearchParams(signed[2]).get('__hdnea__');
    if (token) {
      const cookieName = Object.keys(headers).find(key => key.toLowerCase() === 'cookie');
      const cookies = cookieName ? headers[cookieName] : '';
      if (!/(?:^|;\s*)__hdnea__=/.test(cookies)) header(headers, 'Cookie', (cookies ? cookies + '; ' : '') + '__hdnea__=' + token);
    }
  }
  return url;
}
function applyDrmProperties(drm: unknown, properties: Record<string, string>) {
  if (drm == null) return;
  if (typeof drm !== 'object') {
    properties['inputstream.adaptive.license_type'] = 'invalid';
    return;
  }
  const value = drm as {type?: unknown; keyId?: unknown; key?: unknown; clearKeys?: unknown};
  const kind = typeof value.type === 'string' ? value.type.trim() : '';
  properties['inputstream.adaptive.license_type'] = kind || 'invalid';
  if (value.clearKeys && typeof value.clearKeys === 'object' && !Array.isArray(value.clearKeys)) {
    properties['inputstream.adaptive.license_key'] = Object.entries(value.clearKeys as Record<string, unknown>)
      .map(([k, v]) => `${String(k)}:${String(v)}`)
      .join(',');
  } else if (value.keyId !== undefined || value.key !== undefined) {
    properties['inputstream.adaptive.license_key'] = `${String(value.keyId ?? '')}:${String(value.key ?? '')}`;
  } else {
    properties['inputstream.adaptive.license_key'] = '';
  }
}
export function parseChannelsApi(data: unknown): Channel[] {
  const payload = parseJson(data) as {channels?: unknown[]} | null;
  if (!payload || !Array.isArray(payload.channels)) throw new Error('LiveTG TV: invalid channels response');
  const map = new Map<string, Channel>();
  for (const item of payload.channels) {
    if (!item || typeof item !== 'object') continue;
    const record = item as {id?: unknown; name?: unknown; category?: unknown; logo?: unknown};
    const rawId = typeof record.id === 'string' || typeof record.id === 'number' ? String(record.id).trim() : '';
    const title = typeof record.name === 'string' ? record.name.trim() : '';
    if (!rawId || !title) continue;
    const group = (typeof record.category === 'string' ? record.category.trim() : '') || 'Other';
    const image = normalizeImage(record.logo);
    const id = rawId + ':' + title.toLowerCase().replace(/\s+/g, ' ').trim();
    const existing = map.get(id);
    if (existing) {
      if (!existing.groups.includes(group)) existing.groups.push(group);
      if (!existing.image && image) existing.image = image;
    } else map.set(id, {id, title, image, groups: [group]});
  }
  if (!map.size) throw new Error('LiveTG TV: channels response contains no channels');
  return Array.from(map.values());
}
export function parseChannelDetail(id: string, data: unknown): Source[] {
  const payload = parseJson(data) as {name?: unknown; category?: unknown; logo?: unknown; sources?: unknown[]; drm?: unknown; headers?: unknown} | null;
  if (!payload || !Array.isArray(payload.sources)) throw new Error('LiveTG TV: invalid channel detail response');
  const colon = id.indexOf(':');
  const fallbackTitle = colon >= 0 ? id.slice(colon + 1) : id;
  const title = typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : fallbackTitle;
  const group = (typeof payload.category === 'string' && payload.category.trim()) || 'Live TV';
  const image = normalizeImage(payload.logo);
  const channel: Channel = {id, title, image, groups: [group]};
  const baseHeaders: Record<string, string> = {};
  if (payload.headers && typeof payload.headers === 'object') {
    for (const [k, v] of Object.entries(payload.headers as Record<string, unknown>)) if (typeof v === 'string') header(baseHeaders, k, v);
  }
  const baseProperties: Record<string, string> = {};
  applyDrmProperties(payload.drm, baseProperties);
  const sources: Source[] = [];
  for (const item of payload.sources) {
    let rawUrl = '';
    const headers = {...baseHeaders};
    const properties = {...baseProperties};
    if (typeof item === 'string') rawUrl = item.trim();
    else if (item && typeof item === 'object') {
      const entry = item as {url?: unknown; headers?: unknown; drm?: unknown};
      if (typeof entry.url === 'string') rawUrl = entry.url.trim();
      if (entry.headers && typeof entry.headers === 'object') {
        for (const [k, v] of Object.entries(entry.headers as Record<string, unknown>)) if (typeof v === 'string') header(headers, k, v);
      }
      if ('drm' in entry) {
        delete properties['inputstream.adaptive.license_type'];
        delete properties['inputstream.adaptive.license_key'];
        applyDrmProperties(entry.drm, properties);
      }
    }
    if (!/^https?:\/\//i.test(rawUrl)) continue;
    sources.push({channel, group, url: buildSourceUrl(rawUrl, headers), headers, properties});
  }
  return sources;
}
export function parsePlaylist(text: string): Source[] {
  if (!text.replace(/^\uFEFF/, '').trimStart().startsWith('#EXTM3U')) throw new Error('LiveTG TV: invalid playlist response');
  const sources: Source[] = [];
  let entry: Source | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('#EXTINF:')) {
      const attrs: Record<string, string> = {};
      const re = /([\w-]+)="([^"]*)"/g;
      let match;
      while ((match = re.exec(line))) attrs[match[1]] = match[2];
      let quoted = false, comma = -1;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') quoted = !quoted;
        if (line[i] === ',' && !quoted) { comma = i; break; }
      }
      const title = (comma >= 0 ? line.slice(comma + 1).trim() : '') || attrs['tvg-name'];
      if (!title) { entry = undefined; continue; }
      const group = attrs['group-title'] || 'Other';
      const id = (attrs['tvg-id'] || '') + ':' + title.toLowerCase().replace(/\s+/g, ' ').trim();
      entry = { channel: {id, title, image: attrs['tvg-logo'] || '', groups: [group]}, group, url: '', headers: {}, properties: {} };
    } else if (entry && line.startsWith('#KODIPROP:')) {
      const value = line.slice(10), equal = value.indexOf('=');
      if (equal >= 0) entry.properties[value.slice(0, equal)] = value.slice(equal + 1);
    } else if (entry && line.startsWith('#EXTHTTP:')) {
      try {
        const values = JSON.parse(line.slice(9));
        for (const [key, value] of Object.entries(values)) if (typeof value === 'string') header(entry.headers, key, value);
      } catch { /* A malformed optional header directive must not discard the channel. */ }
    } else if (entry && line.startsWith('#EXTVLCOPT:')) {
      const value = line.slice(11), equal = value.indexOf('=');
      const key = value.slice(0, equal), content = value.slice(equal + 1);
      if (key === 'http-extra-headers') {
        for (const item of content.split(/\\r\\n|\\n/)) {
          const colon = item.indexOf(':');
          if (colon > 0) header(entry.headers, item.slice(0, colon).trim(), item.slice(colon + 1).trim());
        }
      } else if (['http-user-agent', 'http-referrer', 'http-cookie'].includes(key)) header(entry.headers, key.slice(5), content);
    } else if (entry && /^https?:\/\//i.test(line)) {
      entry.url = buildSourceUrl(line, entry.headers);
      sources.push(entry);
      entry = undefined;
    }
  }
  if (!sources.length) throw new Error('LiveTG TV: playlist contains no channels');
  return sources;
}
export async function loadSources(providerContext: ProviderContext, signal?: AbortSignal): Promise<Source[]> {
  return parsePlaylist(decodeText(await requestBuffer(playlistUrl, providerContext, signal)));
}
export async function loadChannelSources(id: string, providerContext: ProviderContext, signal?: AbortSignal): Promise<Source[]> {
  const colon = id.indexOf(':');
  const apiId = (colon >= 0 ? id.slice(0, colon) : id).trim();
  let detailError: unknown;
  let missingFromDetail = false;
  if (apiId) {
    try {
      const sources = parseChannelDetail(id, await requestBuffer(channelDetailUrl(apiId), providerContext, signal));
      if (sources.length) return sources;
      missingFromDetail = true;
    } catch (err) {
      const status = err && typeof err === 'object' && 'response' in err ? (err as {response?: {status?: number}}).response?.status : undefined;
      if (status === 404) missingFromDetail = true;
      detailError = err;
    }
  }
  try {
    const matched = (await loadSources(providerContext, signal)).filter(item => item.channel.id === id);
    if (matched.length) return matched;
    throw new Error('LiveTG TV: channel is no longer available');
  } catch (err) {
    if (missingFromDetail) throw new Error('LiveTG TV: channel is no longer available');
    throw detailError || err;
  }
}
export async function channels(providerContext: ProviderContext, signal?: AbortSignal): Promise<Channel[]> {
  const cached = await providerContext.kvStore?.get<{time: number; channels: Channel[]}>('channelMetadataV1');
  if (cached && Date.now() - cached.time < 300000) return cached.channels;
  let result: Channel[];
  try {
    result = parseChannelsApi(await requestBuffer(channelsUrl, providerContext, signal));
  } catch (apiError) {
    try {
      const map = new Map<string, Channel>();
      for (const source of await loadSources(providerContext, signal)) {
        const existing = map.get(source.channel.id);
        if (existing) {
          if (!existing.groups.includes(source.group)) existing.groups.push(source.group);
          if (!existing.image) existing.image = source.channel.image;
        } else map.set(source.channel.id, {...source.channel, groups: [...source.channel.groups]});
      }
      result = Array.from(map.values());
    } catch {
      throw apiError;
    }
  }
  await providerContext.kvStore?.set('channelMetadataV1', {time: Date.now(), channels: result});
  return result;
}
export function sourceDrm(source: Source): StreamDrm | undefined {
  const kind = source.properties['inputstream.adaptive.license_type'];
  const license = source.properties['inputstream.adaptive.license_key'];
  if (!kind && !license) return;
  if (!['clearkey', 'org.w3.clearkey'].includes((kind || '').toLowerCase())) throw new Error('LiveTG TV: unsupported DRM');
  const clearKeys: Record<string, string> = {};
  for (const pair of (license || '').split(',')) {
    const match = pair.trim().match(/^([a-f\d]{32}):([a-f\d]{32})$/i);
    if (!match) throw new Error('LiveTG TV: invalid ClearKey configuration');
    clearKeys[match[1].toLowerCase()] = match[2].toLowerCase();
  }
  return {type: 'clearkey', clearKeys};
}
