# Hold to preview

Return an optional `preview` on a `Post` from `getPosts` or `getSearchPosts`. Vega Mobile uses it when a user holds a title card on Home or Search with **Hold to preview** enabled in Preferences. **Only show preview while holding** closes the preview on release.

```ts
import type { Post } from "../types";

const post: Post = {
  title: "Example title",
  link: "https://example.com/title",
  image: "https://example.com/poster.jpg",
  preview: {
    url: "https://example.com/short-preview.mp4",
    type: "video",
    // headers: { Referer: "https://example.com/" },
  },
};
```

- Use a direct, public HTTP(S) media URL for a short clip or animated image. Prefer HTTPS. Embed pages, private network addresses, and URLs with embedded credentials are unsuitable.
- Set `type` to `"video"` for a video or `"gif"` for an animated image. Vega also accepts `"image"` as an alias for `"gif"`. With `preview: "https://…"` or no explicit type, Vega infers GIF, WebP, and APNG from the URL path and treats other paths as video.
- Use `preview.headers` for media request headers only when required. Vega also accepts `previewVideo`, `previewGif`, and `previewHeaders`. Prefer the `preview` object for new providers.
- Keep the poster in `image` and omit `preview` when a title has no preview. The preview should come from data the provider already loads for the card. A preview requires neither an extra provider module nor a `getStream` call.

Run `npm run test:provider -- <provider> getPosts --rebuild` or test `getSearchPosts` to validate the returned preview fields.
