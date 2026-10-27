const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const {transformSync} = require('esbuild');
const cheerio = require('cheerio');

function load(name) {
  const module = {exports: {}};
  const code = transformSync(fs.readFileSync(`providers/movies4u/${name}.ts`, 'utf8'), {loader: 'ts', format: 'cjs'}).code;
  new Function('module', 'exports', 'require', code)(module, module.exports, key => {
    if (key === '../getBaseUrl') return {getBaseUrl: async () => 'https://movies4u.nf'};
    if (key === '../providerErrors') return {throwProviderError: (_p, _f, err) => {throw err;}};
    if (key === '../getCinemetaMeta') return {readCinemetaContext: url => ({requestUrl: url})};
    return {};
  });
  return module.exports;
}
function context(html) {
  return {cheerio, commonHeaders: {}, kvStore: {get: async () => false}, axios: {get: async () => ({data: html})}};
}
test('current series fields provide metadata and dynamic season links without batch or ad links', async () => {
  const ctx = context(`<meta property="og:image" content="https://img.example/poster.webp"><h1>Download Show Season 1</h1>
    <div class="entry-content"><h3>Series Info:</h3><p><strong>Series Name:</strong> Show<br>Season: 01<br>Episode: 12</p>
    <h3>Series-SYNOPSIS/PLOT:</h3><p>The actual synopsis.</p>
    <h4>Season 1 480p</h4><p><a href="https://mdrive.cloud/mdisk/1">V-Cloud</a><a href="https://mdrive.cloud/mdisk/zip">Batch/Zip</a></p>
    <h4>Season 1 720p</h4><p><a href="https://mdrive.cloud/mdisk/2">V-Cloud</a></p>
    <div class="code-block"><a href="https://example.com/app.apk">Download app</a></div></div>`);
  const meta = await load('meta').getMeta({link: '/show/', providerContext: ctx});
  assert.equal(meta.type, 'series'); assert.equal(meta.title, 'Show');
  assert.equal(meta.synopsis, 'The actual synopsis.');
  assert.equal(meta.image, 'https://img.example/poster.webp');
  assert.deepEqual(meta.linkList.map(l => l.episodesLink), ['https://mdrive.cloud/mdisk/1', 'https://mdrive.cloud/mdisk/2']);
  assert.ok(meta.linkList.every(l => !('directLinks' in l)));
});
test('nested host layout includes first episode and assigns each heading its own link', async () => {
  const ctx = context(`<div id="container-content-single"><h5>-:Episodes: 1:-</h5><div><a href="https://hubcloud.ist/drive/one">HubCloud</a><a href="https://gdflix.dev/file/one">Mirror</a></div>
    <div><div class="entry-content"><h5>-:Episodes: 2:-</h5><div><a href="https://hubcloud.ist/drive/two">HubCloud</a></div></div>
    <div><h5>-:Episodes: 3:-</h5><div><a href="https://hubcloud.ist/drive/three">HubCloud</a></div></div></div></div>`);
  const episodes = await load('episodes').getEpisodes({url: 'https://mdrive.cloud/mdisk/1', providerContext: ctx});
  assert.deepEqual(episodes.map(e => [e.title, e.link]), [
    ['Episode 1', 'https://hubcloud.ist/drive/one'], ['Episode 2', 'https://hubcloud.ist/drive/two'], ['Episode 3', 'https://hubcloud.ist/drive/three'],
  ]);
});
test('movie headings retain their own servers', async () => {
  const ctx = context('<h1>Example Movie</h1><div class="entry-content"><p>Movie Name: Example Movie</p><h3>480p</h3><p><a href="/file/a">Server A</a><a href="/file/b">Server B</a></p><h3>720p</h3><p><a href="/file/c">Server C</a></p></div>');
  const meta = await load('meta').getMeta({link: '/movie/', providerContext: ctx});
  assert.equal(meta.type, 'movie');
  assert.deepEqual(meta.linkList.map(l => l.directLinks.map(e => e.link)), [['https://movies4u.nf/file/a', 'https://movies4u.nf/file/b'], ['https://movies4u.nf/file/c']]);
});
