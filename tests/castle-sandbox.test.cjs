const assert = require('node:assert/strict');
const {test} = require('node:test');
const crypto = require('node:crypto');
const vm = require('node:vm');
const {buildSync} = require('esbuild');
function load(entry) {
  const code = buildSync({entryPoints: [entry], bundle: true, platform: 'browser', format: 'cjs', write: false}).outputFiles[0].text;
  const module = {exports: {}};
  vm.runInNewContext(code, {
    module, exports: module.exports, Error, ArrayBuffer,
    TextDecoder: class { decode() { throw Error("Desktop TextDecoder slow path must not run"); } },
    console: {log() {}, error() {}},
    fetch: async () => ({ok: true, json: async () => ({castle: {url: 'https://api.hlowb.com'}})}),
  });
  return module.exports;
}
function encrypt(text, key) {
  const cipher = crypto.createCipheriv('aes-128-cbc', key, key);
  return Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString('base64');
}
const securityKey = Buffer.from('fJATm*kgfJ');
const key = Buffer.from('fJATm*kgfJT!BgJB');

test('Castle decrypts multiblock and Unicode API payloads without browser or Node decoding APIs', () => {
  const api = load('providers/castle/castleCore.ts');
  const derived = api.deriveKey(securityKey.toString('base64'));
  assert.equal(Buffer.from(derived).toString('hex'), key.toString('hex'));
  for (const text of ['x', '1234567890abcdef', 'Castle தமிழ் हिंदी 🎬'.repeat(40)]) {
    assert.equal(api.decryptCBC(encrypt(text, key), derived), text);
  }
  // Cross-check multiple key schedules against Node's independent AES implementation.
  for (let i = 0; i < 8; i++) {
    const randomKey = crypto.randomBytes(16);
    const text = crypto.randomBytes(97 + i).toString('hex');
    assert.equal(api.decryptCBC(encrypt(text, randomKey), randomKey), text);
  }
});

test('Castle loads a large encrypted catalog and preserves long IDs in a restricted sandbox', async () => {
  const {getPosts} = load('providers/castle/posts.ts');
  const body = '{"data":{"rows":[{"name":"Trending","contents":[{"id":10061181091837909,"title":"Castle தமிழ்","coverImage":"https://cdn.example/poster.jpg"}]}]},"padding":"' + 'x'.repeat(480000) + '"}';
  const posts = await getPosts({filter: '', page: 1, providerContext: {axios: {get: async (url, config) => {
    assert.equal(config.responseType, 'arraybuffer');
    const text = url.includes('getSecurityKey') ? JSON.stringify({code: 200, data: securityKey.toString('base64')}) : encrypt(body, key);
    const bytes = Buffer.from(text);
    return {data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)};
  }}}});
  assert.equal(posts.length, 1);
  assert.equal(posts[0].title, 'Castle தமிழ்');
  assert.equal(posts[0].link, 'castle://media/10061181091837909');
});

test('Castle reports API failures instead of a successful empty catalog', async () => {
  const {getPosts, getSearchPosts} = load('providers/castle/posts.ts');
  const providerContext = {axios: {get: async () => {throw Error('Connection refused');}}};
  await assert.rejects(getPosts({filter: '', providerContext}), /CastleTV getPosts failed:.*Connection refused/);
  await assert.rejects(getSearchPosts({searchQuery: 'Castle', providerContext}), /CastleTV getSearchPosts failed:.*Connection refused/);
});

test('Castle unwraps binary POST responses with a typed-array byte offset', async () => {
  const {apiVideoUrl} = load('providers/castle/castleCore.ts');
  const expected = {data: {videoUrl: 'https://cdn.example/movie.m3u8'}};
  const result = await apiVideoUrl('movie', 'episode', '2', null, {axios: {
    get: async (_url, config) => {
      assert.equal(config.responseType, 'arraybuffer');
      return {data: Buffer.from(JSON.stringify({code: 200, data: securityKey.toString('base64')}))};
    },
    post: async (_url, _body, config) => {
      assert.equal(config.responseType, 'arraybuffer');
      const wrapped = Buffer.from('prefix' + encrypt(JSON.stringify(expected), key) + 'suffix');
      return {data: wrapped.subarray(6, wrapped.length - 6)};
    },
  }});
  assert.equal(result.data.videoUrl, expected.data.videoUrl);
});
