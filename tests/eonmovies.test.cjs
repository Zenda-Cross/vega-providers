const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const {buildSync} = require('esbuild');
const cheerio = require('cheerio');
function load(part) {
  const code = buildSync({entryPoints: [`providers/eonMovies/${part}.ts`], bundle: true, platform: 'browser', format: 'cjs', write: false}).outputFiles[0].text;
  const module = {exports: {}};
  vm.runInNewContext(code, {module, exports: module.exports, URL, URLSearchParams,
    ...(part === 'stream' ? {} : {fetch: async () => ({ok: true, json: async () => ({eonMovies: {url: 'https://eon.example'}})})}),
  });
  return module.exports;
}
const context = axios => ({axios, cheerio, commonHeaders: {'User-Agent': 'Test UA'}});
const modern = {
  get: async url => {
    if (url.includes('/share/')) return {data: '', headers: {}};
    if (url.includes('/api/share-status/')) return {data: {success: true, data: {filename: 'Movie.1080p.mp4', fileType: 'mp4'}}};
    throw Error('Unexpected GET ' + url);
  },
  post: async url => {
    if (url.endsWith('/api/generate-direct-drive-download')) return {data: {success: true, workerUrl: 'https://cdn.example/resume'}};
    if (url.endsWith('/api/generate-quick-download')) return {data: {success: true, workerUrl: 'https://cdn.example/quick'}};
    throw Error('Unexpected POST ' + url);
  },
};
test('EonMovies follows the mirror chooser and survives a blocked first mirror without global fetch', async () => {
  const {getStream} = load('stream');
  const calls = [];
  const axios = {...modern, get: async (url, config) => {
    calls.push(url);
    if (url === 'https://eon.example/dl/quality') return {status: 302, headers: {location: '/links/choice'}};
    if (url === 'https://eon.example/links/choice') return {data: '<title>Movie.720p.mkv</title><a class="dl-btn-host" href="/dl/blocked">TMBCloud</a><a class="dl-btn-host" href="/dl/working">Dotflix</a>'};
    if (url.endsWith('/dl/blocked')) throw {response: {status: 403}};
    if (url.endsWith('/dl/working')) return {status: 302, headers: {location: 'https://dotflix.example/share/ABC123'}};
    return modern.get(url, config);
  }};
  const streams = await getStream({link: 'https://eon.example/dl/quality', type: 'movie', providerContext: context(axios)});
  assert.equal(streams.length, 2);
  assert.equal(streams[0].type, 'mp4');
  assert.equal(streams[0].quality, '720');
  assert.ok(calls.includes('https://eon.example/dl/blocked'));
  assert.ok(calls.includes('https://eon.example/dl/working'));
});
test('Dotflix returns both modern servers and detects ZIP archives with opaque download URLs', async () => {
  const {getStream} = load('stream');
  const axios = {...modern, get: async () => ({data: {success: true, data: {filename: 'Show.S01.zip', fileType: 'zip'}}})};
  const streams = await getStream({link: 'https://dotflix.example/share/ABC123', type: 'series', isDownload: true, providerContext: context(axios)});
  assert.equal(streams.length, 2);
  assert.ok(streams.every(s => s.type === 'zip'));
});
test('Dotflix retains its older API fallback when modern endpoints are unavailable', async () => {
  const {getStream} = load('stream');
  const axios = {
    get: async url => {
      if (url === 'https://dotflix.example/share/OLD123') return {data: ''};
      throw {response: {status: 404}};
    },
    post: async url => {
      if (url.endsWith('/api/extract-download')) return {data: {success: true, downloadUrl: 'https://cdn.example/movie.mkv'}};
      throw {response: {status: 404}};
    },
  };
  const streams = await getStream({link: 'https://dotflix.example/share/OLD123', type: 'movie', providerContext: context(axios)});
  assert.equal(streams.length, 1);
  assert.equal(streams[0].link, 'https://cdn.example/movie.mkv');
});
test('EonMovies bounds cyclic mirror menus instead of fetching indefinitely', async () => {
  const {getStream} = load('stream');
  let calls = 0;
  const axios = {get: async () => {calls++;return {data: '<a class="dl-btn-host" href="/dl/cycle">Again</a>'};}};
  assert.equal((await getStream({link: 'https://eon.example/dl/cycle', type: 'movie', providerContext: context(axios)})).length, 0);
  assert.equal(calls, 1);
});
test('EonMovies recognizes seasons even when the site labels them Movie', async () => {
  const {getMeta} = load('meta');
  const axios = {get: async (_url, config) => {
    assert.equal(config.headers['User-Agent'], 'Test UA');
    return {data: '<meta property="og:title" content="Show - Season 1 (2020) - Download in HD | EonMovies"><div class="meta-pills">Movie</div><div class="dl-row" data-dlname="720p"><a href="/dl/720">Download</a></div>'};
  }};
  const meta = await getMeta({link: '/show', providerContext: context(axios)});
  assert.equal(meta.type, 'series');
  assert.equal(meta.linkList[0].directLinks[0].link, 'https://eon.example/dl/720');
});

test('Dotflix alias redirects are resolved before download API POSTs', async () => {
  const {getStream} = load('stream');
  const posts = [];
  const axios = {
    get: async (url, config) => {
      assert.equal(config.maxRedirects, url.includes('/share/') ? 0 : undefined);
      if (url === 'https://dtflix.site/share/ABC123') return {status: 301, headers: {location: 'https://dotflix.fit/share/ABC123'}};
      if (url === 'https://dotflix.fit/share/ABC123') return {data: '', headers: {}};
      return modern.get(url);
    },
    post: async (url, body, config) => {
      posts.push(url);
      assert.equal(new URL(url).origin, 'https://dotflix.fit');
      assert.equal(config.headers.Origin, 'https://dotflix.fit');
      assert.equal(config.headers.Referer, 'https://dotflix.fit/share/ABC123');
      assert.equal(body.sharingCode, 'ABC123');
      return modern.post(url);
    },
  };
  const streams = await getStream({link: 'https://dtflix.site/share/ABC123', type: 'movie', providerContext: context(axios)});
  assert.equal(streams.length, 2);
  assert.equal(posts.length, 2);
});

test('Dotflix uses the final share URL when the app transport follows redirects itself', async () => {
  const {getStream} = load('stream');
  const axios = {...modern,
    get: async url => url.includes('/share/') ? {data: '', request: {responseURL: 'https://dotflix.fit/share/ABC123'}} : modern.get(url),
    post: async (url, body, config) => {
      assert.equal(new URL(url).origin, 'https://dotflix.fit');
      return modern.post(url, body, config);
    },
  };
  assert.equal((await getStream({link: 'https://dtflix.site/share/ABC123', type: 'movie', providerContext: context(axios)})).length, 2);
});

test('EonMovies preserves nonstandard 612p resolutions from the release filename', async () => {
  const {getStream} = load('stream');
  const axios = {...modern, get: async url => {
    if (url.includes('/share/')) return {data: ''};
    return {data: {success: true, data: {filename: 'Movie.612p.HEVC.mkv', fileType: 'mkv'}}};
  }};
  const streams = await getStream({link: 'https://dotflix.fit/share/ABC123', type: 'movie', providerContext: context(axios)});
  assert.ok(streams.every(s => s.quality === '612' && s.server.endsWith('612p')));
});
