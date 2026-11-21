const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildSync } = require("esbuild");
const vm = require("node:vm");

function loadBrowserModule(entryFile, extraGlobals = {}) {
  const code = buildSync({
    entryPoints: [`providers/aniDream/${entryFile}.ts`],
    bundle: true,
    platform: "browser",
    format: "cjs",
    write: false,
  }).outputFiles[0].text;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    URL,
    URLSearchParams,
    Uint8Array,
    setTimeout,
    clearTimeout,
    ...extraGlobals,
  });
  return module.exports;
}

function createSerovalHelper() {
  return loadBrowserModule("seroval");
}

function createServerFnBody(resultValue) {
  const { encodeSeroval } = createSerovalHelper();
  return JSON.parse(encodeSeroval({ result: resultValue }));
}

function createBaseContext(handler) {
  return {
    commonHeaders: {},
    cheerio: require("cheerio"),
    kvStore: {
      get: async () => undefined,
      set: async () => {},
      delete: async () => false,
      keys: async () => [],
      clear: async () => {},
    },
    openWebView: async () => {
      throw new Error("openWebView should not be called");
    },
    axios: {
      get: (url, config) => handler("GET", url, config),
      head: (url, config) => handler("HEAD", url, config),
    },
  };
}

test("seroval encodes requests and decodes objects, arrays, and back-references", () => {
  const { encodeSeroval, decodeSeroval } = createSerovalHelper();
  const encoded = JSON.parse(
    encodeSeroval({ data: { anilistId: 178090, episode: 1, dub: false, server: 1 } }),
  );
  assert.equal(encoded.f, 127);
  assert.equal(encoded.t.t, 10);

  const decoded = decodeSeroval({
    t: 10,
    i: 0,
    p: {
      k: ["result", "error"],
      v: [
        {
          t: 9,
          i: 1,
          a: [
            {
              t: 10,
              i: 2,
              p: {
                k: ["id", "name", "description"],
                v: [
                  { t: 0, s: 42 },
                  { t: 1, s: "Alpha" },
                  { t: 1, s: "Line 1.\\n\\x3Cbr>\\x3Cbr>\\nLine 2." },
                ],
              },
            },
            { t: 4, i: 2 },
          ],
        },
        { t: 2, s: 0 },
      ],
    },
  });
  assert.equal(decoded.error, null);
  assert.equal(decoded.result.length, 2);
  assert.strictEqual(decoded.result[0], decoded.result[1]);
  assert.equal(decoded.result[0].name, "Alpha");
  assert.equal(decoded.result[0].description, "Line 1.\n<br><br>\nLine 2.");

  const { cleanSynopsis } = loadBrowserModule("client");
  assert.equal(cleanSynopsis(decoded.result[0].description), "Line 1.\n\nLine 2.");
});

test("catalog, posts deduplication, and search pass AniDream serverFn headers", async () => {
  const seenCalls = [];
  const ctx = createBaseContext(async (_method, url, config) => {
    seenCalls.push({ url, headers: config.headers });
    const parsedUrl = new URL(url);
    const { decodeSeroval } = createSerovalHelper();
    const payload = decodeSeroval(JSON.parse(parsedUrl.searchParams.get("payload")));

    if (url.includes("16f5ac63")) {
      return {
        data: createServerFnBody({
          nextPage: 2,
          releases: [
            {
              animeId: 178090,
              card: {
                id: 178090,
                title: { english: "7th Prince S2" },
                cover_image: { large: "https://example.com/178090.png" },
              },
            },
            {
              animeId: 178090,
              card: {
                id: 178090,
                title: { english: "7th Prince S2" },
                cover_image: { large: "https://example.com/178090.png" },
              },
            },
          ],
        }),
      };
    }

    if (url.includes("106b82f7")) {
      assert.equal(payload.data.available, true);
      return {
        data: createServerFnBody({
          items: [
            {
              id: 154587,
              title: { english: "Frieren: Beyond Journey’s End" },
              cover_image: { large: "https://example.com/154587.jpg" },
            },
          ],
        }),
      };
    }

    throw new Error(`Unexpected URL: ${url}`);
  });

  const catalogMod = loadBrowserModule("catalog");
  assert.ok(catalogMod.catalog.length >= 5);
  assert.ok(catalogMod.genres.some((g) => g.filter === "genre:Action"));

  const postsMod = loadBrowserModule("posts");
  const releases = await postsMod.getPosts({
    filter: "releases:all",
    page: 1,
    providerValue: "aniDream",
    signal: new AbortController().signal,
    providerContext: ctx,
  });
  assert.equal(releases.length, 1);
  assert.equal(releases[0].link, "https://anidream.to/anime/178090");

  const search = await postsMod.getSearchPosts({
    searchQuery: "frieren",
    page: 1,
    providerValue: "aniDream",
    signal: new AbortController().signal,
    providerContext: ctx,
  });
  assert.equal(search.length, 1);
  assert.equal(search[0].title, "Frieren: Beyond Journey’s End");

  assert.equal(await postsMod.getSearchPosts({
    searchQuery: "   ",
    page: 1,
    providerValue: "aniDream",
    signal: new AbortController().signal,
    providerContext: ctx,
  }).then((r) => r.length), 0);

  for (const call of seenCalls) {
    assert.equal(call.headers.Origin, "https://anidream.to");
    assert.equal(call.headers["x-tsr-serverFn"], "true");
  }
});

test("meta and episodes resolve synopsis, rating, backdrop, poster, logo, and only the selected title episode links", async () => {
  const { decodeSeroval } = createSerovalHelper();
  let seenLogoPayload = null;
  const ctx = createBaseContext(async (_method, url) => {
    if (url.includes("505b30ac")) {
      return {
        data: createServerFnBody({
          id: 16498,
          tmdb_id: 1429,
          format: "TV",
          status: "FINISHED",
          average_score: 85,
          genres: ["Action", "Drama"],
          title: { english: "Attack on Titan", romaji: "Shingeki no Kyojin" },
          description: "Titans!<br><br>Walls &amp; humanity.",
          cover_image: { large: "https://example.com/aot-cover.jpg" },
          banner_image: "https://example.com/aot-banner.jpg",
          backdrop_image: "https://image.tmdb.org/t/p/original/aot-bg.jpg",
          watch_order: [
            { id: 16498, type: "ANIME", label: "Season 1", episodes_aired: 25 },
            { id: 20958, type: "ANIME", label: "Season 2", episodes_aired: 12 },
          ],
        }),
      };
    }
    if (url.includes("33c4f1e3")) {
      return {
        data: createServerFnBody([
          {
            number: 1,
            title: { english: "To You, in 2000 Years" },
            thumbnail: "https://example.com/ep1.jpg",
            has_dub: true,
          },
        ]),
      };
    }
    if (url.includes("93a33c99")) {
      const payload = decodeSeroval(JSON.parse(new URL(url).searchParams.get("payload")));
      seenLogoPayload = payload.data;
      return {
        data: createServerFnBody({
          logo: "https://image.tmdb.org/t/p/original/aot-logo.png",
        }),
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

  const metaMod = loadBrowserModule("meta");
  const info = await metaMod.getMeta({
    link: "https://anidream.to/anime/16498",
    provider: "aniDream",
    providerContext: ctx,
  });

  assert.equal(info.title, "Attack on Titan");
  assert.equal(info.type, "series");
  assert.equal(info.tags[0], "TV Series");
  assert.equal(info.image, "https://image.tmdb.org/t/p/original/aot-bg.jpg");
  assert.equal(info.poster, "https://example.com/aot-cover.jpg");
  assert.equal(info.logo, "https://image.tmdb.org/t/p/original/aot-logo.png");
  assert.deepEqual(JSON.parse(JSON.stringify(seenLogoPayload)), {
    id: 16498,
    type: "ANIME",
    lang: "en",
  });
  assert.equal(info.rating, "8.5");
  assert.equal(info.tmdbId, "1429");
  assert.equal(info.synopsis, "Titans!\n\nWalls & humanity.");
  assert.equal(info.linkList.length, 1);
  assert.equal(info.linkList[0].directLinks[0].link, "https://anidream.to/watch?id=16498&n=1&dub=1");

  const epMod = loadBrowserModule("episodes");
  const eps = await epMod.getEpisodes({
    url: "https://anidream.to/anime/20958",
    providerContext: ctx,
  });
  assert.equal(eps.length, 1);
  assert.equal(eps[0].link, "https://anidream.to/watch?id=20958&n=1&dub=1");
});

test("meta falls back gracefully to banner_image/cover_image and omits failed/null logo", async () => {
  const ctx = createBaseContext(async (_method, url) => {
    if (url.includes("505b30ac")) {
      return {
        data: createServerFnBody({
          id: 999,
          format: "MOVIE",
          title: { romaji: "Banner Only Movie" },
          cover_image: { medium: "https://example.com/cover-med.jpg" },
          banner_image: "https://example.com/banner.jpg",
          backdrop_image: null,
        }),
      };
    }
    if (url.includes("33c4f1e3")) {
      return { data: createServerFnBody([]) };
    }
    if (url.includes("93a33c99")) {
      throw new Error("Logo endpoint failed");
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

  const metaMod = loadBrowserModule("meta");
  const info = await metaMod.getMeta({
    link: "https://anidream.to/anime/999",
    provider: "aniDream",
    providerContext: ctx,
  });

  assert.equal(info.image, "https://example.com/banner.jpg");
  assert.equal(info.poster, "https://example.com/cover-med.jpg");
  assert.equal(info.logo, undefined);
});

test("getStream returns m3u8 + sorted subtitles + skip intervals when streaming", async () => {
  const { decodeSeroval } = createSerovalHelper();
  const ctx = createBaseContext(async (_method, url) => {
    assert.ok(!url.includes("flixcloud.cc/d/"), "Streaming must not resolve FlixCloud DDL");
    const parsedUrl = new URL(url);
    const payload = decodeSeroval(JSON.parse(parsedUrl.searchParams.get("payload")));
    const server = payload.data.server;
    return {
      data: createServerFnBody({
        ok: true,
        data: {
          server,
          fileCode: "436gp8efm7dq",
          audio: "dual",
          audios: ["dual"],
          streamUrl: `https://fetch.flixcloud.cc/_v${server}/id/master.m3u8`,
          subtitles: [
            { label: "Arabic", url: "https://sub.test/ar.ass", type: "ass", language: "ar" },
            { label: "English", url: "https://sub.test/en.srt", type: "srt", language: "en" },
          ],
          chapters: [
            { title: "OP", start: 10.5, end: 100.25, type: "intro" },
            { title: "Part A", start: 100.25, end: 1300 },
            { title: "ED", start: 1300, end: 1390, type: "outro" },
          ],
        },
      }),
    };
  });

  const streamMod = loadBrowserModule("stream");
  const streams = await streamMod.getStream({
    link: "https://anidream.to/watch?id=178090&n=1&dub=1",
    type: "series",
    signal: new AbortController().signal,
    providerContext: ctx,
    isDownload: false,
  });

  assert.equal(streams.length, 2);
  assert.equal(streams[0].type, "m3u8");
  assert.equal(streams[0].server, "Server 1 (Dual Audio)");
  assert.equal(streams[0].headers?.Referer, "https://anidream.to/");
  assert.equal(streams[0].headers?.Origin, "https://anidream.to");
  assert.ok(streams[0].headers?.["User-Agent"]);
  assert.equal(streams[0].subtitles[0].type, "application/x-subrip");
  assert.equal(streams[0].subtitles[1].type, "text/x-ssa");
  assert.deepEqual(JSON.parse(JSON.stringify(streams[0].skip)), [
    { title: "OP", from: 10.5, to: 100.25 },
    { title: "ED", from: 1300, to: 1390 },
  ]);
});

test("getStream resolves FlixCloud DDL MKV (not m3u8) when isDownload is true and deduplicates fileCode", async () => {
  let flixMetaCalls = 0;
  let progressCalls = 0;
  let headCalls = 0;

  const { decodeSeroval } = createSerovalHelper();
  const ctx = createBaseContext(async (method, url) => {
    if (url.includes("anidream.to/_serverFn/")) {
      const payload = decodeSeroval(JSON.parse(new URL(url).searchParams.get("payload")));
      return {
        data: createServerFnBody({
          ok: true,
          data: {
            server: payload.data.server,
            fileCode: "436gp8efm7dq",
            audio: "dual",
            audios: ["dual"],
            streamUrl: `https://fetch.flixcloud.cc/_v${payload.data.server}/id/master.m3u8`,
            chapters: [{ title: "OP", start: 0, end: 90, type: "intro" }],
          },
        }),
      };
    }

    if (url === "https://flixcloud.cc/d/436gp8efm7dq/__data.json") {
      flixMetaCalls++;
      return {
        status: 200,
        data: {
          type: "data",
          nodes: [
            { type: "data", data: null },
            {
              type: "data",
              data: [
                { video: 1, download: 2 },
                { fileId: 3, filename: 4, resolution: 5, sizeHuman: 6 },
                { base: 7, token: 8 },
                "bfaf6c24-571f-44cc-a2ca-5cbbad6c3036",
                "Episode.01.1080p.mkv",
                "1080p",
                "734 MB",
                "https://fetch8.flixcloud.cc",
                "jwt-token-abc",
              ],
            },
          ],
        },
      };
    }

    if (method === "GET" && url.includes("/download/bfaf6c24-571f-44cc-a2ca-5cbbad6c3036/progress")) {
      progressCalls++;
      return {
        status: 200,
        data: 'data: {"percent":50,"status":"uploading"}\n\ndata: {"percent":100,"status":"ready"}\n\n',
      };
    }

    if (method === "HEAD" && url.includes("/download/bfaf6c24-571f-44cc-a2ca-5cbbad6c3036?")) {
      headCalls++;
      return {
        status: 302,
        headers: {
          location: "https://dl.spacedl.top/dl/bfaf6c24/hash.mkv?exp=123&sig=abc",
        },
      };
    }

    throw new Error(`Unexpected request: ${method} ${url}`);
  });

  const streamMod = loadBrowserModule("stream");
  const streams = await streamMod.getStream({
    link: "https://anidream.to/watch?id=178090&n=1&dub=1",
    type: "series",
    signal: new AbortController().signal,
    providerContext: ctx,
    isDownload: true,
  });

  assert.equal(flixMetaCalls, 1);
  assert.equal(progressCalls, 1);
  assert.equal(headCalls, 1);
  assert.equal(streams.length, 1);
  assert.equal(streams[0].type, "mkv");
  assert.equal(streams[0].quality, "1080");
  assert.equal(streams[0].tag, "734 MB");
  assert.equal(streams[0].server, "FlixCloud MKV (734 MB) (Dual Audio)");
  assert.equal(
    streams[0].link,
    "https://dl.spacedl.top/dl/bfaf6c24/hash.mkv?exp=123&sig=abc",
  );

  const playback = await streamMod.getStream({
    link: "https://anidream.to/watch?id=178090&n=1&dub=1",
    type: "series",
    providerContext: ctx,
  });
  assert.deepEqual(Array.from(playback, (stream) => stream.type), ["m3u8", "m3u8", "mkv"]);
  assert.equal(playback[2].link, streams[0].link);
});

test("flixcloud handles OkHttp auto-redirect responseURL and 405 Range fallback", async () => {
  const flix = loadBrowserModule("flixcloud");

  // Case 1: OkHttp auto-followed redirect on HEAD -> 200 with final responseURL
  const ctxRedirected = createBaseContext(async (method, url) => {
    if (url.endsWith("/__data.json")) {
      return {
        status: 200,
        data: {
          nodes: [
            {
              data: [
                { video: 1, download: 2 },
                { fileId: 3, filename: 4, resolution: 5, sizeHuman: 6 },
                { base: 7, token: 8 },
                "uuid-1",
                "file.mkv",
                "720p",
                "300 MB",
                "https://fetch8.flixcloud.cc",
                "tok",
              ],
            },
          ],
        },
      };
    }
    if (url.includes("/progress")) {
      return { status: 200, data: 'data: {"percent":100,"status":"ready"}\n\n' };
    }
    if (method === "HEAD") {
      return {
        status: 200,
        headers: {},
        request: { responseURL: "https://dl.spacedl.top/dl/uuid-1/movie.mkv?sig=1" },
      };
    }
    throw new Error(`Unexpected: ${method} ${url}`);
  });

  const res1 = await flix.resolveFlixCloudMkv("abc123", { providerContext: ctxRedirected });
  assert.equal(res1.url, "https://dl.spacedl.top/dl/uuid-1/movie.mkv?sig=1");
  assert.equal(res1.quality, "720");

  // Case 2: HEAD returns 405 -> Range: bytes=0-0 GET fallback resolves 302 Location
  let sawRange = false;
  const ctx405 = createBaseContext(async (method, url, config) => {
    if (url.endsWith("/__data.json")) {
      return {
        status: 200,
        data: {
          nodes: [
            {
              data: [
                { video: 1, download: 2 },
                { fileId: 3, filename: 4, resolution: 5, sizeHuman: 6 },
                { base: 7, token: 8 },
                "uuid-2",
                "file2.mkv",
                "1080p",
                "500 MB",
                "https://fetch10.flixcloud.cc",
                "tok2",
              ],
            },
          ],
        },
      };
    }
    if (url.includes("/progress")) {
      return { status: 200, data: 'data: {"percent":100,"status":"ready"}\n\n' };
    }
    if (method === "HEAD") {
      return { status: 405, headers: {} };
    }
    if (method === "GET" && url.includes("/download/uuid-2?")) {
      sawRange = config.headers?.Range === "bytes=0-0";
      return {
        status: 302,
        headers: { location: "https://dl.spacedl.top/dl/uuid-2/ep.mkv?sig=2" },
      };
    }
    throw new Error(`Unexpected: ${method} ${url}`);
  });

  const res2 = await flix.resolveFlixCloudMkv("xyz789", { providerContext: ctx405 });
  assert.equal(sawRange, true);
  assert.equal(res2.url, "https://dl.spacedl.top/dl/uuid-2/ep.mkv?sig=2");
});
