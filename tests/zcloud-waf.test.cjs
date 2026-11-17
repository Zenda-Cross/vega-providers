const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const {buildSync} = require('esbuild');

for (const stage of ['initial', 'decoded', 'fetch fallback']) {
  test(`ZCloud verification opens the exact challenged URL: ${stage}`, async () => {
    const original = 'https://zcloud.lat/a20obxvsnn2ox7-?source=zeefliz';
    const decoded = 'https://zcloud.lat/file/example?token=123';
    const encode = value => Buffer.from(value).toString('base64');
    const firstHtml = `atob(atob('${encode(encode(decoded))}'))`;
    const calls = [], verified = [];
    const blocked = () => Object.assign(new Error('Forbidden'), {response: {status: 403}});
    const axios = async (url, config) => {
      calls.push(url);
      if (stage === 'initial' && !verified.length) throw blocked();
      if (stage === 'initial' && verified.length) {
        assert.equal(config.headers['User-Agent'], 'Verified browser');
        assert.ok(config.headers.Cookie.includes('cf_clearance=fresh'));
      }
      return {data: firstHtml};
    };
    axios.get = async url => {
      calls.push(url);
      assert.equal(url, decoded);
      if (!verified.length && stage === 'decoded') throw blocked();
      if (stage === 'fetch fallback') throw new Error('Axios failed');
      return {data: ''};
    };
    let fetches = 0;
    const code = buildSync({entryPoints: ['providers/extractors/zcloud.ts'], bundle: true,
      platform: 'browser', format: 'cjs', write: false}).outputFiles[0].text;
    const module = {exports: {}};
    vm.runInNewContext(code, {module, exports: module.exports, URL, atob, console: {log() {}},
      fetch: async url => {
        assert.equal(url, decoded);
        return ++fetches === 1 ? {status: 403} : {ok: true, text: async () => ''};
      }});
    const result = await module.exports.zcloudExtractor(original, new AbortController().signal,
      axios, {load: () => () => []}, {}, {openWebView: async (url, options) => {
        verified.push(url);
        assert.equal(url, stage === 'initial' ? original : decoded);
        assert.equal(options.force, true);
        return {userAgent: 'Verified browser', cookies: 'cf_clearance=fresh'};
      }});
    assert.equal(result.length, 0);
    assert.equal(verified.length, 1);
    assert.ok(calls.includes(original));
    if (stage === 'fetch fallback') assert.equal(fetches, 2);
  });
}
