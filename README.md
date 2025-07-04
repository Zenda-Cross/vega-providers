# Vega App Provider Extensions

# Provider

How providers are structured and how to create a new one.

## Provider Folder Structure

Each provider lives in its own folder under `providers/`:

```
providers/
  myProvider/
    catalog.ts
    meta.ts
    posts.ts
    stream.ts
    episodes.ts (optional)
```

## File Explanations

### 1. `catalog.ts`

<img src="https://github.com/user-attachments/assets/40e5da3d-326d-4f5c-b266-a4167da2a269" width="200"/>


- **Purpose:** Defines the categories or filters available for your provider.
- **How it's used:**
  - The `title` property will be shown as the heading on the home page (e.g., "Popular Movies").
  - The `filter` property is passed to the `getPosts` function in `posts.ts`.
  - For example, if you define `{ title: "Popular Movies", filter: "/category/popular-movies" }`, then home-page heading will show "Popular Movies" and `/category/popular-movies` will be sent to `getPosts` as the `filter` argument. Your `getPosts` implementation should use this to fetch and return the relevant items (e.g., popular movies).
  - The same logic applies to `genres`: each genre object has a `title` (displayed as a heading) and a `filter` (used to fetch genre-specific items).
- **Exports:**
  - `catalog`: An array of objects with `title` and `filter` fields.
  - `genres`: (optional) An array for genre filters.

### 2. `meta.ts`

- **Purpose:** Fetches metadata for a specific item (movie, show, etc.).
- **Exports:**
  - `getMeta({ link, providerContext })`: Returns an `Info` object with details like title, synopsis, image, etc.

### 3. `posts.ts`

- **Purpose:** Fetches lists of items (posts) and handles search.
- **Exports:**
  - `getPosts({ filter, page, providerValue, signal, providerContext })`: Returns an array of `Post` objects for a given filter and page.
  - `getSearchPosts({ searchQuery, page, providerValue, signal, providerContext })`: (optional) Returns search results as an array of `Post` objects.

### 4. `stream.ts`

- **Purpose:** Fetches streaming links or sources for a given item.
- **Exports:**
  - `getStream({ link, type, signal, providerContext })`: Returns an array of `Stream` objects with streaming info.

### 5. `episodes.ts` (Optional)

- **Purpose:** Handles episode-specific logic for series.
- **When to use:**
  - This file is optional and not required for all providers. Some providers return the full episode list directly in the metadata from `getMeta`, but others require a separate request to fetch episodes for a specific season.
  - If your provider's `getMeta` function cannot return all episodes at once, you can return a `linkList` like this:
    ```js
    linkList: [
      {
        title: "season 1",
        episodesLink: "/season-1",
      },
    ];
    ```
  - When a user selects a season, the `episodesLink` value (e.g., `/season-1`) will be sent as the `url` argument to `getEpisodes` in `episodes.ts`.
  - Your `getEpisodes` function should then fetch and return the list of episodes for that season.
- **Exports:**
  - `getEpisodes({ url, providerContext })`: Returns an array of `EpisodeLink` objects for the given season or episode group.

## `providerContext`?

`providerContext` is an object passed to each function, providing shared utilities and dependencies, such as:

- `axios`: For HTTP requests
- `cheerio`: For HTML parsing
- `getBaseUrl`: Helper to get the provider's base URL (base url are generall stored here https://github.com/himanshu8443/providers/blob/main/modflix.json)
- `commonHeaders`: Standard HTTP headers
- `extractors`: Shared extractor functions
- `Aes`: (if needed) for encryption/decryption

This ensures all providers use the same tools and patterns, making code easier to maintain and extend.

## Reference Types

All function signatures and return types should use the interfaces from `providers/types.ts`:

- `Post`, `Info`, `Stream`, `EpisodeLink`, etc.

## Example: `posts.ts`

```ts
import { Post, ProviderContext } from "../types";

export const getPosts = async function ({
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
}): Promise<Post[]> {
  // ...implementation...
};

export const getSearchPosts = async function ({
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
}): Promise<Post[]> {
  // ...implementation...
};
```

## Example: `catalog.ts`

```ts
// catalog.ts
export const catalog = [
  { title: "Popular Movies", filter: "/category/popular-movies" },
  { title: "Latest TV Shows", filter: "/category/latest-tv-shows" },
];

export const genres = [
  { title: "Action", filter: "/genre/action" },
  { title: "Drama", filter: "/genre/drama" },
];
```

## Example: `meta.ts`

```ts
// meta.ts
import { Info, ProviderContext } from "../types";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  // Fetch and parse metadata for the item
  // ...implementation...
  return {
    title: "Example Movie",
    synopsis: "A sample synopsis.",
    image: "https://example.com/image.jpg",
    imdbId: "tt1234567",
    type: "movie",
    linkList: [],
  };
};
```

## Example: `stream.ts`

```ts
// stream.ts
import { Stream, ProviderContext } from "../types";

export const getStream = async function ({
  link,
  type,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  // Fetch and return streaming sources
  // ...implementation...
  return [
    {
      server: "ExampleServer",
      link: "https://example.com/stream.m3u8",
      type: "m3u8",
      quality: "1080",
    },
  ];
};
```

## Example: `episodes.ts` (Optional)

```ts
// episodes.ts
import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  // Fetch and return episode links
  // ...implementation...
  return [
    { title: "Episode 1", link: "https://example.com/ep1" },
    { title: "Episode 2", link: "https://example.com/ep2" },
  ];
};
```

## About `linkList` in `meta.ts`

The `linkList` property in the object returned by `getMeta` is used to describe available seasons, episodes, or direct download/stream links for the item.

<img src="https://github.com/user-attachments/assets/f5dc31fc-0701-4d97-8056-01a58ecdefc0" width="200"/>


- Each entry in `linkList` can represent a season or anything you want; it will be shown in the dropdown.
- If your provider requires an extra request to fetch episodes for a season, set the `episodesLink` property. When the user selects that season, the app will call `getEpisodes` with this value.
- If your provider does not require an extra request (i.e., you already have all episode links), you can return them directly in the `directLinks` array. Each `directLinks` entry should have a `link`, `title`, and `type` (e.g., "movie" or "series").
- The `quality` property can be used to indicate video quality (e.g., "1080").

### Example

```js
linkList: [
  {
    title: "Season 2",
    episodesLink: "",
    directLinks: [
      {
        link: "https://example.com/download",
        title: "Episode 1",
        type: "movie",
      },
      // ...more episodes or links
    ],
    quality: "1080",
  },
];
```

- If you use `directLinks`, the app will send the selected link directly to `getStream` when needed, skipping the need for an extra episode request.
- If you use `episodesLink`, the app will call `getEpisodes` to fetch the episode list for that season or group.

This gives you flexibility to support both providers that need extra requests for episodes and those that can return all links up front.

## How to Test Your Provider

1. **Start the Dev Server**

   - Run the following command in your terminal:
     ```sh
     npm run auto
     ```
   - This will start the development server and log a "Mobile test url" (e.g., `http://<your-local-ip>:3001`).

2. **Configure the Vega App for Local Testing**

   - Open your Vega app project.
   - Go to `src/lib/services/ExtensionManager.ts`.
   - Set the following variables in class ExtensionManager:
     ```ts
     private testMode = true;
     private baseUrlTestMode = "http://<your-local-ip>:3001"; // Use the Mobile test url from the dev server
     ```
   - This tells the app to use your local providers for testing.

3. **Network Requirement**

   - Make sure both your development machine (running the dev server) and your mobile device (running the Vega app) are on the same network.

4. **Test in the App**
   - App will now use your local provider code for all requests.

---

This workflow allows you to quickly test and debug new providers before deploying them.

Follow this structure and naming convention to ensure your provider integrates smoothly with the project.
