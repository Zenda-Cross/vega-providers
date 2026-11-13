import { Info, ProviderContext } from '../types';
import { channels, channelId, website } from './playlist';
export const getMeta = async ({link, providerContext, signal}: {link: string; providerContext: ProviderContext; signal?: AbortSignal}): Promise<Info> => {
  const id = channelId(link);
  const channel = (await channels(providerContext, signal)).find(item => item.id === id);
  if (!channel) throw new Error('LiveTG TV: channel is no longer available');
  return {title: channel.title, image: channel.image, synopsis: 'Watch ' + channel.title + ' live.', imdbId: '', type: 'movie', quickDownload: false, tags: ['Live TV', ...channel.groups], webUrl: website,
    linkList: [{title: 'Live TV', quickDownload: false, directLinks: [{title: 'Watch Live', link, type: 'movie', quickDownload: false}]}]};
};
