const assert = require('node:assert/strict');
const {test} = require('node:test');
const crypto = require('node:crypto');
const vm = require('node:vm');
const {buildSync} = require('esbuild');

function load(entry) {
  const code = buildSync({entryPoints: [entry], bundle: true, platform: 'browser', format: 'cjs', write: false}).outputFiles[0].text;
  const module = {exports: {}};
  // Deliberately omit require, Buffer, atob, WebCrypto and TextDecoder.
  vm.runInNewContext(code, {module, exports: module.exports, URL, URLSearchParams, console});
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
function decrypt(b64) {
  const pass = '7f4c9e2a81d63b05c4f7a9e8126d3b50e1a8c7f23d9465ab0c6e9f1d4a7b832c';
  const raw = Buffer.from(b64, 'base64');
  assert.equal(raw.subarray(0, 8).toString('utf8'), 'Salted__');
  const salt = raw.subarray(8, 16);
  let previous = Buffer.alloc(0), derived = Buffer.alloc(0);
  while (derived.length < 48) {
    previous = crypto.createHash('md5').update(Buffer.concat([previous, Buffer.from(pass), salt])).digest();
    derived = Buffer.concat([derived, previous]);
  }
  const decipher = crypto.createDecipheriv('aes-256-cbc', derived.subarray(0, 32), derived.subarray(32, 48));
  return Buffer.concat([decipher.update(raw.subarray(16)), decipher.final()]).toString('utf8');
}
for (const type of ['movie', 'series']) {
  test(`Vidstuck resolves ${type} streams with the current player protocol in the sandbox`, async () => {
    const {extractVidstuckStreams} = load('providers/extractors/vidstuck.ts');
    const calls = [];
    const axios = {
      post: async (url, body) => {
        assert.equal(url, 'https://vidstuck.cc/backend/andromeda');
        assert.equal(body.a7f39c821d604e5b9157b, '550');
        assert.equal(body.c1306d28147a35632e816b, type === 'movie' ? 'movie' : 'tv');
        assert.ok(body['6b491e28392e7561a9384c']);
        assert.equal(typeof body.meow, 'string');
        assert.ok(body.meow.startsWith('U2FsdGVkX1'));
        const decodedMeow = JSON.parse(decrypt(body.meow));
        assert.equal(decodedMeow.id, '550');
        assert.equal(decodedMeow.media_type, type === 'movie' ? 'movie' : 'tv');
        assert.equal(decodedMeow.path, body['6b491e28392e7561a9384c']);
        if (type === 'series') {
          assert.equal(body.d8427b5c82f957c3613e85b, 2);
          assert.equal(body['91c6ea5d1f785c92346b713d'], 3);
          assert.equal(decodedMeow.season, 2);
          assert.equal(decodedMeow.episode, 3);
        }
        return {data: {token: 'fresh-token', ts: 123}};
      },
      get: async url => {
        const u = new URL(url); calls.push(u);
        assert.equal(u.searchParams.get('c492f7a183d0e36c538a716d'), 'fresh-token');
        assert.equal(u.searchParams.get('61d9a5274c8e3b2f8291e6'), '123');
        assert.equal(u.searchParams.get('e1649139e5814b3027'), '1999-10-15');
        if (u.pathname === '/backend/subtitle') return {data: {captions: [{id: 'en', display: 'English', file: 'https://cdn.example/en.vtt'}]}};
        if (type === 'movie') {
          assert.equal(u.searchParams.get('f35a814265e871c4933a725f'), 'tt0137523');
        }
        const encrypted = u.pathname.endsWith('/andromeda')
          ? 'xArD_' + Buffer.from(encrypt('/video/test.m3u8')).toString('base64')
          : encrypt('/video/test.m3u8');
        return {data: {links: [{link: encrypted, type: 'hls'}]}};
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

test('Cinejoy discovers player chunk, resolves active servers, and caches chunk', async () => {
  const code = buildSync({entryPoints: ['providers/extractors/cinejoy.ts'], bundle: true, platform: 'browser', format: 'cjs', write: false}).outputFiles[0].text;
  const module = {exports: {}};
  vm.runInNewContext(code, {module, exports: module.exports, console, setTimeout, clearTimeout});
  let directoryCalls = 0;
  let chunkCalls = 0;
  const fakeChunk = [
    '/* WebAssembly */',
    'async function _W(a,b,c,d){return {result:{url:"https://cdn.example/"+(typeof d==="string"?d:"x")+".m3u8",sourceType:"hls",captions:[]},providers:[],failure:null}}',
    'export{_W as s};',
  ].join('\n');
  const axios = {get: async url => {
    if (url === 'https://cinejoy.pk/' || url === 'https://cinejoy.pk') {
      return {data: '<html><script src="/_app/immutable/entry/app.TEST.js"></script></html>'};
    }
    if (url.endsWith('/_app/immutable/entry/app.TEST.js')) {
      return {data: 'const nodes=["nodes/28.TEST.js","nodes/29.TEST.js"];const routes={"/watch/movie/[id]":[28],"/watch/tv/[id]":[29]};'};
    }
    if (url.endsWith('/_app/immutable/nodes/28.TEST.js') || url.endsWith('/_app/immutable/nodes/29.TEST.js')) {
      return {data: 'import "../chunks/player.js";'};
    }
    if (url.endsWith('/_app/immutable/chunks/player.js')) {
      chunkCalls++;
      return {data: fakeChunk};
    }
    if (url === 'https://api2.wing.st/servers') {
      directoryCalls++;
      return {data: {servers: [{name: 'Light', '4k': true, status: 'ok'}, {name: 'Nebula', status: 'ok'}, {name: 'Dead', status: 'offline'}]}};
    }
    if (url.includes('subs.wing.st/subtitles?')) {
      return {data: {total: 1, subtitles: [{language: 'English', url: 'https://subs.example/en.vtt'}]}};
    }
    if (url.endsWith('/Light.m3u8') || url.endsWith('/Nebula.m3u8')) {
      return {data: '#EXTM3U\n#EXTINF:5,\nsegment.ts'};
    }
    throw Error('Unexpected URL ' + url);
  }};
  for (let i = 0; i < 2; i++) {
    const result = await module.exports.extractCinejoyStreams({tmdbId: '550', type: 'movie', providerContext: {axios, commonHeaders: {}}});
    assert.equal(result.length, 2);
    const light = result.find(s => s.server === 'Cinejoy - Light (4K)');
    const nebula = result.find(s => s.server === 'Cinejoy - Nebula');
    assert.ok(light);
    assert.ok(nebula);
    assert.equal(light.quality, '2160');
    assert.equal(nebula.quality, '1080');
    assert.equal(light.subtitles[0].uri, 'https://subs.example/en.vtt');
    assert.equal(nebula.subtitles[0].uri, 'https://subs.example/en.vtt');
  }
  const series = await module.exports.extractCinejoyStreams({tmdbId: '1399', type: 'series', season: 1, episode: 1, providerContext: {axios, commonHeaders: {}}});
  assert.equal(series.length, 2);
  assert.equal(chunkCalls, 1);
  assert.equal(directoryCalls, 1);
});

test('111477 uses the configured series route and retains direct file metadata', async () => {
  const {extractSt111477Streams} = load('providers/extractors/st111477.ts');
  const signal = new AbortController().signal;
  const streams = await extractSt111477Streams({
    imdbId:'tt12345',tmdbId:'12',season:2,episode:3,isMovie:false,signal,
    providerContext:{
      kvStore:{get:async key => key.endsWith('Manifest') ? 'stremio://st.111477.xyz/config/example_token/manifest.json' : undefined},
      axios:{get:async (url, opts) => {
        assert.equal(url,'https://st.111477.xyz/config/example_token/stream/series/tt12345:2:3.json');
        assert.equal(opts.signal,signal);
        return {data:{streams:[
          {url:'https://st.111477.xyz/slowdown',title:'Rate limited'},
          {url:'https://video.example/file',title:'Episode.1080p.mkv [a11 2.6 GB]'},
          {url:'https://video.example/file',title:'Duplicate'},
        ]}};
      }},
    },
  });
  assert.equal(streams.length,1);
  assert.equal(streams[0].type,'mkv');
  assert.equal(streams[0].quality,'1080');
  assert.equal(streams[0].tag,'2.6 GB');
});
