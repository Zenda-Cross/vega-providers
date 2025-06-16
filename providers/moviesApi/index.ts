import { allCatalog, allGenresList } from "../autoEmbed/catalog";
import { allGetInfo } from../autoEmbed/metafo";
import { allGetPost, allGetSearchPosts } from "../autoEmbed/posts";
import { ProviderType } from "../types";
import { mpGetStream } from "./stream";

export const moviesApi: ProviderType = {
  catalog: allCatalog,
  genres: allGenresList,
  GetMetaData: allGetInfo,
  GetHomePosts: allGetPost,
  GetStream: mpGetStream,
  GetSearchPosts: allGetSearchPosts,
};
