const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { transformSync } = require("esbuild");
const cheerio = require("cheerio");

const BASE_URL = "https://e14.extraflix.mobi";
const PROVIDER_DIR = path.join("providers", "extraflix");

function loadModule(moduleName, options = {}) {
  const source = fs.readFileSync(
    path.join(PROVIDER_DIR, `${moduleName}.ts`),
    "utf8",
  );
  const code = transformSync(source, {
    loader: "ts",
    format: "cjs",
    target: "es2015",
  }).code;

  const module = { exports: {} };
  new Function("module", "exports", "require", code)(
    module,
    module.exports,
    (key) => {
      if (key === "../getBaseUrl") {
        return { getBaseUrl: async () => BASE_URL };
      }
      if (key === "../extractors/hubcloud") {
        return {
          hubcloudExtractor: async (...args) =>
            options.hubcloudExtractor
              ? options.hubcloudExtractor(...args)
              : [],
        };
      }
      if (key === "../providerErrors") {
        return {
          throwProviderError: (provider, operation, error) => {
            const status = error?.response?.status;
            const url = error?.response?.config?.url || error?.config?.url;
            const details = [
              status ? `HTTP ${status}` : "",
              url ? `URL ${url}` : "",
              error?.message || String(error),
            ].filter(Boolean);
            throw new Error(
              `${provider} ${operation} failed: ${details.join(" | ")}`,
            );
          },
        };
      }
      if (key === "../types") return {};
      return require(key);
    },
  );

  return module.exports;
}

function createContext(handler) {
  return {
    commonHeaders: { "User-Agent": "extraflix-test" },
    cheerio,
    axios: {
      get: (url, config) => handler(url, config),
    },
    openWebView: async () => {
      throw new Error("openWebView must not be called");
    },
    kvStore: {
      get: async () => undefined,
      set: async () => {},
      delete: async () => false,
      keys: async () => [],
      clear: async () => {},
    },
  };
}

const LISTING_HTML = `
<div class="entries">
  <article class="entry-card card-content post-1 post type-post">
    <a class="ct-media-container boundless-image" href="https://e14.extraflix.mobi/prem-keetanu-2026/" aria-label="Prem Keetanu (2026) [Hindi] 1080p 720p 480p Amazon WEB-DL ESub">
      <img class="attachment-full size-full wp-post-image" src="https://image.tmdb.org/t/p/original/xUJ69.jpg" alt="Prem Keetanu (2026) [Hindi] 1080p 720p 480p Amazon WEB-DL ESub" />
    </a>
    <h2 class="entry-title"><a href="https://e14.extraflix.mobi/prem-keetanu-2026/" rel="bookmark">Prem Keetanu (2026) [Hindi] 1080p 720p 480p Amazon WEB-DL ESub</a></h2>
  </article>
  <article class="entry-card card-content post-2 post type-post">
    <a class="ct-media-container boundless-image" href="/panchayatseason-1-2020/" aria-label="Panchayat Season 1 (2020) [Hindi] 1080p 720p 480p Amazon WEB-DL ESub">
      <img class="wp-post-image" data-src="https://image.tmdb.org/t/p/original/qzZBx.jpg" alt="Panchayat Season 1 (2020) [Hindi] 1080p 720p 480p Amazon WEB-DL ESub" />
    </a>
    <h2 class="entry-title"><a href="/panchayatseason-1-2020/" rel="bookmark">Panchayat Season 1 (2020) [Hindi] 1080p 720p 480p Amazon WEB-DL ESub</a></h2>
  </article>
  <article class="entry-card card-content post-1 post type-post">
    <a class="ct-media-container boundless-image" href="https://e14.extraflix.mobi/prem-keetanu-2026/" aria-label="Prem Keetanu (2026) [Hindi] 1080p 720p 480p Amazon WEB-DL ESub">
      <img class="wp-post-image" src="https://image.tmdb.org/t/p/original/xUJ69.jpg" alt="Prem Keetanu (2026)" />
    </a>
    <h2 class="entry-title"><a href="https://e14.extraflix.mobi/prem-keetanu-2026/" rel="bookmark">Prem Keetanu (2026)</a></h2>
  </article>
  <article class="entry-card card-content post-3 post type-post">
    <h2 class="entry-title">Card without a link</h2>
  </article>
</div>`;

const SEARCH_PAYLOAD = {
  found: 2,
  hits: [
    {
      document: {
        t: "Panchayat Season 1 (2020) [Hindi] 1080p 720p 480p Amazon WEB-DL ESub",
        u: "/panchayatseason-1-2020/",
        i: "https://image.tmdb.org/t/p/original/qzZBx.jpg",
        d: 1793319018,
        id: "198682",
      },
    },
    {
      document: {
        t: "Panchayat Season 1 duplicate",
        u: "/panchayatseason-1-2020/",
        i: "https://image.tmdb.org/t/p/original/duplicate.jpg",
      },
    },
    {
      document: {
        t: "",
        u: "/missing-title/",
        i: "https://image.tmdb.org/t/p/original/missing.jpg",
      },
    },
  ],
};

const META_HTML = `<!doctype html>
<html>
<head>
  <meta name="description" content="Download &quot;Prem Keetanu (2026)&quot; hindi full movie/series in 4K 2160p UHD, 1080p, 720p &amp; 480p qualities for free!" />
  <meta property="og:image" content="https://image.tmdb.org/t/p/original/cZWRgWy.jpg" />
</head>
<body>
  <h1>Prem Keetanu (2026) [Hindi] 1080p 720p 480p Amazon WEB-DL ESub</h1>
  <div class="entry-content">
    <p>Download <strong>&quot;Prem Keetanu (2026)&quot;</strong> hindi full movie/series in 4K 2160p UHD, 1080p, 720p and 480p qualities for free!</p>
    <div>
      <h2 style="color: yellow; margin: 10px 0 4px 0; font-size: 24px;">Prem Keetanu</h2>
      <div class="IMDB-Rating">
        <strong>IMDb Rating:</strong>
        <a href="https://www.imdb.com/title/tt44090550/reference/"> 3.2 </a>
      </div>
      <p style="margin: 6px 0;"><strong style="color:#f8a147;">Release Date:</strong> 2026-10-02</p>
      <p style="margin: 6px 0;"><strong style="color:#f8a147;">Genres:</strong> Comedy, Romance</p>
      <p style="margin: 6px 0;"><strong style="color:#f8a147;">Actors:</strong> Veer Pahariya, Aparshakti Khurana, Aafiya Sayed, Rakesh Bedi</p>
      <p style="margin: 10px 0 0 0;"><strong style="color:#f8a147;">Plot:</strong> A group of young men and their turbulent college life.</p>
    </div>
    <div class="download-options-section">
      <p><span><span>480p x264 – </span><span><strong>[374 MB]</strong></span></span></p>
      <p><a class="fasc-button" href="https://links.linkshub.fun/view/hdR2ddY041">Download Link</a></p>
      <p><span><span>1080p x264 – </span><span><strong>[3.45 GB]</strong></span></span></p>
      <p><a class="fasc-button" href="https://links.linkshub.fun/view/bPePtT98WQ">Download Link</a></p>
    </div>
    <p>Here, you can download movies in various High-Quality formats like 1080p x264 UHD, 1080p 60FPS and 720p x264.</p>
  </div>
</body>
</html>`;

test("catalog exposes verified listing and genre filters", () => {
  const { catalog, genres } = loadModule("catalog");

  assert.ok(catalog.length >= 8);
  assert.ok(genres.length >= 5);
  assert.deepEqual(
    catalog.slice(0, 3).map((entry) => entry.filter),
    ["", "/category/movies", "/category/web-series"],
  );

  for (const entry of [...catalog, ...genres]) {
    assert.equal(typeof entry.title, "string");
    assert.ok(entry.title.length > 0);
    if (entry.filter !== "") {
      assert.match(entry.filter, /^\/[a-z0-9-/]+$/);
    }
  }

  const filters = [...catalog, ...genres].map((entry) => entry.filter);
  assert.equal(new Set(filters).size, filters.length);
});

test("getPosts parses entry cards and requests the expected listing URL", async () => {
  let requested = null;
  const { getPosts } = loadModule("posts");
  const providerContext = createContext((url, config) => {
    requested = { url, config };
    return { data: LISTING_HTML };
  });

  const posts = await getPosts({
    filter: "/category/movies/bollywood-movies",
    page: 1,
    providerValue: "extraflix",
    signal: new AbortController().signal,
    providerContext,
  });

  assert.equal(
    requested.url,
    `${BASE_URL}/category/movies/bollywood-movies/`,
  );
  assert.equal(requested.config.headers.Referer, `${BASE_URL}/`);
  assert.equal(posts.length, 2);
  assert.deepEqual(posts[0], {
    title: "Prem Keetanu (2026) [Hindi] 1080p 720p 480p Amazon WEB-DL ESub",
    link: "/prem-keetanu-2026/",
    image: "https://image.tmdb.org/t/p/original/xUJ69.jpg",
  });
  assert.equal(posts[1].link, "/panchayatseason-1-2020/");
  assert.equal(
    posts[1].image,
    "https://image.tmdb.org/t/p/original/qzZBx.jpg",
  );
});

test("getPosts builds root and paginated URLs", async () => {
  const seen = [];
  const { getPosts } = loadModule("posts");
  const providerContext = createContext((url) => {
    seen.push(url);
    return { data: "<div></div>" };
  });

  await getPosts({
    filter: "",
    page: 2,
    providerValue: "extraflix",
    signal: new AbortController().signal,
    providerContext,
  });
  await getPosts({
    filter: "/category/web-series/",
    page: 3,
    providerValue: "extraflix",
    signal: new AbortController().signal,
    providerContext,
  });
  await getPosts({
    filter: "/category/movies",
    page: 0,
    providerValue: "extraflix",
    signal: new AbortController().signal,
    providerContext,
  });

  assert.deepEqual(seen, [
    `${BASE_URL}/page/2/`,
    `${BASE_URL}/category/web-series/page/3/`,
    `${BASE_URL}/category/movies/`,
  ]);
});

test("getSearchPosts reads the public search endpoint and deduplicates results", async () => {
  let requested = null;
  const { getSearchPosts } = loadModule("posts");
  const providerContext = createContext((url, config) => {
    requested = { url, config };
    return { data: SEARCH_PAYLOAD };
  });

  const posts = await getSearchPosts({
    searchQuery: "panchayat season",
    page: 2,
    providerValue: "extraflix",
    signal: new AbortController().signal,
    providerContext,
  });

  assert.equal(
    requested.url,
    `${BASE_URL}/api/search.php?q=panchayat%20season&page=2`,
  );
  assert.equal(requested.config.headers.Accept, "application/json");
  assert.equal(posts.length, 1);
  assert.deepEqual(posts[0], {
    title: "Panchayat Season 1 (2020) [Hindi] 1080p 720p 480p Amazon WEB-DL ESub",
    link: "/panchayatseason-1-2020/",
    image: "https://image.tmdb.org/t/p/original/qzZBx.jpg",
  });
});

test("getSearchPosts accepts a JSON string payload and skips blank queries", async () => {
  let calls = 0;
  const { getSearchPosts } = loadModule("posts");
  const providerContext = createContext(() => {
    calls += 1;
    return { data: JSON.stringify(SEARCH_PAYLOAD) };
  });

  const posts = await getSearchPosts({
    searchQuery: "panchayat",
    page: 1,
    providerValue: "extraflix",
    signal: new AbortController().signal,
    providerContext,
  });
  assert.equal(posts.length, 1);

  const blank = await getSearchPosts({
    searchQuery: "   ",
    page: 1,
    providerValue: "extraflix",
    signal: new AbortController().signal,
    providerContext,
  });
  assert.deepEqual(blank, []);
  assert.equal(calls, 1);
});

test("getMeta parses title, images, plot, IMDb id, rating, cast, genres and quality rows", async () => {
  let requested = null;
  const { getMeta } = loadModule("meta");
  const providerContext = createContext((url, config) => {
    requested = { url, config };
    return { data: META_HTML };
  });

  const info = await getMeta({
    link: "/prem-keetanu-2026/",
    providerContext,
  });

  assert.equal(requested.url, `${BASE_URL}/prem-keetanu-2026/`);
  assert.equal(
    requested.config.headers.Referer,
    `${BASE_URL}/`,
  );
  assert.equal(info.title, "Prem Keetanu (2026)");
  assert.equal(info.image, "https://image.tmdb.org/t/p/original/cZWRgWy.jpg");
  assert.equal(info.poster, info.image);
  assert.equal(
    info.synopsis,
    "A group of young men and their turbulent college life.",
  );
  assert.equal(info.imdbId, "tt44090550");
  assert.equal(info.type, "movie");
  assert.equal(info.rating, "3.2");
  assert.deepEqual(info.cast, [
    "Veer Pahariya",
    "Aparshakti Khurana",
    "Aafiya Sayed",
    "Rakesh Bedi",
  ]);
  assert.deepEqual(info.tags, ["Comedy", "Romance"]);
  assert.equal(info.webUrl, `${BASE_URL}/prem-keetanu-2026/`);
  assert.equal(info.linkList.length, 2);
  assert.equal(info.linkList[0].title, "480p x264 - 374 MB");
  assert.equal(info.linkList[0].quality, "480p");
  assert.equal(
    info.linkList[0].directLinks[0].link,
    "https://links.linkshub.fun/view/hdR2ddY041",
  );
  assert.equal(info.linkList[0].directLinks[0].type, "movie");
  assert.equal(info.linkList[1].title, "1080p x264 - 3.45 GB");
  assert.equal(info.linkList[1].quality, "1080p");
});

test("getMeta detects series titles and falls back to the description", async () => {
  const { getMeta } = loadModule("meta");
  const html = `
    <html><head>
      <meta name="description" content="Download Panchayat Season 1 in 1080p and 720p." />
      <meta property="og:image" content="https://image.tmdb.org/t/p/original/qzZBx.jpg" />
    </head><body>
      <h1>Panchayat Season 1 (2020) [Hindi] 1080p 720p 480p Amazon WEB-DL ESub</h1>
      <div class="entry-content">
        <p><strong>Genres:</strong> Comedy, Drama</p>
        <p><span>720p x264 – </span><span><strong>[1.38 GB]</strong></span></p>
        <p><a class="fasc-button" href="https://links.linkshub.fun/view/season1">Download Link</a></p>
      </div>
    </body></html>`;
  const providerContext = createContext(() => ({ data: html }));

  const info = await getMeta({
    link: `${BASE_URL}/panchayatseason-1-2020/`,
    providerContext,
  });

  assert.equal(info.title, "Panchayat Season 1 (2020)");
  assert.equal(info.type, "series");
  assert.equal(
    info.synopsis,
    "Download Panchayat Season 1 in 1080p and 720p.",
  );
  assert.equal(info.imdbId, "");
  assert.equal(info.rating, undefined);
  assert.equal(info.linkList.length, 1);
  assert.equal(info.linkList[0].directLinks[0].type, "series");
});

test("getMeta falls back to quality buttons placed after a labelled paragraph", async () => {
  const { getMeta } = loadModule("meta");
  const html = `
    <html><head><meta property="og:image" content="https://image.tmdb.org/t/p/original/x.jpg" /></head>
    <body>
      <h1>Fallback Movie (2024) 720p WEB-DL</h1>
      <div class="entry-content">
        <h3>720p x265 – [900 MB]</h3>
        <a class="fasc-button" href="https://links.linkshub.fun/view/fallback">Download</a>
      </div>
    </body></html>`;
  const providerContext = createContext(() => ({ data: html }));

  const info = await getMeta({ link: "/fallback-movie/", providerContext });

  assert.equal(info.title, "Fallback Movie (2024)");
  assert.equal(info.linkList.length, 1);
  assert.equal(info.linkList[0].quality, "720p");
  assert.equal(info.linkList[0].title, "720p x265 - 900 MB");
});

test("provider errors include the provider, operation, status and URL", async () => {
  const { getPosts } = loadModule("posts");
  const providerContext = createContext((url) => {
    const error = new Error("Request failed with status code 500");
    error.response = {
      status: 500,
      config: { url },
    };
    throw error;
  });

  await assert.rejects(
    () =>
      getPosts({
        filter: "/category/movies",
        page: 1,
        providerValue: "extraflix",
        signal: new AbortController().signal,
        providerContext,
      }),
    /ExtraFlix posts failed: HTTP 500 \| URL https:\/\/e14\.extraflix\.mobi\/category\/movies\/ \| Request failed/,
  );
});

test("getMeta turns episode rows into one season of series links", async () => {
  const { getMeta } = loadModule("meta");
  const html = `
    <html><head>
      <meta name="description" content="Download The Great Indian Kapil Show Season 5 episodes." />
      <meta property="og:image" content="https://image.tmdb.org/t/p/original/kapil.jpg" />
    </head><body>
      <h1>The Great Indian Kapil Show Season 5 (2026) [Hindi] 1080p 720p 480p Netflix WEB-DL ESub</h1>
      <div class="entry-content">
        <p><span>Episode 1</span></p>
        <p><a class="fasc-button" href="https://ep1.linkshub.fun/archives/8283">Download Link</a></p>
        <p><span>Episode 2</span></p>
        <p><a class="fasc-button" href="https://ep1.linkshub.fun/archives/8421">Download Link</a></p>
      </div>
    </body></html>`;
  const providerContext = createContext(() => ({ data: html }));

  const info = await getMeta({ link: "/kapil-season-5/", providerContext });

  assert.equal(info.type, "series");
  assert.equal(info.title, "The Great Indian Kapil Show Season 5 (2026)");
  assert.equal(info.linkList.length, 1);
  assert.equal(info.linkList[0].title, "Season 5");
  assert.equal(info.linkList[0].quality, undefined);
  assert.equal(info.linkList[0].directLinks.length, 2);
  assert.deepEqual(info.linkList[0].directLinks[0], {
    title: "Episode 1",
    link: "https://ep1.linkshub.fun/archives/8283",
    type: "series",
  });
  assert.equal(
    info.linkList[0].directLinks[1].link,
    "https://ep1.linkshub.fun/archives/8421",
  );
});

test("getStream passes through direct media URLs without extra requests", async () => {
  const { getStream } = loadModule("stream");
  let calls = 0;
  const providerContext = createContext(() => {
    calls += 1;
    return { data: "" };
  });

  const streams = await getStream({
    link: "https://bucket.r2.cloudflarestorage.com/hub/file.mkv?X-Amz-Signature=abc",
    providerContext,
  });

  assert.equal(calls, 0);
  assert.equal(streams.length, 1);
  assert.equal(streams[0].server, "CF Storage");
  assert.equal(streams[0].type, "mkv");
  assert.equal(
    streams[0].link,
    "https://bucket.r2.cloudflarestorage.com/hub/file.mkv?X-Amz-Signature=abc",
  );
});

test("getStream follows linkshub to hubdrive to hubcloud and skips the gated host", async () => {
  const extractorCalls = [];
  const { getStream } = loadModule("stream", {
    hubcloudExtractor: async (url) => {
      extractorCalls.push(url);
      if (url.endsWith("/drive/abc")) {
        return [
          { server: "CF Storage", link: "https://a.r2.cloudflarestorage.com/x.mkv", type: "mkv" },
          { server: "Pixeldrain", link: "https://pixeldrain.dev/api/file/xyz?download", type: "mkv" },
        ];
      }
      return [
        { server: "CF Storage", link: "https://a.r2.cloudflarestorage.com/x.mkv", type: "mkv" },
      ];
    },
  });

  const requested = [];
  const providerContext = createContext((url) => {
    requested.push(url);
    if (url.includes("links.linkshub.fun/view/")) {
      return {
        data: `
          <html><body>
            <a href="https://new2.drivehub.dad/file/3033803">DriveHub</a>
            <a href="https://hubdrive.blog/cdn-cgi/l/email-protection">Email</a>
            <a href="https://hubdrive.blog/file/111">HubDrive mirror</a>
            <a href="https://hubdrive.blog/file/1872049158">HubDrive</a>
          </body></html>`,
      };
    }
    if (url.includes("hubdrive.blog/file/")) {
      return {
        data: `
          <html><body>
            <a href="https://hubcloud.mov/drive/abc">[HubCloud Server]</a>
          </body></html>`,
      };
    }
    return { data: "" };
  });

  const streams = await getStream({
    link: "https://links.linkshub.fun/view/hdR2ddY041",
    providerContext,
  });

  assert.deepEqual(requested, [
    "https://links.linkshub.fun/view/hdR2ddY041",
    "https://hubdrive.blog/file/111",
    "https://hubdrive.blog/file/1872049158",
  ]);
  assert.ok(requested.every((url) => !url.includes("drivehub")));
  assert.ok(requested.every((url) => !url.includes("/cdn-cgi/")));
  assert.deepEqual(extractorCalls, ["https://hubcloud.mov/drive/abc"]);
  assert.equal(streams.length, 2);
  assert.equal(streams[0].server, "CF Storage");
  assert.equal(streams[1].server, "Pixeldrain");
});

test("getStream applies the quality of archive rows to resolved streams", async () => {
  const requested = [];
  const { getStream } = loadModule("stream", {
    hubcloudExtractor: async (url) => [
      {
        server: "CF Storage",
        link: `https://a.r2.cloudflarestorage.com/${url.split("/").pop()}.mkv`,
        type: "mkv",
      },
    ],
  });

  const providerContext = createContext((url) => {
    requested.push(url);
    if (url.includes("/archives/8283")) {
      return {
        data: `
          <html><body><div class="entry-content">
            <p>480p x264 – [266 MB]</p>
            <p><a class="fasc-button" href="https://hubcloud.mov/drive/small">Download Link</a></p>
            <p>1080p x264 – [1.38 GB]</p>
            <p><a class="fasc-button" href="https://hubcloud.mov/drive/large">Download Link</a></p>
          </div>
          <a href="https://ep1.linkshub.fun/archives/8280">Previous post: MobLand</a>
          <a href="https://ep1.linkshub.fun/archives/8288">Next post: The Great Indian Kapil Show</a>
          </body></html>`,
      };
    }
    return { data: "" };
  });

  const streams = await getStream({
    link: "https://ep1.linkshub.fun/archives/8283",
    providerContext,
  });

  assert.equal(streams.length, 2);
  assert.equal(streams[0].quality, "480");
  assert.equal(streams[1].quality, "1080");
  assert.deepEqual(requested, ["https://ep1.linkshub.fun/archives/8283"]);
});

test("getStream reports the gated drivehub branch instead of bypassing it", async () => {
  const { getStream } = loadModule("stream");
  const providerContext = createContext((url) => {
    assert.equal(url, "https://links.linkshub.fun/view/onlydrivehub");
    return {
      data: `<html><body><a href="https://new2.drivehub.dad/file/1">Download</a></body></html>`,
    };
  });

  await assert.rejects(
    () =>
      getStream({
        link: "https://links.linkshub.fun/view/onlydrivehub",
        providerContext,
      }),
    /ExtraFlix stream failed: .*interactive browser verification/,
  );
});

test("getStream reports when no playable links are found", async () => {
  const { getStream } = loadModule("stream");
  const providerContext = createContext(() => ({ data: "<html></html>" }));

  await assert.rejects(
    () =>
      getStream({
        link: "https://links.linkshub.fun/view/empty",
        providerContext,
      }),
    /ExtraFlix stream failed: no playable streams found/,
  );
});

test("getStream does not follow other-show archive links found inside quality rows", async () => {
  const requested = [];
  const extractorCalls = [];
  const { getStream } = loadModule("stream", {
    hubcloudExtractor: async (url) => {
      extractorCalls.push(url);
      return [
        {
          server: "CF Storage",
          link: "https://a.r2.cloudflarestorage.com/abc.mkv",
          type: "mkv",
        },
      ];
    },
  });

  const providerContext = createContext((url) => {
    requested.push(url);
    if (url.includes("/archives/8283")) {
      return {
        data: `
          <html><body><div class="entry-content">
            <p>480p [266 MB]</p>
            <p><a class="fasc-button" href="https://links.linkshub.fun/view/kapilS05E01">Download Link</a></p>
            <p>720p [684 MB]</p>
            <p><a class="fasc-button" href="https://ep1.linkshub.fun/archives/9999">Previous post: MobLand S02E02</a></p>
          </div></body></html>`,
      };
    }
    if (url.includes("/view/kapilS05E01")) {
      return {
        data: `<html><body><a href="https://hubdrive.blog/file/123">HubDrive</a></body></html>`,
      };
    }
    if (url.includes("/hubdrive.blog/file/123")) {
      return {
        data: `<html><body><a href="https://hubcloud.mov/drive/abc">HubCloud</a></body></html>`,
      };
    }
    return { data: "<html></html>" };
  });

  const streams = await getStream({
    link: "https://ep1.linkshub.fun/archives/8283",
    providerContext,
  });

  assert.deepEqual(extractorCalls, ["https://hubcloud.mov/drive/abc"]);
  assert.ok(requested.includes("https://ep1.linkshub.fun/archives/8283"));
  assert.ok(requested.includes("https://links.linkshub.fun/view/kapilS05E01"));
  assert.ok(!requested.some((url) => url.includes("archives/9999")));
  assert.equal(streams.length, 1);
  assert.equal(streams[0].server, "CF Storage");
  assert.equal(streams[0].quality, "480");
});

test("getStream applies the quality of 1440p archive rows to resolved streams", async () => {
  const { getStream } = loadModule("stream", {
    hubcloudExtractor: async (url) => [
      {
        server: "CF Storage",
        link: `https://a.r2.cloudflarestorage.com/${url.split("/").pop()}.mkv`,
        type: "mkv",
      },
    ],
  });

  const providerContext = createContext((url) => {
    if (url.includes("/archives/8283")) {
      return {
        data: `
          <html><body><div class="entry-content">
            <p>1440p x265 – [2.1 GB]</p>
            <p><a class="fasc-button" href="https://hubcloud.mov/drive/qhd">Download Link</a></p>
          </div></body></html>`,
      };
    }
    return { data: "" };
  });

  const streams = await getStream({
    link: "https://ep1.linkshub.fun/archives/8283",
    providerContext,
  });

  assert.equal(streams.length, 1);
  assert.equal(streams[0].quality, "1440");
});

test("getMeta parses quality rows with parenthesized or unbracketed sizes and bare labels", async () => {
  const { getMeta } = loadModule("meta");
  const html = `
    <html><body>
      <h1>Test Film (2024) 1080p WEB-DL</h1>
      <div class="entry-content">
        <p>480p x264 (374 MB)</p>
        <p><a class="fasc-button" href="https://links.linkshub.fun/view/480">Download Link</a></p>
        <p>360p x265 250 MB</p>
        <p><a class="fasc-button" href="https://links.linkshub.fun/view/360">Download Link</a></p>
        <p>720p</p>
        <p><a class="fasc-button" href="https://links.linkshub.fun/view/720">Download Link</a></p>
      </div>
    </body></html>`;
  const providerContext = createContext(() => ({ data: html }));

  const info = await getMeta({ link: "/test-film/", providerContext });

  assert.equal(info.linkList.length, 3);
  assert.equal(info.linkList[0].quality, "480p");
  assert.equal(info.linkList[0].title, "480p x264 - 374 MB");
  assert.equal(
    info.linkList[0].directLinks[0].link,
    "https://links.linkshub.fun/view/480",
  );
  assert.equal(info.linkList[1].quality, "360p");
  assert.equal(info.linkList[1].title, "360p x265 - 250 MB");
  assert.equal(info.linkList[2].quality, "720p");
  assert.equal(info.linkList[2].title, "720p");
});

test("getMeta does not pair a stale quality label with an unlabelled link", async () => {
  const { getMeta } = loadModule("meta");
  const html = `
    <html><body>
      <h1>Test Stale Pending (2024) 1080p WEB-DL</h1>
      <div class="entry-content">
        <p>1080p HEVC x265 - 1 GB</p>
        <p><a class="fasc-button" href="https://links.linkshub.fun/view/first">Download Link</a></p>
        <p>720p x265 - 900 MB</p>
        <p><a class="fasc-button" href="https://links.linkshub.fun/view/first">Duplicate Download</a></p>
        <p><a class="fasc-button" href="https://links.linkshub.fun/view/fresh">Unlabelled Download</a></p>
      </div>
    </body></html>`;
  const providerContext = createContext(() => ({ data: html }));

  const info = await getMeta({ link: "/test-stale/", providerContext });

  assert.equal(info.linkList.length, 1);
  assert.equal(info.linkList[0].quality, "1080p");
  assert.equal(
    info.linkList[0].directLinks[0].link,
    "https://links.linkshub.fun/view/first",
  );
  assert.ok(
    !info.linkList.some((entry) =>
      entry.directLinks.some((link) => link.link.endsWith("fresh")),
    ),
  );
});

test("getMeta detects series from episode rows even without season or series in the title", async () => {
  const { getMeta } = loadModule("meta");
  const html = `
    <html><body>
      <h1>The Great Indian Kapil Show (2026) [Hindi] 1080p 720p 480p Netflix WEB-DL</h1>
      <div class="entry-content">
        <p><span>Episode 1</span></p>
        <p><a class="fasc-button" href="https://ep1.linkshub.fun/archives/8283">Download Link</a></p>
      </div>
    </body></html>`;
  const providerContext = createContext(() => ({ data: html }));

  const info = await getMeta({ link: "/some-show/", providerContext });

  assert.equal(info.type, "series");
  assert.equal(info.linkList.length, 1);
  assert.equal(info.linkList[0].title, "Episodes");
  assert.equal(info.linkList[0].directLinks[0].type, "series");
});

test("getMeta supports S05-style season titles", async () => {
  const { getMeta } = loadModule("meta");
  const html = `
    <html><body>
      <h1>The Great Indian Kapil Show S05 (2026) [Hindi] 1080p 720p Netflix WEB-DL</h1>
      <div class="entry-content">
        <p><span>Episode 1</span></p>
        <p><a class="fasc-button" href="https://ep1.linkshub.fun/archives/8283">Download Link</a></p>
      </div>
    </body></html>`;
  const providerContext = createContext(() => ({ data: html }));

  const info = await getMeta({ link: "/some-show-s05/", providerContext });

  assert.equal(info.type, "series");
  assert.equal(info.linkList[0].title, "Season 5");
});
