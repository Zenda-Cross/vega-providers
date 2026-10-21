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
function setup({cached, links, pow, webData, playlist, rejectRetry = false} = {}) {
  const state = new Map(cached ? [['kartoons_challenge_token', cached]] : []);
  state.set('kartoons_auth_session', {accessToken:'account-token',userAgent:'WebView UA'});
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
        if (url.endsWith('/auth/me')) return {status:200,data:{data:{id:'user-1'}}};
        calls.push({url, config});
        if (url.includes('.workers.dev/')) return {status: 200, data: playlist ? playlist(url) : '#EXTM3U\n#EXTINF:12,\nhttps://cdn.example/segment.ts\n#EXT-X-ENDLIST'};
        if (url.includes('/challenge/pow')) return {status: 200, data: {data: pow || {enabled: false}}};
        if (links) return links(config, calls);
        const token = config.headers['X-Challenge-Token'];
        if (token !== 'fresh-token' || rejectRetry) return {status: 403, data: {challenge_required: true}};
        return {status: 200, data: {data: [{url: encrypt('https://cdn.example/stream.m3u8'), title: 'Odelu 1'}]}};
      },
      post: async (_url, body, config) => {
        assert.equal(body.turnstile_token, 'turnstile-response');
        assert.equal(config.headers['user-agent'], 'WebView UA');
        return {data: {success: true, token: 'fresh-token', expires_at: '2099-01-01T00:00:00Z'}};
      },
    },
    openWebView: async (url, options) => {
      dialogs.push({url, options});
      assert.equal(state.has('kartoons_challenge_token'), false);
      return {data: webData || JSON.stringify({challengeToken: 'fresh-token'}), userAgent: 'WebView UA'};
    },
  };
  const run = () => load()({link: JSON.stringify({id: 'episode-id', type: 'episode'}), type: 'series', providerContext});
  return {run, state, calls, dialogs, providerContext};
}

test('solves real SHA-256 PoW and decrypts stream/subtitle URLs without Node APIs', async () => {
  for (const nonce of ['sample', 'long-nonce-'.repeat(8), 'unicode-ä']) {
    const c = setup({pow: {enabled: true, nonce, bits: 9}, links: config => {
      const solution = config.headers['X-Pow-Solution'];
      const hash = crypto.createHash('sha256').update(nonce + ':' + solution).digest();
      assert.equal(hash[0], 0);
      assert.equal(hash[1] & 128, 0);
      return {status: 200, data: {data: [{url: encrypt('https://cdn.example/video.m3u8'), subtitles: [{url: encrypt('https://cdn.example/en.vtt')}]}]}};
    }});
    const streams = await c.run();
    assert.equal(streams[0].link, 'https://cdn.example/video.m3u8');
    assert.equal(streams[0].subtitles[0].uri, 'https://cdn.example/en.vtt');
    assert.equal(c.dialogs.length, 0);
  }
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
test('replaces rejected cached tokens and preserves the new UA for playback', async () => {
  const c = setup({cached: JSON.stringify({token: 'stale-token', userAgent: 'old UA'})});
  const result = await c.run();
  assert.equal(c.calls[1].config.headers['X-Challenge-Token'], 'stale-token');
  assert.equal(c.dialogs.length, 1);
  assert.equal(c.dialogs[0].options.force, true);
  assert.match(c.dialogs[0].options.injectedJavaScript, /removeItem\("challengeToken"\)/);
  assert.equal(result[0].headers['User-Agent'], 'WebView UA');
  assert.equal(JSON.parse(c.state.get('kartoons_challenge_token')).token, 'fresh-token');
});
test('recognizes HTTP 200 challenge responses and verifies nested bridge payloads', async () => {
  const c = setup({webData: JSON.stringify({__waf: true, data: JSON.stringify({turnstileToken: 'turnstile-response'}), token: 'wrapper payload'})});
  const original = c.providerContext.axios.get;
  c.providerContext.axios.get = async (url, config) => {
    if (url.endsWith('/links') && !config.headers['X-Challenge-Token']) return {status: 200, data: {data: {challenge_required: true}}};
    return original(url, config);
  };
  assert.equal((await c.run()).length, 1);
  assert.equal(JSON.parse(c.state.get('kartoons_challenge_token')).expires_at, '2099-01-01T00:00:00Z');
});
test('does not save failed verification tokens or hide the retry error', async () => {
  const c = setup({cached: {token: 'stale-token'}, rejectRetry: true});
  await assert.rejects(c.run(), /Kartoons getStream failed.*HTTP 403/);
  assert.equal(c.state.has('kartoons_challenge_token'), false);
  assert.equal(c.dialogs.length, 1);
});
test('uses a valid cached token without opening verification', async () => {
  const c = setup({cached: {token: 'fresh-token', userAgent: 'saved UA'}});
  assert.equal((await c.run())[0].headers['User-Agent'], 'saved UA');
  assert.equal(c.dialogs.length, 0);
});
test('reports network failures without opening a challenge dialog', async () => {
  const c = setup();
  c.providerContext.axios.get = async (url) => {
    if (url.endsWith('/auth/me')) return {status:200,data:{data:{id:'user-1'}}};
    throw new Error('Network unavailable');
  };
  await assert.rejects(c.run(), /Network unavailable/);
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
