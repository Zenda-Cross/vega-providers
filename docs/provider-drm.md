# DRM streams in providers

Import `Stream` and `StreamDrm` from `../types`. Return an optional `drm` object on each `getStream` result. The object must be
JSON serializable; provider callbacks cannot cross the sandbox boundary.

## Inline ClearKey (Android / Android TV)

```ts
return [{
  server: 'Live TV',
  link: manifestUrl,
  type: 'mpd',
  headers: {'User-Agent': userAgent, Cookie: cookie},
  drm: {
    type: 'clearkey',
    clearKeys: {
      '00112233445566778899aabbccddeeff': 'ffeeddccbbaa99887766554433221100',
    },
  },
}];
```

`clearKeys` maps 32-character hexadecimal key IDs to 32-character hexadecimal
keys. Multiple entries are supported. For M3U input, the provider should parse
`#KODIPROP:inputstream.adaptive.license_type=clearkey` and split the corresponding
`license_key` comma-separated `kid:key` pairs into this map. Parse `#EXTHTTP`
and `#EXTVLCOPT` into stream headers separately. Refresh the playlist when
resolving playback so expiring cookies and stream URLs are current.

Vega converts the map to a local JWK license response. The Android native player
uses Media3's local DRM callback; it does not request a license over HTTP for
inline keys. A new native Android build is required for this feature.

## License servers

```ts
return [{
  server: 'Licensed stream',
  link: manifestUrl,
  type: 'mpd',
  headers: manifestHeaders,
  drm: {
    type: 'widevine',
    licenseServer: 'https://example.com/license',
    headers: {Authorization: `Bearer ${licenseToken}`},
    multiDrm: true,
  },
}];
```

`drm.headers` apply to license requests; top-level `headers` apply to media
requests. Use either `clearKeys` or `licenseServer`, not both. Other supported
type names are `playready`, `clearkey`, and `fairplay`, subject to the native
platform and device's DRM capabilities. FairPlay uses HLS on Apple platforms
and may specify `contentId`, `certificateUrl`, and `base64Certificate`.
Custom JavaScript license challenge callbacks are not supported by providers.

DRM playback requires valid keys or a working authorized license endpoint and
a compatible device. ClearKey DASH is intended for Android; this does not add
DASH/ClearKey playback to iOS. License-server playback depends on the server's
compatibility with the native player's standard license exchange.

DRM streams are excluded from downloads and casting, and media caching is
disabled during local DRM playback. Ordinary streams keep their existing behavior.
This API requires a Vega mobile build with provider DRM support; older app builds
and other Vega clients may not support these fields.
