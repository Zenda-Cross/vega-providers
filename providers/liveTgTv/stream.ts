import { Stream, ProviderContext } from '../types';
import { channelId, loadSources, sourceDrm } from './playlist';
export const getStream = async ({link, providerContext, signal, isDownload}: {link: string; providerContext: ProviderContext; signal?: AbortSignal; isDownload?: boolean}): Promise<Stream[]> => {
  const id = channelId(link);
  const sources = (await loadSources(providerContext, signal)).filter(item => item.channel.id === id);
  if (!sources.length) throw new Error('LiveTG TV: channel is no longer available');
  const streams: Stream[] = [], seen = new Set<string>();
  let invalid = false;
  for (const source of sources) {
    try {
      const drm = sourceDrm(source);
      if (isDownload && drm) continue;
      const hint = source.properties['inputstream.adaptive.manifest_type'] || '';
      const type = hint === 'mpd' || /\.mpd(?:[?/#]|$)/i.test(source.url) ? 'mpd' : hint === 'hls' || /\.m3u8(?:[?/#]|$)/i.test(source.url) ? 'm3u8' : /\.mp4(?:[?/#]|$)/i.test(source.url) ? 'mp4' : drm ? 'mpd' : 'm3u8';
      const fingerprint = JSON.stringify([source.url, Object.entries(source.headers).sort(), drm]);
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      streams.push({server: source.group + ' • ' + type.toUpperCase(), link: source.url, type, headers: source.headers, ...(drm ? {drm} : {})});
    } catch { invalid = true; }
  }
  if (!streams.length && invalid) throw new Error('LiveTG TV: no source has a supported DRM configuration');
  return streams.sort((a, b) => Number(b.type === (isDownload ? 'mp4' : 'm3u8')) - Number(a.type === (isDownload ? 'mp4' : 'm3u8')));
};
