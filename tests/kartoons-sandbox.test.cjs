const assert = require('node:assert/strict');
const {test} = require('node:test');
const crypto = require('node:crypto');
const vm = require('node:vm');
const {buildSync} = require('esbuild');

const code = buildSync({
  entryPoints: ['providers/kartoons/stream.ts'], bundle: true,
  platform: 'browser', format: 'cjs', write: false,
}).outputFiles[0].text;
function load(source = code) {
  const module = {exports: {}};
  const sandbox = {module, exports: module.exports, Error, URL};
  // No require, Buffer, WebCrypto, atob or TextDecoder.
  vm.runInNewContext(source, sandbox);
  return module.exports.getStream;
}
function encrypt(value) {
  const iv = Buffer.from('0123456789abcdef');
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from('bca9e0df1a5abb32906ca3f63ac04cef'), iv);
  return Buffer.concat([iv, cipher.update(value), cipher.final()]).toString('base64url');
}
function setup({links, playlist} = {}) {
  const state = new Map();
  state.set('kartoons_device_session', {token:'device-token',userAgent:'WebView UA'});
  const calls = [], dialogs = [];
  const providerContext = {
    commonHeaders: {Accept: '*/*'},
    kvStore: {
      get: async key => state.get(key),
      set: async (key, value) => state.set(key, value),
      delete: async key => state.delete(key),
    },
    axios: {
      get: async (url, config) => {
        calls.push({url, config});
        if (url.includes('.workers.dev/')) return {status: 200, data: playlist ? playlist(url) : '#EXTM3U\n#EXTINF:12,\nhttps://cdn.example/segment.ts\n#EXT-X-ENDLIST'};
        if (links) return links(config, calls);
        return {status: 200, data: {data: [{url: encrypt('https://cdn.example/stream.m3u8'), title: 'Odelu 1'}]}};
      },
    },
    openWebView: async () => { dialogs.push(true); throw Error('Unexpected device linking'); },
  };
  const run = () => load()({link: JSON.stringify({id: 'episode-id', type: 'episode'}), type: 'series', providerContext});
  return {run, state, calls, dialogs, providerContext};
}

test('decrypts streams and subtitles in the sandbox using the linked Cloudstream API',async()=>{
 const c=setup({links:(_config,calls)=>{assert.ok(!calls.some(c=>c.url.includes('/challenge/pow')));return {status:200,data:{data:{links:[{url:encrypt('https://cdn.example/video.m3u8')}],subtitles:[{url:encrypt('https://cdn.example/en.vtt'),lang:'en'}]}}};}});
 const result=await c.run();assert.equal(result[0].link,'https://cdn.example/video.m3u8');assert.equal(result[0].subtitles[0].uri,'https://cdn.example/en.vtt');
});

function encryptPlaylistUri(url) {
  const key = crypto.createHash('sha256').update('pmS0CAMG1Ruq49WbMyhE3fh1sOuLYEL9rtFazYYljVI2j4BPSog73hW7A7xMhceHD0iwrPrVVDXLvxyWr').digest();
  const iv = Buffer.from('0123456789ab');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(url), cipher.final()]);
  return 'enc2:' + Buffer.concat([iv, body, cipher.getAuthTag()]).toString('base64url');
}
test('resolves enc2 encrypted masters to verified 720p and 480p media playlists in the sandbox', async () => {
  const master = 'https://v178.wkr178x9851.workers.dev/playlist/master';
  const variants = ['https://v178.wkr178x9851.workers.dev/playlist/720', 'https://v178.wkr178x9851.workers.dev/playlist/480'];
  const c = setup({
    links: () => ({status: 200, data: {data: [{url: encrypt(master), title: 'Odelu 1'}]}}),
    playlist: url => url === master
      ? '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720\n' + encryptPlaylistUri(variants[0]) + '\n#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=852x480\n' + encryptPlaylistUri(variants[1])
      : '#EXTM3U\n#EXTINF:12,\nhttps://cdn.example/video.ts\n#EXT-X-ENDLIST',
  });
  const streams = await c.run();
  assert.equal(streams.length, 2);
  streams.forEach((stream, index) => {
    assert.equal(stream.link, variants[index]);
    assert.equal(stream.type, 'm3u8');
    assert.equal(stream.quality, index === 0 ? '720p' : '480p');
    assert.equal(stream.server, 'Odelu 1');
  });
});

test('rejects tampered enc2 payloads before passing a playlist to the player', async () => {
  const uri = encryptPlaylistUri('https://v178.wkr178x9851.workers.dev/playlist/video');
  const raw = Buffer.from(uri.slice(5), 'base64url');
  raw[raw.length - 1] ^= 1;
  const c = setup({
    links: () => ({status: 200, data: {data: [{url: 'https://v178.wkr178x9851.workers.dev/playlist/master'}]}}),
    playlist: () => '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000\nenc2:' + raw.toString('base64url'),
  });
  await assert.rejects(c.run(), /failed authentication/);
});

test('rejects encrypted media segments instead of handing enc2 to native players', async () => {
  const c = setup({
    links: () => ({status: 200, data: {data: [{url: 'https://v178.wkr178x9851.workers.dev/playlist/media'}]}}),
    playlist: () => '#EXTM3U\n#EXTINF:12,\n' + encryptPlaylistUri('https://cdn.example/segment.ts'),
  });
  await assert.rejects(c.run(), /still contains encrypted URLs/);
});
test('reports network failures without opening a challenge dialog', async () => {
  const c = setup();
  c.providerContext.axios.get = async (url) => {
    if (url.endsWith('/auth/me')) return {status:200,data:{data:{id:'user-1'}}};
    throw new Error('Network unavailable');
  };
  await assert.rejects(c.run(), /could not connect.*kept/);
  assert.equal(c.dialogs.length, 0);
});
test('does not return encrypted garbage as a playable URL', async () => {
  const c = setup({links: () => ({status: 200, data: {data: [{url: 'not-a-playable-url'}]}})});
  assert.equal((await c.run()).length, 0);
});

test('identifies extensionless worker playlists as HLS while preserving MP4 streams', async () => {
  const urls = [
    'https://v178.wkr178x9851.workers.dev/playlist/encrypted-token',
    'https://cdn.example/video.m3u8?token=example',
    'https://cdn.example/video.mp4',
  ];
  const c = setup({links: () => ({status: 200, data: {data: urls.map(url => ({url: encrypt(url)}))}})});
  const streams = await c.run();
  assert.equal(streams.length, 3);
  streams.forEach((stream, index) => {
    assert.equal(stream.link, urls[index]);
    assert.equal(stream.type, index === 2 ? 'mp4' : 'm3u8');
  });
});
