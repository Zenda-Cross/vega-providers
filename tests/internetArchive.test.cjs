const assert = require("node:assert/strict");
const { test } = require("node:test");
const vm = require("node:vm");
const { buildSync } = require("esbuild");

function load(entry) {
  const code = buildSync({ entryPoints: [entry], bundle: true, platform: "browser", format: "cjs", write: false })
    .outputFiles[0].text;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, URL, URLSearchParams, Error, Promise, console });
  return module.exports;
}

const plain = (value) => JSON.parse(JSON.stringify(value));

const api = load("providers/internetArchive/api.ts");
const { getStream } = load("providers/internetArchive/stream.ts");
const { getPosts } = load("providers/internetArchive/posts.ts");
const { getSettingsSchema } = load("providers/internetArchive/settings.ts");
const { getMeta } = load("providers/internetArchive/meta.ts");

function context(replies, settings = {}) {
  const calls = [];
  return {
    calls,
    ctx: {
      commonHeaders: {},
      kvStore: { get: async (key) => settings[key] },
      axios: {
        get: async (url) => {
          calls.push(url);
          for (const [part, data] of Object.entries(replies)) if (url.includes(part)) return { data };
          throw Error("Unexpected request " + url);
        },
      },
    },
  };
}

const film = {
  metadata: { title: "Night of the Living Dead", collection: ["feature_films"] },
  files: [
    { name: "night.mp4", format: "h.264", source: "original", size: "500000000", height: "480" },
    { name: "night.en.srt", format: "SubRip" },
    { name: "night_spanish.vtt", format: "Web Video Text Tracks" },
    { name: "night.thumbs/night_000001.srt" },
  ],
};

test("a film gets every subtitle with its language", async () => {
  const c = context({ "/metadata/night": film });
  const streams = await getStream({ link: "night", type: "movie", providerContext: c.ctx });
  assert.equal(streams.length, 1);
  assert.deepEqual(
    plain(streams[0].subtitles.map((s) => [s.title, s.language, s.type])),
    [
      ["English", "en", "application/x-subrip"],
      ["Spanish", "es", "text/vtt"],
    ],
  );
  assert.equal(streams[0].subtitles[0].uri, "https://archive.org/download/night/night.en.srt");
});

test("an episode only gets its own subtitles", async () => {
  const show = {
    metadata: { title: "Show", collection: ["classic_tv"] },
    files: [
      { name: "Ep1.mp4", source: "original" },
      { name: "Ep10.mp4", source: "original" },
      { name: "Ep1.en.srt" },
      { name: "Ep10.en.srt" },
      { name: "Ep10_french.srt" },
    ],
  };
  const c = context({ "/metadata/show": show });
  const streams = await getStream({ link: "show/Ep10.mp4", type: "series", providerContext: c.ctx });
  assert.deepEqual(plain(streams[0].subtitles.map((s) => s.uri.split("/").pop())), ["Ep10.en.srt", "Ep10_french.srt"]);
  const first = await getStream({ link: "show/Ep1.mp4", type: "series", providerContext: c.ctx });
  assert.deepEqual(plain(first[0].subtitles.map((s) => s.uri.split("/").pop())), ["Ep1.en.srt"]);
});

test("no subtitles means no subtitles field", async () => {
  const c = context({ "/metadata/plain": { metadata: { title: "Plain" }, files: [{ name: "plain.mp4" }] } });
  const [stream] = await getStream({ link: "plain", type: "movie", providerContext: c.ctx });
  assert.equal("subtitles" in stream, false);
});

test("speech-recognition captions get a readable title", async () => {
  const item = {
    metadata: { title: "About Bananas" },
    files: [{ name: "AboutBan1935.mp4" }, { name: "AboutBan1935.asr.srt" }, { name: "AboutBan1935.en.asr.srt" }],
  };
  const c = context({ "/metadata/AboutBan1935": item });
  const [stream] = await getStream({ link: "AboutBan1935", type: "movie", providerContext: c.ctx });
  assert.deepEqual(plain(stream.subtitles.map((s) => [s.title, s.language])), [
    ["Automatic captions", "und"],
    ["Automatic captions (English)", "en"],
  ]);
});

test("empty subtitle files are skipped and srt/vtt twins shown once", async () => {
  const item = {
    metadata: { title: "Doctor in Industry" },
    files: [
      { name: "Doctorin1946.mp4" },
      { name: "Doctorin1946.asr.srt", size: "14725" },
      { name: "Doctorin1946.asr.vtt", size: "14801" },
      { name: "Doctorin1946.en.srt", size: "0" },
    ],
  };
  const c = context({ "/metadata/Doctorin1946": item });
  const [stream] = await getStream({ link: "Doctorin1946", type: "movie", providerContext: c.ctx });
  assert.deepEqual(plain(stream.subtitles.map((s) => s.uri.split("/").pop())), ["Doctorin1946.asr.vtt"]);
});

test("subtitle language comes from the last word only", () => {
  assert.deepEqual(plain(api.subtitleLanguage("Film (Urdu).srt")), ["ur", "Urdu"]);
  assert.deepEqual(plain(api.subtitleLanguage("film.eng.srt")), ["en", "English"]);
  assert.equal(api.subtitleLanguage("It Happened One Night.srt"), undefined);
});

test("the sort setting changes the search order", async () => {
  const search = { response: { docs: [{ identifier: "a", title: "A", year: "1950" }] } };
  for (const [choice, expected] of [
    [undefined, "downloads desc"],
    ["addeddate", "addeddate desc"],
    ["avg_rating", "avg_rating desc"],
    ["newest", "date desc"],
    ["oldest", "date asc"],
    ["title", "titleSorter asc"],
    ["bogus", "downloads desc"],
  ]) {
    const c = context({ "advancedsearch.php": search }, { sort: choice });
    const posts = await getPosts({ filter: "collection:feature_films", page: 1, providerContext: c.ctx });
    assert.equal(posts[0].link, "a");
    assert.ok(c.calls[0].includes("sort[]=" + encodeURIComponent(expected)), c.calls[0]);
  }
});

test("settings offer the order choice", async () => {
  const schema = await getSettingsSchema({ providerContext: {} });
  const sort = schema.find((f) => f.key === "sort");
  assert.deepEqual(plain(sort.options.map((o) => o.value)), [
    "downloads",
    "addeddate",
    "avg_rating",
    "newest",
    "oldest",
    "title",
  ]);
  assert.equal(sort.defaultValue, "downloads");
  const quality = schema.find((f) => f.key === "quality");
  assert.deepEqual(plain(quality.options.map((o) => o.value)), ["auto", "1080", "720", "480", "360"]);
  assert.equal(quality.defaultValue, "auto");
});

test("episode links from getMeta find their own subtitles, even with % and spaces", async () => {
  for (const name of ["folder/Episode 1 100% complete.mp4", "Episode 1 literal%20 #?.mp4"]) {
    const base = name.replace(/\.mp4$/, "");
    const show = {
      metadata: { title: "Show", collection: ["classic_tv"] },
      files: [
        { name, source: "original" },
        { name: "Episode 2.mp4", source: "original" },
        { name: `${base}.en.srt`, size: "100" },
        { name: "Episode 2.en.srt", size: "100" },
      ],
    };
    const c = context({ "/metadata/show": show });
    const meta = await getMeta({ link: "show", providerContext: c.ctx });
    const episode = meta.linkList[0].directLinks.find((e) => e.title.includes("Episode 1"));
    const [stream] = await getStream({ link: episode.link, type: "series", providerContext: c.ctx });
    assert.equal(stream.subtitles.length, 1);
    assert.equal(decodeURIComponent(new URL(stream.subtitles[0].uri).pathname), `/download/show/${base}.en.srt`);
  }
});


test("episode subtitle matching and deduplication preserve season directories", async () => {
  const files = [
    { name: "Season 1/Episode 1.mp4", source: "original" },
    { name: "Season 2/Episode 1.mp4", source: "original" },
    { name: "Season 1/Episode 1.en.vtt", size: "100" },
    { name: "Season 2/Episode 1.en.srt", size: "100" },
    { name: "Season 2/Episode 1.en.vtt", size: "100" },
  ];
  const c = context({ "/metadata/show": { metadata: { title: "Show" }, files } });
  const [stream] = await getStream({
    link: "show/Season%202/Episode%201.mp4", type: "series", providerContext: c.ctx,
  });
  assert.deepEqual(plain(stream.subtitles.map((s) => s.uri)), [
    "https://archive.org/download/show/Season%202/Episode%201.en.vtt",
  ]);
  assert.equal(api.subtitleTracks("show", files).length, 2);
});

test("search splits a trailing year from the title words", () => {
  assert.deepEqual(plain(api.parseSearch("Dracula 1931")), { words: "Dracula", year: "1931" });
  assert.deepEqual(plain(api.parseSearch("1931")), { words: "", year: "1931" });
  assert.deepEqual(plain(api.parseSearch("Plan 9 from outer space")), { words: "Plan 9 from outer space" });
  assert.equal(api.buildSearchQuery("Dracula 1931"), "((title:(Dracula) OR creator:(Dracula)) AND year:1931 OR title:(Dracula 1931))");
  assert.equal(api.buildSearchQuery("1931"), "(year:1931 OR title:(1931))");
  assert.equal(api.buildSearchQuery("hitchcock"), "(title:(hitchcock) OR creator:(hitchcock))");
  assert.equal(api.buildSearchQuery("+-()"), "");
});

test("search results match titles and creators and ignore empty queries", async () => {
  const search = { response: { docs: [{ identifier: "a", title: "A" }] } };
  const c = context({ "advancedsearch.php": search });
  const { getSearchPosts } = load("providers/internetArchive/posts.ts");
  const posts = await getSearchPosts({ searchQuery: "hitchcock 1935", page: 2, providerContext: c.ctx });
  assert.equal(posts.length, 1);
  const query = decodeURIComponent(new URL(c.calls[0]).searchParams.get("q"));
  assert.ok(query.includes("(title:(hitchcock) OR creator:(hitchcock)) AND year:1935"), query);
  assert.ok(query.includes("mediatype:movies"), query);
  assert.ok(c.calls[0].includes("page=2"), c.calls[0]);
  const none = await getSearchPosts({ searchQuery: "  ", page: 1, providerContext: c.ctx });
  assert.deepEqual(plain(none), []);
  assert.equal(c.calls.length, 1);
});

test("duplicate search results are listed once", async () => {
  const search = {
    response: { docs: [{ identifier: "a", title: "A" }, { identifier: "a", title: "A" }, { identifier: "b" }] },
  };
  const c = context({ "advancedsearch.php": search });
  const posts = await getPosts({ filter: "collection:feature_films", page: 1, providerContext: c.ctx });
  assert.deepEqual(plain(posts.map((p) => [p.link, p.title])), [["a", "A"], ["b", "b"]]);
});

test("a failed request is retried once and then reported", async () => {
  let attempts = 0;
  const ctx = {
    commonHeaders: {},
    axios: {
      get: async () => {
        attempts += 1;
        if (attempts === 1) throw Object.assign(new Error("busy"), { response: { status: 503 } });
        return { data: { metadata: { title: "T" }, files: [{ name: "t.mp4" }] } };
      },
    },
  };
  const streams = await getStream({ link: "t", type: "movie", providerContext: ctx });
  assert.equal(attempts, 2);
  assert.equal(streams.length, 1);

  let missing = 0;
  const notFound = {
    commonHeaders: {},
    axios: {
      get: async () => {
        missing += 1;
        throw Object.assign(new Error("gone"), { response: { status: 404 } });
      },
    },
  };
  await assert.rejects(getStream({ link: "t", type: "movie", providerContext: notFound }), /gone/);
  assert.equal(missing, 1);

  let failures = 0;
  const down = {
    commonHeaders: {},
    axios: {
      get: async () => {
        failures += 1;
        throw new Error("offline");
      },
    },
  };
  await assert.rejects(getStream({ link: "t", type: "movie", providerContext: down }), /offline/);
  assert.equal(failures, 2);
});

test("the quality setting puts the closest resolution first", async () => {
  const item = {
    metadata: { title: "Film" },
    files: [
      { name: "film.mp4", source: "original", height: "1080", format: "h.264" },
      { name: "film.512kb.mp4", source: "derivative", original: "film.mp4", height: "360", format: "512Kb MPEG4" },
      { name: "film.ogv", source: "derivative", original: "film.mp4", height: "480", format: "Ogg Video" },
    ],
  };
  const heights = async (settings) => {
    const c = context({ "/metadata/film": item }, settings);
    const streams = await getStream({ link: "film", type: "movie", providerContext: c.ctx });
    return plain(streams.map((s) => s.quality));
  };
  assert.deepEqual(await heights({}), ["1080", "360", "480"]);
  assert.deepEqual(await heights({ quality: "auto" }), ["1080", "360", "480"]);
  assert.deepEqual(await heights({ quality: "480" }), ["480", "360", "1080"]);
  assert.deepEqual(await heights({ quality: "360" }), ["360", "480", "1080"]);
  assert.deepEqual(await heights({ quality: "1080" }), ["1080", "480", "360"]);
});

test("downloads still list the largest file first whatever the quality setting", async () => {
  const item = {
    metadata: { title: "Film" },
    files: [
      { name: "film.mp4", source: "original", height: "1080", size: "900" },
      { name: "film.512kb.mp4", source: "derivative", original: "film.mp4", height: "360", size: "100" },
    ],
  };
  const c = context({ "/metadata/film": item }, { quality: "360" });
  const streams = await getStream({ link: "film", type: "movie", isDownload: true, providerContext: c.ctx });
  assert.deepEqual(plain(streams.map((s) => s.quality)), ["1080", "360"]);
});

test("durations and runtimes are formatted for the details page", () => {
  assert.equal(api.parseDuration("5779.17"), 5779.17);
  assert.equal(api.parseDuration("1:36:19"), 5779);
  assert.equal(api.parseDuration("12:30"), 750);
  assert.equal(api.parseDuration(undefined), 0);
  assert.equal(api.formatRuntime(5779), "1h 36m");
  assert.equal(api.formatRuntime(7200), "2h");
  assert.equal(api.formatRuntime(1500), "25m");
  assert.equal(api.formatRuntime(30), "");
});

test("the details page lists the year, runtime and subjects as tags", async () => {
  const item = {
    metadata: { title: "Film", year: "1935", subject: "Horror; Classic", description: "A<br>B" },
    files: [
      { name: "film.mp4", source: "original", length: "5779.17" },
      { name: "film.ogv", source: "derivative", original: "film.mp4", length: "5779.20" },
    ],
  };
  const cheerio = require("cheerio");
  const c = context({ "/metadata/film": item });
  const meta = await getMeta({ link: "film", providerContext: { ...c.ctx, cheerio } });
  assert.deepEqual(plain(meta.tags), ["1935", "1h 36m", "Horror", "Classic"]);
  assert.equal(meta.type, "movie");
  assert.equal(meta.synopsis, "A\nB");
});

test("catalog rows and genres are well formed", () => {
  const { catalog, genres } = load("providers/internetArchive/catalog.ts");
  for (const entry of [...catalog, ...genres]) {
    assert.ok(entry.title && entry.filter, JSON.stringify(entry));
  }
  const titles = [...catalog, ...genres].map((e) => e.title);
  assert.ok(titles.includes("1950s Films"));
  assert.equal(
    plain(genres).find((g) => g.title === "1950s Films").filter,
    "collection:feature_films AND year:[1950 TO 1959]",
  );
  assert.equal(new Set(plain(catalog).map((e) => e.title)).size, catalog.length);
  assert.equal(new Set(plain(genres).map((e) => e.title)).size, genres.length);
});

 test("numeric titles remain searchable alongside the year shortcut", () => {
  assert.equal(api.buildSearchQuery("1984"), "(year:1984 OR title:(1984))");
  assert.equal(api.buildSearchQuery("Class of 1984"), "((title:(Class of) OR creator:(Class of)) AND year:1984 OR title:(Class of 1984))");
});
