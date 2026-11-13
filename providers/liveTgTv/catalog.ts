import { Catalog, ProviderContext } from '../types';
import { channels } from './playlist';
export const catalog = async (params?: {providerContext?: ProviderContext; signal?: AbortSignal}): Promise<Catalog[]> => {
  const all = [{title: 'All Channels', filter: 'all'}];
  if (!params?.providerContext) return all;
  const groups = new Set<string>();
  for (const channel of await channels(params.providerContext, params.signal)) channel.groups.forEach(group => groups.add(group));
  return all.concat(Array.from(groups).sort().map(title => ({title, filter: 'group:' + encodeURIComponent(title)})));
};
