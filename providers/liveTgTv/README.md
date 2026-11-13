# LiveTG TV

Uses the public M3U feed at https://livetgtv.lovable.app/api/public/playlist.m3u.
Each channel is a separate catalog title. Entries sharing a TVG ID and normalized
channel name become alternate playback servers; distinct IDs remain separate.
Categories come from the feed's group titles. Search and categories paginate at
40 channels per page.

Only channel metadata is cached (five minutes). Playback reloads the feed to
refresh signed URLs, cookies and ClearKeys. The provider preserves per-source
HTTP headers, removes Kodi URL header suffixes and returns inline ClearKey DRM
through Vega's Stream.drm API. Protected streams are excluded from downloads.
Inline ClearKey requires a native Android/Android TV app build supporting this
API; older clients and iOS cannot use those sources.

Tests: `node --test tests/liveTgTv.test.cjs`; build: `npm run build`.
The feed can contain expired or region-restricted streams. Representative HLS
and DASH endpoints returned HTTP 451 from the development server during testing;
actual playback on a supported device in an allowed region remains unverified.
