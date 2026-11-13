const assert = require('node:assert/strict');
const {test} = require('node:test');
const {buildSync} = require('esbuild');
const vm = require('node:vm');
const cheerio = require('cheerio');
function load(part) {
  const m = {exports: {}};
  const code = buildSync({entryPoints: [`providers/durbinLive/${part}.ts`], bundle: true, platform: 'browser', format: 'cjs', write: false}).outputFiles[0].text;
  vm.runInNewContext(code, {module: m, exports: m.exports, URL, Error});
  return m.exports;
}
function ctx(get) {return {axios: {get}, cheerio, commonHeaders: {'User-Agent': 'Vega UA'}};}
const card = '<a href="/livetv/details/channel/1"><img src="/logo.png" alt="Channel"><h3>Channel</h3></a>';

test('DurbinLive preserves category filters during pagination and deduplicates cards', async () => {
  const {getPosts} = load('posts');
  const c = ctx(async (url, config) => {
    assert.equal(new URL(url).searchParams.get('cat_id'), '6');
    assert.equal(new URL(url).searchParams.get('page'), '2');
    assert.equal(config.headers['User-Agent'], 'Vega UA');
    return {data: card + card + '<div class="pagination"><a class="active">2</a></div>'};
  });
  const posts = await getPosts({filter: '/livetv?cat_id=6', page: 2, providerContext: c});
  assert.equal(posts.length, 1);
  assert.equal(posts[0].link, 'https://durbinlive.live/livetv/details/channel/1');
  assert.equal(posts[0].image, 'https://durbinlive.live/logo.png');
});
test('DurbinLive rejects repeated last pages and does not repeat unpaginated search results', async () => {
  const api = load('posts');let calls = 0;
  const c = ctx(async () => {calls++;return {data: card + '<div class="pagination"><a class="active">4</a></div>'};});
  assert.equal((await api.getPosts({filter: '/livetv', page: 5, providerContext: c})).length, 0);
  assert.equal((await api.getSearchPosts({searchQuery: 'Sports', page: 2, providerContext: c})).length, 0);
  assert.equal(calls, 1);
});
test('DurbinLive searches the site autocomplete and parses image-only result cards', async () => {
  const {getSearchPosts} = load('posts');
  const c = ctx(async url => {
    assert.equal(new URL(url).pathname, '/search_elastic');
    assert.equal(new URL(url).searchParams.get('s'), 'T Sports');
    return {data: '<a href="/sports/details/t-sports/26"><img title="T Sports" src="//cdn.example/logo.png"></a>'};
  });
  const posts = await getSearchPosts({searchQuery: 'T Sports', page: 1, providerContext: c});
  assert.equal(posts[0].title, 'T Sports');
  assert.equal(posts[0].image, 'https://cdn.example/logo.png');
});
test('DurbinLive metadata provides a public watch page using Vega movie link format', async () => {
  const {getMeta} = load('meta');
  const c = ctx(async () => ({data: '<div class="poster-dtl-item"><h2>Channel</h2><h3>Live cricket</h3></div><ul class="dtl-list-link"><a>Cricket</a></ul><div class="dtl-poster-img"><img src="/logo.png"></div><a href="/livetv/watch/channel/1">Play</a>'}));
  const meta = await getMeta({link: '/livetv/details/channel/1', providerContext: c});
  assert.equal(meta.title, 'Channel');
  assert.equal(meta.synopsis, 'Live cricket');
  assert.equal(meta.type, 'movie');
  assert.equal(meta.linkList[0].directLinks[0].link, 'https://durbinlive.live/livetv/watch/channel/1');
});
test('DurbinLive follows player iframes and keeps all accessible HLS sources', async () => {
  const {getStream} = load('stream');
  const c = ctx(async url => {
    if (url.endsWith('/livetv/watch/channel/1')) return {data: '<iframe src="https://player.example/embed"></iframe><iframe src="https://player.example/query?url=https%3A%2F%2Fcdn.example%2Fsecond.m3u8"></iframe>'};
    assert.equal(url, 'https://player.example/embed');
    return {data: '<script>new Clappr.Player({source:"https://cdn.example/live.m3u8?token=a&b=c"})</script>'};
  });
  const streams = await getStream({link: '/livetv/details/channel/1', providerContext: c});
  assert.equal(streams.length, 2);
  assert.equal(streams[0].link, 'https://cdn.example/live.m3u8?token=a&b=c');
  assert.equal(streams[0].headers.Origin, 'https://player.example');
  assert.equal(streams[1].link, 'https://cdn.example/second.m3u8');
});
test('DurbinLive rejects invalid DRM instead of returning a bare encrypted DASH URL', async () => {
  const {getStream} = load('stream');
  const key = 'PublicWrapper';
  const plain = 'const mpdUrl="https://cdn.example/encrypted.mpd";const config={drm:{clearKeys:{key:"value"}}};';
  const encrypted = Buffer.from(Array.from(plain, (c,i)=>c.charCodeAt(0)^key.charCodeAt(i%key.length))).toString('base64');
  const c = ctx(async () => ({data: `<script>const decryptionKey="${key}";let encrypted="${encrypted}";</script>`}));
  await assert.rejects(getStream({link: 'https://player.example/channel', providerContext: c}), /supported DRM configuration/);
});
test('DurbinLive bounds recursive iframes and reports inaccessible players', async () => {
  const {getStream} = load('stream');let calls = 0;
  const c = ctx(async () => {calls++;return {data: '<iframe src="https://player.example/loop"></iframe>'};});
  await assert.rejects(getStream({link:'https://player.example/loop',providerContext:c}), /No accessible live stream/);
  assert.equal(calls, 1);
});

test('DurbinLive refreshes encoded ClearKey configuration for every playback', async () => {
  const {getStream} = load('stream');
  const kid = '00112233445566778899aabbccddeeff';
  const keys = ['ffeeddccbbaa99887766554433221100', '11223344556677889900aabbccddeeff'];
  let calls = 0;
  const c = ctx(async () => {
    const key = keys[calls++];
    const plain = `const mpdUrl='https://cdn.example/live.mpd';const kid='${kid}';const key='${key}';const cfg={drm:{clearKeys:{[kid]:key}}};`;
    const wrapperKey = 'PublicWrapper';
    const encrypted = Buffer.from(Array.from(plain, (ch,i)=>ch.charCodeAt(0)^wrapperKey.charCodeAt(i%wrapperKey.length))).toString('base64');
    return {data: `<script>const decryptionKey='${wrapperKey}';let encrypted='${encrypted}';</script>`};
  });
  for (const expected of keys) {
    const streams = await getStream({link:'https://player.example/channel',providerContext:c});
    assert.equal(streams.length, 1);
    assert.equal(streams[0].type, 'mpd');
    assert.equal(streams[0].drm.type, 'clearkey');
    assert.equal(streams[0].drm.clearKeys[kid], expected);
    assert.equal(streams[0].drm.licenseServer, undefined);
    assert.equal(streams[0].headers.Origin, 'https://player.example');
    assert.deepEqual(JSON.parse(JSON.stringify(streams[0].drm)), {type:'clearkey',clearKeys:{[kid]:expected}});
  }
  assert.equal(calls, 2);
});

test('DurbinLive handles multiple inline keys and omits DRM streams from downloads', async () => {
  const {getStream} = load('stream');
  const kid = '00112233445566778899aabbccddeeff';
  const second = '11223344556677889900aabbccddeeff';
  const c = ctx(async () => ({data: `<script>const source='https://cdn.example/live.mpd';const cfg={drm:{clearKeys:{'${kid}':'${second}','${second}':'${kid}'}}};</script>`}));
  const streams = await getStream({link:'https://player.example/channel',providerContext:c});
  assert.equal(Object.keys(streams[0].drm.clearKeys).length, 2);
  assert.equal((await getStream({link:'https://player.example/channel',isDownload:true,providerContext:c})).length, 0);
});

test('DurbinLive keeps clear HLS mirrors available when downloading a mixed channel', async () => {
  const {getStream} = load('stream');
  const c = ctx(async url => {
    if (url.endsWith('/watch')) return {data:'<iframe src="/protected"></iframe><iframe src="/clear"></iframe>'};
    if (url.endsWith('/protected')) return {data:'<script>const url="https://cdn.example/encrypted.mpd";const cfg={drm:{clearKeys:{"00112233445566778899aabbccddeeff":"ffeeddccbbaa99887766554433221100"}}};</script>'};
    return {data:'<source src="https://cdn.example/clear.m3u8">'};
  });
  const streams = await getStream({link:'https://player.example/watch',isDownload:true,providerContext:c});
  assert.equal(streams.length, 1);
  assert.equal(streams[0].link, 'https://cdn.example/clear.m3u8');
  assert.equal(streams[0].drm, undefined);
});
