import { Post, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";
import { API_BASE, commonHeaders, withKartoonsAuth } from "./headers";

function formatPost(item: any): Post | null {
  const id = item?.id || item?._id;
  if (!id || !item.title) return null;
  return {
    title:item.title,
    link:JSON.stringify({type:item.type === "movie" ? "movie" : "show",id,slug:item.slug}),
    image:item.image || item.coverImage || "",
    tag:item.rating ? `★ ${item.rating}` : undefined,
    cornerTag:item.category || String(item.year || item.startYear || item.releaseYear || "") || undefined,
  };
}

export const getPosts = async function ({filter,page,signal,providerContext}: {
  filter:string;page:number;providerValue:string;signal:AbortSignal;providerContext:ProviderContext;
}): Promise<Post[]> {
  try {
    const {axios} = await withKartoonsAuth(providerContext,signal);
    // Accept persisted category filters from older provider versions.
    const legacy = filter || "/catalog/show";
    const mapped = legacy.replace(/^\/shows/,"/catalog/show").replace(/^\/movies/,"/catalog/movie").replace("/featured","?catalog=popular");
    const url = new URL(API_BASE + mapped);
    url.searchParams.set("page",String(page));
    const res = await axios.get(url.href,{headers:commonHeaders,signal});
    return (res.data?.data || []).map(formatPost).filter((p:Post|null):p is Post=>p !== null);
  } catch(error) { throwProviderError("Kartoons","getPosts",error); }
};

export const getSearchPosts = async function ({searchQuery,page,signal,providerContext}: {
  searchQuery:string;page:number;providerValue:string;signal:AbortSignal;providerContext:ProviderContext;
}): Promise<Post[]> {
  try {
    const {axios} = await withKartoonsAuth(providerContext,signal);
    if (page > 1) return [];
    const res = await axios.get(`${API_BASE}/search?q=${encodeURIComponent(searchQuery)}`,{headers:commonHeaders,signal});
    return (res.data?.data || []).map(formatPost).filter((p:Post|null):p is Post=>p !== null);
  } catch(error) { throwProviderError("Kartoons","getSearchPosts",error); }
};
