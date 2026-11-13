const {test} = require('node:test');
const assert = require('node:assert/strict');
const {buildSync} = require('esbuild');
const vm = require('node:vm');
function load(file) {
  const code = buildSync({entryPoints: ['providers/liveTgTv/' + file + '.ts'], bundle: true, platform: 'browser', format: 'cjs', write: false}).outputFiles[0].text;
  const module = {exports: {}};
  vm.runInNewContext(code, {module, exports: module.exports, URLSearchParams, ArrayBuffer, Uint8Array});
  return module.exports;
}
const kid = 'a'.repeat(32), key = 'b'.repeat(32);
const fixture = (token = 'one') => `#EXTM3U
#EXTINF:-1 tvg-id="1" tvg-logo="https://example.com/logo.png" group-title="Sports, live",Alpha, HD
#KODIPROP:inputstream.adaptive.license_type=org.w3.clearkey
#KODIPROP:inputstream.adaptive.license_key=${kid}:${key},${'c'.repeat(32)}:${'d'.repeat(32)}
#EXTVLCOPT:http-user-agent=Player
#EXTHTTP:{"Cookie":"original","Referrer":"https://example.com/"}
https://example.com/${token}.mpd|cookie=encoded%3Dvalue%2B1&origin=https%3A%2F%2Fexample.com
#EXTINF:-1 tvg-id="1" group-title="Backup",Alpha, HD
https://example.com/${token}.m3u8
#EXTINF:-1 tvg-id="2" group-title="News",Beta
https://example.com/beta.m3u8
`;
function context(body) {
  const store = new Map();
  return {commonHeaders: {}, kvStore: {get: async k => store.get(k), set: async (k,v) => store.set(k,v)}, axios: {get: async (_url, config) => {
    assert.equal(config.responseType, 'arraybuffer');
    return {data: Buffer.from(typeof body === 'function' ? body() : body)};
  }}};
}
test('channel titles, comma attributes, groups, metadata-only caching and search', async () => {
  const ctx = context(fixture());
  const posts = load('posts'), api = load('playlist');
  const all = await posts.getPosts({providerContext: ctx});
  assert.equal(all.length, 2);
  assert.equal(all[0].title, 'Alpha, HD');
  assert.equal((await posts.getSearchPosts({providerContext: ctx, searchQuery: 'BETA'}))[0].title, 'Beta');
  assert.equal((await posts.getPosts({providerContext: ctx, page: 2})).length, 0);
  const catalogs = await load('catalog').catalog({providerContext: ctx});
  assert.equal(catalogs.length, 4);
  const channels = await api.channels(ctx);
  assert.equal(channels[0].groups.length, 2);
  assert(!JSON.stringify(channels).includes('encoded='));
  assert(!JSON.stringify(channels).includes(key));
  const meta = await load('meta').getMeta({link: all[0].link, providerContext: ctx});
  assert.equal(meta.linkList[0].directLinks[0].link, all[0].link);
});
test('fresh playback returns all sources, headers and multiple ClearKeys; downloads omit DRM', async () => {
  let token = 'one';
  const ctx = context(() => fixture(token));
  const link = (await load('posts').getPosts({providerContext: ctx}))[0].link;
  token = 'two';
  const {getStream} = load('stream');
  const result = await getStream({link, providerContext: ctx});
  assert.equal(result.length, 2);
  assert.equal(result[0].type, 'm3u8');
  const dash = result.find(s => s.type === 'mpd');
  assert.equal(dash.link, 'https://example.com/two.mpd');
  assert.equal(dash.headers.Cookie, 'encoded=value+1');
  assert.equal(dash.headers.Referer, 'https://example.com/');
  assert.equal(dash.headers['User-Agent'], 'Player');
  assert.equal(Object.keys(dash.drm.clearKeys).length, 2);
  assert.equal((await getStream({link, providerContext: ctx, isDownload: true})).length, 1);
});
test('invalid DRM cannot leak through as an unprotected stream', async () => {
  const text = fixture().split('#EXTINF:-1 tvg-id="1" group-title="Backup"')[0].replace(`${kid}:${key}`, 'bad:bad');
  const ctx = context(text), api = load('playlist');
  const link = api.channelLink(api.parsePlaylist(text)[0].channel.id);
  await assert.rejects(load('stream').getStream({link, providerContext: ctx}), /supported DRM/);
});
test('large UTF-8 binary playlists decode without TextDecoder or Node APIs', async () => {
  const text = '#EXTM3U\n' + Array.from({length: 3000}, (_,i) => `#EXTINF:-1 tvg-id="${i}" group-title="தமிழ்",தமிழ் ${i}\nhttps://example.com/${i}.m3u8\n`).join('');
  const sources = await load('playlist').loadSources(context(text));
  assert.equal(sources.length, 3000);
  assert.equal(sources[2999].channel.title, 'தமிழ் 2999');
});
test('protected-only channels have no download servers', async () => {
  const text = fixture().split('#EXTINF:-1 tvg-id="1" group-title="Backup"')[0];
  const ctx = context(text), api = load('playlist');
  const link = api.channelLink(api.parsePlaylist(text)[0].channel.id);
  assert.equal((await load('stream').getStream({link, providerContext: ctx, isDownload: true})).length, 0);
});
