import { Info, Link, ProviderContext } from '../types';
import { imageUrl, loadPage, videoDetail } from './page';
const names = (values: any): string[] => (Array.isArray(values) ? values : []).map(value => typeof value === 'string' ? value : value?.name || value?.title).filter((value): value is string => typeof value === 'string' && !!value);
export const getMeta = async ({link, providerContext, signal}: {link: string; providerContext: ProviderContext; signal?: AbortSignal}): Promise<Info> => {
  try {
    const {$, entity, entities, url} = await loadPage(link, providerContext, signal);
    const isSeries = ['tvshow', 'show', 'season'].includes(entity?.type) || /\/(?:tvshow|show)\//.test(url);
    let item = entity;
    if (!item?.title && !isSeries) item = await videoDetail(url, providerContext, signal);
    const title = item?.title || $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim();
    if (!title || /^(?:Oops!+|MX Player|Amazon MX Player)$/i.test(title.trim())) throw new Error('title metadata unavailable');
    const pictures = [...(Array.isArray(item?.titleContentImageInfo) ? item.titleContentImageInfo : []), ...(Array.isArray(item?.imageInfo) ? item.imageInfo : [])];
    const banner = pictures.find(pic => ['banner_and_static_bg_desktop', 'bigpic', 'landscape'].includes(pic.type));
    const portrait = pictures.find(pic => ['portrait_large', 'portrait'].includes(pic.type));
    const logo = pictures.find(pic => pic.type === 'title_desktop');
    const image = imageUrl(banner?.url || pictures[0]?.url || $('meta[property="og:image"]').attr('content'));
    const linkList: Link[] = [];
    const seen = new Set<string>();
    const addSeason = (id: string, title: string) => {
      if (!id || seen.has(id)) return;
      seen.add(id);
      linkList.push({title: title || `Season ${linkList.length + 1}`, episodesLink: id});
    };
    if (isSeries) {
      if (item?.type === 'season' && item.id) addSeason(String(item.id), item.title);
      const dependency = item?.dependencies?.season;
      if (dependency?.id) addSeason(String(dependency.id), dependency.name || 'Season 1');
      $('div.hs__items-container > div[data-id]').each((_, el) => addSeason($(el).attr('data-id') || '', $(el).text().trim()));
      // Some pages keep seasons solely in their normalized state.
      for (const tab of item?.tabs || []) for (const season of tab.containers || []) {
        if (season.type === 'season' && season.id) addSeason(String(season.id), season.title || `Season ${season.sequence || linkList.length + 1}`);
      }
      if (!linkList.length) for (const season of entities.filter(value => value.type === 'season')) addSeason(String(season.id), season.title || season.name);
      if (!linkList.length) throw new Error('no seasons available for this show');
    } else linkList.push({title: 'Movie', directLinks: [{title: 'Full Movie', link: url, type: 'movie'}]});
    return {title, synopsis: item?.description || $('meta[property="og:description"]').attr('content') || '', image, poster: imageUrl(portrait?.url) || undefined, logo: imageUrl(logo?.url) || undefined, imdbId: '', type: isSeries ? 'series' : 'movie', tags: names(item?.genres), cast: names(item?.contributors), rating: item?.rating != null ? String(item.rating) : undefined, linkList, webUrl: url};
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(`MXPlayer getMeta failed: ${typeof (error as any)?.message === 'string' ? (error as any).message : 'metadata request failed'}`);
  }
};
