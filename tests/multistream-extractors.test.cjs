const assert = require('node:assert/strict');
const {test} = require('node:test');
const crypto = require('node:crypto');
const vm = require('node:vm');
const {buildSync} = require('esbuild');

function load(entry) {
  const code = buildSync({entryPoints: [entry], bundle: true, platform: 'browser', format: 'cjs', write: false}).outputFiles[0].text;
  const module = {exports: {}};
  // Deliberately omit require, Buffer, atob, WebCrypto and TextDecoder.
  vm.runInNewContext(code, {module, exports: module.exports, URLSearchParams, console});
  return module.exports;
}
function encrypt(url) {
  const pass = '7f4c9e2a81d63b05c4f7a9e8126d3b50e1a8c7f23d9465ab0c6e9f1d4a7b832c';
  const salt = Buffer.from('12345678');
  let previous = Buffer.alloc(0), derived = Buffer.alloc(0);
  while (derived.length < 48) {
    previous = crypto.createHash('md5').update(Buffer.concat([previous, Buffer.from(pass), salt])).digest();
    derived = Buffer.concat([derived, previous]);
  }
  const cipher = crypto.createCipheriv('aes-256-cbc', derived.subarray(0, 32), derived.subarray(32, 48));
  return Buffer.concat([Buffer.from('Salted__'), salt, cipher.update(url), cipher.final()]).toString('base64');
}
for (const type of ['movie', 'series']) {
  test(`Vidstuck resolves ${type} streams with the current player protocol in the sandbox`, async () => {
    const {extractVidstuckStreams} = load('providers/extractors/vidstuck.ts');
    const calls = [];
    const axios = {
      post: async (url, body) => {
        assert.equal(url, 'https://vidstuck.cc/backend/raider');
        assert.equal(body.a7f39c821d604e5b91e57b, 550);
        assert.equal(body.c81306d28147a35632e816b, type === 'movie' ? 'movie' : 'tv');
        assert.ok(body['6b491e258392e7561a9384c']);
        if (type === 'series') {
          assert.equal(body.d8427b5c382f957c3613e85b, 2);
          assert.equal(body['91c6ea75d1f785c92346b713d'], 3);
        }
        return {data: {token: 'fresh-token', ts: 123}};
      },
      get: async url => {
        const u = new URL(url); calls.push(u);
        assert.equal(u.searchParams.get('c492f7a183d01e36c538a716d'), 'fresh-token');
        assert.equal(u.searchParams.get('61d9a5274c8e3b2f38291e6'), '123');
        assert.equal(u.searchParams.get('e16493139e5814b3027'), '1999-10-15');
        if (u.pathname === '/backend/subtitle') return {data: {captions: [{display: 'English', file: 'https://cdn.example/en.vtt'}]}};
        assert.equal(u.searchParams.get('f35a8194265e871c4933a725f'), 'tt0137523');
        return {data: {links: [{link: encrypt('/video/test.m3u8'), type: 'hls'}]}};
      },
    };
    const result = await extractVidstuckStreams({tmdbId: '550', imdbId: 'tt0137523', title: 'Fight Club', date: '1999-10-15', season: 2, episode: 3, type, providerContext: {axios, commonHeaders: {}}});
    assert.equal(result.length, 5);
    assert.equal(calls.length, 6);
    for (const stream of result) {
      assert.equal(stream.link, 'https://vidstuck.cc/video/test.m3u8');
      assert.equal(stream.type, 'm3u8');
      assert.equal(stream.subtitles[0].uri, 'https://cdn.example/en.vtt');
    }
  });
}

test('Movy refreshes a rejected seed once for concurrent servers and retries once', async () => {
  const {extractMovyStreams} = load('providers/extractors/movy.ts');
  let seeds = 0, initial = 0, retries = 0;
  const axios = {get: async (url, config) => {
    if (url.includes('/seed?')) return {data: {seed: ++seeds === 1 ? 'old' : 'new', ttlMs: 30000}};
    if (config.params.seed === 'old') { initial++; throw {response: {status: 401}}; }
    assert.equal(config.params.seed, 'new'); retries++;
    if (url.includes('/miami/')) return {data: '/a3h8or/3D+AFwkzD1sspYpubnaqBa4zTiTxgOXXdmc26Egl92BWQYCYMUFV9HNTAAKMB8RGmgbExESz2y4NcPdlF3pEaKFrvZCKQA=='};
    throw {response: {status: 401}};
  }};
  const result = await extractMovyStreams({tmdbId: '550', type: 'movie', providerContext: {axios, commonHeaders: {}}});
  assert.equal(result.length, 1);
  assert.equal(result[0].link, 'https://cdn.example/video.m3u8');
  assert.equal(seeds, 2);
  assert.equal(initial, 11);
  assert.equal(retries, 11);
});

test('Cinejoy uses the current server list immediately and skips failed HLS manifests', async () => {
  const code = buildSync({entryPoints: ['providers/extractors/cinejoy.ts'], bundle: true, platform: 'browser', format: 'cjs', write: false}).outputFiles[0].text;
  const module = {exports: {}};
  vm.runInNewContext(code, {module, exports: module.exports, console, setTimeout, clearTimeout});
  let directoryCalls = 0;
  const axios = {get: async url => {
    if (url.includes('/chunks/')) return {data: `/* WebAssembly +"/g" */
      function pW(server, id) { return {stream: [{type: 'hls', playlist: 'https://cdn.example/' + server + '.m3u8'}]}; }
    `};
    if (url.endsWith('/servers')) { directoryCalls++; return {data: {servers: [{name: 'secret', '4k': true}, {name: 'Solara'}, {name: 'Lisbon'}]}}; }
    if (url.includes('/subtitles?')) return {data: []};
    if (url.endsWith('/secret.m3u8')) return {data: '#EXTM3U\n#EXTINF:5,\nsegment.ts'};
    if (url.endsWith('/Solara.m3u8')) throw {response: {status: 502}};
    throw Error('Unexpected URL ' + url);
  }};
  for (let i = 0; i < 2; i++) {
    const result = await module.exports.extractCinejoyStreams({tmdbId: '550', type: 'movie', providerContext: {axios, commonHeaders: {}}});
    assert.equal(result.length, 1);
    assert.equal(result[0].server, 'Cinejoy - secret (4K)');
    assert.equal(result[0].quality, '2160');
  }
  assert.equal(directoryCalls, 1);
});
