import { Post, ProviderContext } from '../types';
import { channels, channelLink } from './playlist';
interface Params { filter?: string; searchQuery?: string; page?: number; providerContext: ProviderContext; signal?: AbortSignal }
async function list({filter, searchQuery, page = 1, providerContext, signal}: Params): Promise<Post[]> {
  const group = filter?.startsWith('group:') ? decodeURIComponent(filter.slice(6)) : undefined;
  const query = (searchQuery || '').trim().toLowerCase();
  const items = (await channels(providerContext, signal)).filter(item => (!group || item.groups.includes(group)) && (!query || item.title.toLowerCase().includes(query)));
  const offset = (Math.max(1, page) - 1) * 40;
  return items.slice(offset, offset + 40).map(item => ({title: item.title, image: item.image, link: channelLink(item.id), tag: 'LIVE', aspectRatio: 4 / 3}));
}
export const getPosts = (params: Params): Promise<Post[]> => list(params);
export const getSearchPosts = (params: Params): Promise<Post[]> => list(params);
