# Vega App Provider - AI Agent Instructions

You are an AI coding assistant helping a developer build a "Provider" (extension) for the Vega App.
A Provider is a scraping module that extracts catalog, metadata, streaming, and episode information from a specific movie/TV show streaming website.

Follow these strict rules and conventions when creating or modifying a provider:

## 1. Directory Structure
Each provider MUST be placed in its own folder under `providers/` (e.g., `providers/myProvider/`).
A complete provider consists of up to 6 files:
- `catalog.ts` (Required)
- `meta.ts` (Required)
- `posts.ts` (Required)
- `stream.ts` (Required)
- `episodes.ts` (Optional - only needed if episodes must be fetched dynamically)
- `settings.ts` (Optional - exports `getSettingsSchema` to provide a settings UI in Provider Manager)

## 2. API Signatures & Types
ALWAYS import types from `../types`. Do NOT define your own types for the core returns.

### `catalog.ts`
Export two arrays: `catalog` and optionally `genres`.
```ts
export const catalog = [
  { title: "Popular Movies", filter: "/category/popular-movies" },
];
```

### `posts.ts`
Export `getPosts` and `getSearchPosts`.
```ts
import { Post, ProviderContext } from "../types";

export const getPosts = async function ({ filter, page, providerValue, signal, providerContext }): Promise<Post[]> {
  const { axios, cheerio } = providerContext;
  // Use `filter` and `page` to scrape a list of posts
  // Return array of `{ title, link, image }`
}

export const getSearchPosts = async function ({ searchQuery, page, providerValue, signal, providerContext }): Promise<Post[]> {
  // Use `searchQuery` and `page` to scrape search results
}
```

### `meta.ts`
Export `getMeta`.
```ts
import { Info, ProviderContext } from "../types";

export const getMeta = async function ({ link, providerContext }): Promise<Info> {
  const { axios, cheerio } = providerContext;
  // Scrape the movie/show page
  // `type` must be "movie" or "series"
  // `imdbId` should be extracted if possible (for Cinemeta enrichment)
  // `linkList` defines the available media (see LinkList rules below).
  return { title, synopsis, image, imdbId, type, linkList };
}
```

### `stream.ts`
Export `getStream`.
```ts
import { Stream, ProviderContext } from "../types";

export const getStream = async function ({ link, type, signal, providerContext }): Promise<Stream[]> {
  const { axios, cheerio, commonHeaders } = providerContext;
  // Scrape and resolve the final video files (e.g., .m3u8, .mp4)
  // Return array of `{ server, link, type, quality }`
}
```

### `episodes.ts` (Optional)
Export `getEpisodes`.
```ts
import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({ url, providerContext }): Promise<EpisodeLink[]> {
  // Used for fetching episode lists dynamically for a selected season
  // Return array of `{ title, link }`
}
```

## 3. LinkList Rules (`meta.ts`)
The `linkList` array in `meta.ts` tells the Vega app what media is available.
- For **Movies**: 
  ```ts
  linkList: [
    { title: "Movie", quality: "1080p", directLinks: [{ title: "Movie", link: streamLink, type: "movie" }] }
  ]
  ```
- For **Series (Static)**: If you can scrape all episodes on the main page, populate `directLinks`.
  ```ts
  linkList: [
    { 
      title: "Season 1", 
      directLinks: [
        { title: "Episode 1", link: ep1Link, type: "series" },
        { title: "Episode 2", link: ep2Link, type: "series" }
      ] 
    }
  ]
  ```
- For **Series (Dynamic)**: If each season requires an extra HTTP request, OMIT `directLinks` entirely and provide an `episodesLink`. The Vega app will call `episodes.ts` using the `episodesLink` to load the episodes.
  ```ts
  linkList: [
    { title: "Season 1", episodesLink: season1Link },
    { title: "Season 2", episodesLink: season2Link }
  ]
  ```

## 4. How a Provider Works (The Sandbox environment)
Providers in the Vega App execute inside a strict, isolated JavaScript sandbox (a Web Worker or JavaScriptCore) for security and performance reasons.
Because of this strict sandbox environment, you MUST adhere to the following rules:
- **NO THIRD-PARTY LIBRARIES**: You CANNOT install or import any third-party NPM libraries (e.g., `npm install <package>`). The sandbox does not have a module resolution system for external Node modules.
- **NO NATIVE APIs**: You CANNOT use Node.js built-ins like `fs`, `path`, or `child_process`.
- **INJECTED CONTEXT ONLY**: The only tools you can use are the ones explicitly injected into the `providerContext` by the Vega App sandbox. This includes a custom `axios` instance, `cheerio`.
- **CRITICAL WARNING**: If you use, `require()`, `import`, or install unauthorized NPM packages, the provider will fail to bundle or will crash immediately when loaded into the Vega App.

## 5. How the Data Flows (Execution Order)
To understand how to build a provider, you must understand how the Vega App calls these files in sequence:
1. **`catalog.ts`**: The app reads this file first to get the list of categories (e.g., "Trending Movies").
2. **`posts.ts`**: When a user clicks a category, the app passes the category's `filter` to `getPosts({ filter })`. This function scrapes the list of movies/shows on that page and returns them. Each returned post contains a `link` to its specific page.
3. **`meta.ts`**: When a user taps on a specific movie/show, the app passes that post's `link` to `getMeta({ link })`. This function scrapes the detailed info (synopsis, cast) and generates a `linkList` containing the available media links (e.g., streaming links for the movie, or links for episodes).
4. **`episodes.ts` (Optional)**: If it's a dynamic TV show, the app passes the `episodesLink` to `getEpisodes({ url })` to load the episodes for a season.
5. **`stream.ts`**: When the user clicks "Play" on a movie or an episode, the app passes the final media link to `getStream({ link })`. This function scrapes the final raw video files (like `.m3u8` or `.mp4`) for the video player.

## 6. Dependencies and Error Handling
- Use `axios` and `cheerio` provided in `providerContext`. Do NOT use `fetch` or import `axios`/`cheerio` globally, because the context objects are injected with special caching/interceptor logic by the Vega app.
- Use `commonHeaders` from `providerContext` when making axios requests to avoid blocking.
- When an extractor fails, you can use `throwProviderError(providerName, functionName, err)` to throw standard errors.

## 7. Testing
To verify if your scraping logic works, you can test specific functions using the provided CLI test script:
`npm run test:provider -- <providerName> <functionName> [--rebuild]`
or
`npm run test -- <providerName> (this will test the provider end to end)

Examples:
- `npm run test:provider -- myProvider getPosts --rebuild`
- `npm run test:provider -- myProvider getMeta`
- `npm run test:provider -- myProvider getStream`

The script will prompt you for the necessary parameters (like filter, link, etc.) and validate the output against the expected JSON schema. Always use the `--rebuild` flag if you have just made changes to the TypeScript files.

## 8. Bundling
After modifying or creating a provider, it MUST be built using:
`npm run build`
This generates the CommonJS outputs into the `dist/` folder, which the Vega app consumes.
