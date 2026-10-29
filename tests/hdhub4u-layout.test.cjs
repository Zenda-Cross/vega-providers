const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {transformSync} = require('esbuild');
const cheerio = require('cheerio');
function load() {
  const module = {exports: {}};
  new Function('module', 'exports', 'require', transformSync(fs.readFileSync('providers/hdhub4u/meta.ts', 'utf8'), {loader: 'ts', format: 'cjs'}).code)(module, module.exports, key => {
    if (key === '../formatSeasonLinks') {
      const helper = {exports: {}};
      new Function('module', 'exports', transformSync(fs.readFileSync('providers/formatSeasonLinks.ts', 'utf8'), {loader: 'ts', format: 'cjs'}).code)(helper, helper.exports);
      return helper.exports;
    }
    if (key === '../getBaseUrl') return {getBaseUrl: async () => 'https://example.com'};
    if (key === '../providerErrors') return {throwProviderError: (_p, _f, e) => {throw e;}};
    if (key === '../getCinemetaMeta') return {getCinemetaMeta: async () => null};
    return {};
  });
  return module.exports.getMeta;
}
function meta(html) {
  return load()({link: '/show/', providerContext: {cheerio, commonHeaders: {}, axios: {get: async () => ({data: html})}, kvStore: {get: async () => false}}});
}
test('nested episode blocks keep each link under the correct episode and quality', async () => {
  const result = await meta(`<h1>Show (Season 1)</h1><div class="page-body"><h2>Single Episode Links</h2>
    <h4><strong>Episode 1</strong></h4><h4>720p <a href="https://hubdrive.example/1">Drive</a></h4>
    <div><h4><strong>Episode 2</strong></h4><h4>720p <a href="https://hubdrive.example/2">Drive</a></h4>
    <div><h4><strong>Episode 3</strong></h4><h4>720p <a href="https://hubdrive.example/3">Drive</a></h4></div></div></div>`);
  assert.deepEqual(result.linkList[0].directLinks.map(e => [e.title, e.link]), [1,2,3].map(n => [`EPISODE ${n}`, `https://hubdrive.example/${n}`]));
});
test('older inline E01 and Episode labels use section quality and exclude packs', async () => {
  for (const label of ['E0', 'EPiSODE ']) {
    const result = await meta(`<h1>Show (Season 2)</h1><div class="page-body"><h3><a href="/pack">1080p Pack</a></h3><h2>720p Episode Wise Index</h2>
      <h4><strong>${label}1 – <a href="https://hubdrive.example/1">Hubdrive</a></strong></h4>
      <h4><strong>${label}2 – <a href="https://hubdrive.example/2">Hubdrive</a></strong></h4></div>`);
    assert.equal(result.linkList.length, 1);
    assert.equal(result.linkList[0].quality, '720p');
    assert.deepEqual(result.linkList[0].directLinks.map(e => e.title), ['EPISODE 1', 'EPISODE 2']);
  }
});
test('episode-labelled anchors remain supported', async () => {
  const result = await meta('<h1>Show Season 1</h1><div class="page-body"><h4><a href="/episode1">Episode 1</a> | WATCH</h4><h4><a href="/episode2">Episode 2</a> | WATCH</h4></div>');
  assert.equal(result.linkList[0].directLinks.length, 2);
});
test('older movie metadata falls back to page title and actual storyline', async () => {
  const result = await meta('<h1 class="page-title">Let Us Prey (2014) BluRay [Hindi]</h1><div class="page-body"><p><strong>DESCRIPTION:</strong> Download keywords</p><h2>Movie – Storyline :</h2><div><div class="kno-rdesc">A stranger arrives at a police station.</div><h2>Review</h2><p>Review text</p></div><h3><a href="/file">720p Links</a></h3></div>');
  assert.equal(result.title, 'Let Us Prey (2014)');
  assert.equal(result.synopsis, 'A stranger arrives at a police station.');
  assert.equal(result.type, 'movie');
});
