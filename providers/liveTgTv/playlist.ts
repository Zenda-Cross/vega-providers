import { ProviderContext, StreamDrm } from '../types';

export const website = 'https://livetgtv.lovable.app';
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
      const pipe = line.indexOf('|');
      entry.url = pipe < 0 ? line : line.slice(0, pipe);
      if (pipe >= 0) new URLSearchParams(line.slice(pipe + 1)).forEach((value, key) => header(entry!.headers, key, value));
      sources.push(entry);
      entry = undefined;
    }
  }
  if (!sources.length) throw new Error('LiveTG TV: playlist contains no channels');
  return sources;
}
export async function loadSources(providerContext: ProviderContext, signal?: AbortSignal): Promise<Source[]> {
  const {data} = await providerContext.axios.get(playlistUrl + '?_vega_refresh=' + Date.now(), {
    signal, timeout: 30000, responseType: 'arraybuffer',
    headers: {...providerContext.commonHeaders, 'Cache-Control': 'no-cache', Pragma: 'no-cache'},
  });
  let text = data;
  if (typeof text !== 'string') {
    const bytes = ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(data);
    const chunks: string[] = [];
    for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 8192))));
    text = decodeURIComponent(escape(chunks.join('')));
  }
  return parsePlaylist(text);
}
export async function channels(providerContext: ProviderContext, signal?: AbortSignal): Promise<Channel[]> {
  const cached = await providerContext.kvStore?.get<{time: number; channels: Channel[]}>('channelMetadataV1');
  if (cached && Date.now() - cached.time < 300000) return cached.channels;
  const map = new Map<string, Channel>();
  for (const source of await loadSources(providerContext, signal)) {
    const existing = map.get(source.channel.id);
    if (existing) {
      if (!existing.groups.includes(source.group)) existing.groups.push(source.group);
      if (!existing.image) existing.image = source.channel.image;
    } else map.set(source.channel.id, {...source.channel, groups: [...source.channel.groups]});
  }
  const result = Array.from(map.values());
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
