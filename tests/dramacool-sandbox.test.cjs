const assert = require('node:assert/strict');
const {test} = require('node:test');
const crypto = require('node:crypto');
const vm = require('node:vm');
const {buildSync} = require('esbuild');
const cheerio = require('cheerio');
function load(entry) {
  const module = {exports: {}};
  const code = buildSync({entryPoints: [entry], bundle: true, platform: 'browser', format: 'cjs', write: false}).outputFiles[0].text;
  vm.runInNewContext(code, {module, exports: module.exports, URL, URLSearchParams, console});
  return module.exports;
}
const key = '94588293375053432799222445521289';
const iv = '5259228356829423';
function encrypt(text, customKey = key, customIv = iv) {
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(customKey), Buffer.from(customIv));
  return Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString('base64');
}
test('DramaCool decrypts VidBasic AES without WebCrypto, TextEncoder, TextDecoder, Buffer or atob', async () => {
  const {decryptVidbasicAes} = load('providers/dramacool/aes.ts');
  for (const text of ['https://cdn.example/video.m3u8', 'தமிழ் हिंदी 🎬'.repeat(12)]) {
    assert.equal(await decryptVidbasicAes(encrypt(text)), text);
  }
  const customKey = '0123456789abcdef0123456789abcdef', customIv = '0123456789abcdef';
  assert.equal(await decryptVidbasicAes(encrypt('https://cdn.example/another.mp4', customKey, customIv), customKey, customIv), 'https://cdn.example/another.mp4');
  assert.equal(await decryptVidbasicAes('bad ciphertext'), '');
  const raw = Buffer.from(encrypt('https://cdn.example/video.m3u8'), 'base64');
  assert.equal(await decryptVidbasicAes(raw.subarray(0, raw.length - 1).toString('base64')), '');
});
test('DramaCool resolves episode, embed, player and encrypted subtitles in a restricted sandbox', async () => {
  const {getStream} = load('providers/dramacool/stream.ts');
  const video = 'https://cdn.example/master.m3u8';
  const subtitle = 'https://cdn.example/english.vtt?token=a+b';
  const player = '/3rdplayer.html?key=player&id=episode&sub=' + encodeURIComponent(encrypt(subtitle));
  const calls = [];
  const streams = await getStream({link: 'https://asianc.id/example-episode-1.html', providerContext: {
    cheerio, commonHeaders: {}, getBaseUrl: async () => 'https://asianc.id',
    axios: {get: async url => {
      calls.push(url);
      if (url.endsWith('/example-episode-1.html')) return {data: '<iframe src="//vidbasic.top/embed/episode"></iframe>'};
      if (url.endsWith('/embed/episode')) return {data: `<li data-video="${player.replace(/&/g, '&amp;')}">Standard Server</li>`};
      if (url.startsWith('https://vidbasic.top/3rdplayer.html')) return {data: `<script data-name="crypto" data-value="${encrypt(video)}"></script>`};
      throw Error('Unexpected URL ' + url);
    }},
  }});
  assert.equal(calls.length, 3);
  assert.equal(streams.length, 1);
  assert.equal(streams[0].link, video);
  assert.equal(streams[0].type, 'm3u8');
  assert.equal(streams[0].subtitles[0].uri, subtitle);
});
