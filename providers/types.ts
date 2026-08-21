import { AxiosStatic } from "axios";
import * as cheerio from "cheerio";

// Content type for providers (replaces zustand import)
export interface Content {
  provider: string;
  [key: string]: any;
}

// getPosts
export interface Post {
  title: string;
  link: string;
  image: string;
  provider?: string;
}

export type TextTracks = {
  title: string;
  language: string;
  type: "application/x-subrip" | "application/ttml+xml" | "text/vtt";
  uri: string;
}[];

// getStream
export interface Stream {
  server: string;
  link: string;
  type: string;
  quality?: "360" | "480" | "720" | "1080" | "2160";
  subtitles?: TextTracks;
  headers?: any;
}

// getInfo
export interface Info {
  title: string;
  image: string;
  poster?: string;
  logo?: string;
  synopsis: string;
  imdbId: string;
  tmdbId?: string;
  type: string;
  quickDownload?: boolean;
  tags?: string[];
  cast?: string[];
  rating?: string;
  linkList: Link[];
  webUrl?: string;
}
// getEpisodeLinks
export interface EpisodeLink {
  title: string;
  link: string;
  description?: string;
  image?: string;
  quickDownload?: boolean;
}

export interface Link {
  title: string;
  quality?: string;
  episodesLink?: string;
  quickDownload?: boolean;
  directLinks?: {
    title: string;
    link: string;
    type?: "movie" | "series";
    description?: string;
    image?: string;
    quickDownload?: boolean;
  }[];
}

// catalog
export interface Catalog {
  title: string;
  filter: string;
}

export interface ProviderType {
  searchFilter?: string;
  catalog: Catalog[];
  genres: Catalog[];
  blurImage?: boolean;
  nonStreamableServer?: string[];
  nonDownloadableServer?: string[];
  GetStream: ({
    link,
    type,
    signal,
    providerContext,
    isDownload,
  }: {
    link: string;
    type: string;
    signal?: AbortSignal;
    providerContext: ProviderContext;
    isDownload?: boolean;
  }) => Promise<Stream[]>;
  GetHomePosts: ({
    filter,
    page,
    providerValue,
    signal,
    providerContext,
  }: {
    filter: string;
    page: number;
    providerValue: string;
    signal: AbortSignal;
    providerContext: ProviderContext;
  }) => Promise<Post[]>;
  GetEpisodeLinks?: ({
    url,
    providerContext,
  }: {
    url: string;
    providerContext: ProviderContext;
  }) => Promise<EpisodeLink[]>;
  GetMetaData: ({
    link,
    provider,
    providerContext,
  }: {
    link: string;
    provider: Content["provider"];
    providerContext: ProviderContext;
  }) => Promise<Info>;
  GetSearchPosts: ({
    searchQuery,
    page,
    providerValue,
    signal,
    providerContext,
  }: {
    searchQuery: string;
    page: number;
    providerValue: string;
    signal: AbortSignal;
    providerContext: ProviderContext;
  }) => Promise<Post[]>;
}

// Options to customize the WAF-solving WebView dialog.
// Options to customize the WAF-solving WebView dialog.
export interface OpenWebViewOptions {
  // Title shown in the dialog header.
  title?: string;
  // Helper text shown under the title.
  description?: string;

  headers?: Record<string, string>;

  waitForCookie?: string;

  force?: boolean;
  // If set, the dialog auto-cancels (rejects) after this many milliseconds.
  timeoutMs?: number;
}

// Result returned to the provider after the user solves the challenge.
export interface OpenWebViewResult {
  // The page response after the challenge is solved: the rendered HTML of the
  // document (document.documentElement.outerHTML).
  data: string;
  // Cookie header value, e.g. "cf_clearance=abc; other=def".
  cookies: string;
  // Cookies as a name -> value map.
  cookieMap: Record<string, string>;
  // The User-Agent used by the WebView.
  userAgent: string;
  // The URL that was opened.
  url: string;
}

export interface ProviderKvStore {
  get: <T = unknown>(key: string) => Promise<T | undefined>;
  set: (key: string, value: unknown) => Promise<void>;
  delete: (key: string) => Promise<boolean>;
  keys: () => Promise<string[]>;
  clear: () => Promise<void>;
}

interface SettingsFieldBase {
  key: string;
  label: string;
  description?: string;
}

interface SettingsTextField extends SettingsFieldBase {
  type: "text";
  defaultValue?: string;
  placeholder?: string;
}

interface SettingsToggleField extends SettingsFieldBase {
  type: "toggle";
  defaultValue?: boolean;
}

interface SettingsSelectField extends SettingsFieldBase {
  type: "select";
  options: { label: string; value: string }[];
  defaultValue?: string;
}

interface SettingsMultiSelectField extends SettingsFieldBase {
  type: "multiselect";
  options: { label: string; value: string }[];
  defaultValue?: string[];
}

interface SettingsNumberField extends SettingsFieldBase {
  type: "number";
  defaultValue?: number;
  min?: number;
  max?: number;
}

export type SettingsField =
  | SettingsTextField
  | SettingsToggleField
  | SettingsSelectField
  | SettingsMultiSelectField
  | SettingsNumberField;

export type ProviderContext = {
  axios: AxiosStatic;
  commonHeaders: Record<string, string>;
  cheerio: typeof cheerio;
  openWebView: (
    url: string,
    options?: OpenWebViewOptions,
  ) => Promise<OpenWebViewResult>;
  kvStore: ProviderKvStore;
};
