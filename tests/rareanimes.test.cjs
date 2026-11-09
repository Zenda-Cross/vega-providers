const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const {buildSync} = require('esbuild');
const cheerio = require('cheerio');
function load(entry) {
  const code = buildSync({entryPoints: [entry], bundle: true, platform: 'browser', format: 'cjs', write: false}).outputFiles[0].text;
  const module = {exports: {}};
  vm.runInNewContext(code, {
    module, exports: module.exports, URL, atob, setTimeout, clearTimeout,
    console: {log() {}, warn() {}, error() {}},
    fetch: async () => ({ok: true, json: async () => ({RareAnimes: {url: 'https://rare.example'}})}),
  });
  return module.exports;
}
test('Series catalog pagination preserves the query instead of appending to the search term', async () => {
  const {getPosts, getSearchPosts} = load('providers/rareanimes/posts.ts');
  const calls = [];
  const providerContext = {cheerio, axios: {get: async url => {calls.push(url); return {data: '<article class="herald-post"><h2 class="entry-title"><a href="/show/">Show</a></h2><img src="/poster.jpg"></article>'};}}};
  const first = await getPosts({filter: '?s=series', page: 1, providerContext});
  await getPosts({filter: '?s=series', page: 2, providerContext});
  await getPosts({filter: 'home/', page: 2, providerContext});
  await getSearchPosts({searchQuery: 'Hindi dub', page: 2, providerContext});
  assert.deepEqual(calls, [
    'https://rare.example/?s=series',
    'https://rare.example/page/2/?s=series',
    'https://rare.example/home/page/2/',
    'https://rare.example/page/2/?s=Hindi%20dub',
  ]);
  assert.equal(first[0].link, 'https://rare.example/show/');
  assert.equal(first[0].image, 'https://rare.example/poster.jpg');
});

test('HubCloud can solve a 403 and apply RareAnimes download preferences', async () => {
  const {getStream} = load('providers/rareanimes/stream.ts');
  const start = 'https://hubcloud.example/drive/file';
  let solverCalls = 0, firstCalls = 0;
  const keys = [];
  const axios = async (url, config) => {
    if (url === start) {
      if (++firstCalls === 1) throw {response: {status: 403}};
      assert.match(config.headers.Cookie, /cf_clearance=verified/);
      return {data: '<script>var url = "https://hubcloud.example/files";</script>'};
    }
    assert.equal(url, 'https://hubcloud.example/files');
    return {data: '<a class="btn-success btn-lg h6" href="https://cdn.cloudflarestorage.example/file.mkv">Storage</a><a class="btn-success btn-lg h6" href="https://file.workers.dev/file.mkv">Worker</a>'};
  };
  axios.get = axios;
  const streams = await getStream({link: start, type: 'series', isDownload: true, providerContext: {
    axios, cheerio, commonHeaders: {},
    kvStore: {get: async key => {keys.push(key);return key === 'rareanimes_preferredDownloadServer' ? 'CF Worker' : undefined;}},
    openWebView: async (url, options) => {
      solverCalls++;
      assert.equal(url, 'https://hubcloud.example');
      assert.equal(options.waitForCookie, 'cf_clearance');
      return {cookies: 'cf_clearance=verified', userAgent: 'Verified UA'};
    },
  }});
  assert.equal(solverCalls, 1);
  assert.equal(firstCalls, 2);
  assert.equal(streams.length, 2);
  assert.equal(streams[0].server, 'CF Worker');
  assert.ok(keys.includes('rareanimes_preferredDownloadServer'));
});
