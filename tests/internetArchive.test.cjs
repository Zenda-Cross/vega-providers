// Offline tests for the Internet Archive provider: axios is replaced by a
// fake, so they need no network. Run with `npm run test:unit`.
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

// Values made inside the vm have their own Array prototype; copy them out
// before deepEqual compares prototypes.
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
  // Seen on archive.org: items get "<name>.asr.srt" made by Internet Archive.
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
  // Both seen on archive.org (AboutBan1935, Doctorin1946).
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
  // "It" is Italian's code, but here it is part of the title.
  assert.equal(api.subtitleLanguage("It Happened One Night.srt"), undefined);
});

test("the sort setting changes the search order", async () => {
  const search = { response: { docs: [{ identifier: "a", title: "A", year: "1950" }] } };
  for (const [choice, expected] of [
    [undefined, "downloads desc"],
    ["addeddate", "addeddate desc"],
    ["avg_rating", "avg_rating desc"],
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
  assert.deepEqual(plain(sort.options.map((o) => o.value)), ["downloads", "addeddate", "avg_rating"]);
  assert.equal(sort.defaultValue, "downloads");
});

test("episode links from getMeta find their own subtitles, even with % and spaces", async () => {
  // getMeta URL-encodes episode links; getStream must decode them once and
  // still match the subtitles named after the episode.
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
