const {test} = require('node:test');
const assert = require('node:assert/strict');
const {buildSync} = require('esbuild');
const vm = require('node:vm');
const cheerio = require('cheerio');
const id = 'a'.repeat(32);
const link = `https://www.mxplayer.in/movie/watch-a-film-online-${id}`;
function load(name) {
  const code = buildSync({entryPoints:[`providers/mxplayer/${name}.ts`],bundle:true,format:'cjs',write:false}).outputFiles[0].text;
  const module = {exports:{}};
  vm.runInNewContext(code, {module,exports:module.exports,URL,console});
  return module.exports;
}
const page = entity => `<script> \n window.__mxs__ = ${JSON.stringify({entities:{movies:{wrong:{id:'wrong',title:'Wrong film'},[id]:entity}}})}; window.other = {unrelated:true};</script>`;
function context(html, detail) {
  return {cheerio, commonHeaders:{'User-Agent':'test'}, axios:{get:async (url, config) => {
    assert.equal(config.headers['User-Agent'],'test');
    return {data: url.includes('/detail/video?') ? detail : html};
  }}};
}
test('metadata parses whitespace and trailing JavaScript and selects the matching entity', async () => {
  const html = page({id,title:'Selected film',type:'movie',genres:[{name:'Drama'},'Comedy'],contributors:[{name:'Actor'}],imageInfo:[{type:'portrait',url:'https://example.com/poster.jpg'}]});
  const meta = await load('meta').getMeta({link,providerContext:context(html)});
  assert.equal(meta.title,'Selected film');
  assert.deepEqual(Array.from(meta.tags),['Drama','Comedy']);
  assert.equal(meta.image,'https://example.com/poster.jpg');
  assert.equal(meta.linkList[0].directLinks[0].link,link);
  assert.equal(meta.linkList[0].episodesLink,undefined);
});
test('dynamic seasons omit directLinks so the app invokes getEpisodes', async () => {
  const html = page({id,title:'Show',type:'tvshow'}) + '<div class="hs__items-container"><div data-id="season1">Season 1</div></div>';
  const meta=await load('meta').getMeta({link:link.replace('/movie/','/show/'),providerContext:context(html)});
  assert.equal(meta.type,'series');
  assert.equal(meta.linkList[0].episodesLink,'season1');
  assert.equal(meta.linkList[0].directLinks,undefined);
});
test('blocked pages and failed requests throw instead of returning empty metadata', async () => {
  await assert.rejects(load('meta').getMeta({link,providerContext:context('<h1>Oops!!!</h1>We are currently not available in your region.')}),/region/);
  await assert.rejects(load('meta').getMeta({link,providerContext:{cheerio,axios:{get:async()=>{throw Error('HTTP 403');}}}}),/HTTP 403/);
});
test('missing page state falls back to selected movie detail API', async () => {
  const meta=await load('meta').getMeta({link,providerContext:context('<html></html>',{id,title:'API film',type:'movie'})});
  assert.equal(meta.title,'API film');
});
test('playback requests the selected movie, not a recommendation', async () => {
  const ctx=context('',{id,title:'Selected film',stream:{hls:{high:'https://example.com/selected.m3u8'}}});
  const streams=await load('stream').getStream({link,type:'movie',providerContext:ctx});
  assert.equal(streams[0].link,'https://example.com/selected.m3u8');
});
test('posts normalize absolute share URLs and absolute images once', async () => {
  const ctx={axios:{get:async url=>url==='https://www.mxplayer.in'?{headers:{}}:{data:{items:[{id,type:'movie',title:'Film',shareUrl:link,imageInfo:[{type:'portrait_large',url:'https://example.com/image.jpg'}]}]}}}};
  const posts=await load('posts').getPosts({providerContext:ctx});
  assert.equal(posts[0].link,link);
  assert.equal(posts[0].image,'https://example.com/image.jpg');
});
test('season URL resolves via SEO to real metadata and a dynamic season link', async () => {
  const ctx={cheerio, commonHeaders:{}, axios:{get:async url=>({data:url.includes('seo.mxplayer.in')?{successful:true,data:{id,type:'season',title:'SEO page title',source:{title:'Season 2',thumbnail_url:'pic/season.jpg',genres:[{name:'Drama'}]}}}:'<html></html>'})}};
  const meta=await load('meta').getMeta({link:`https://www.mxplayer.in/show/watch-show/seasons/season-2-${id}`,providerContext:ctx});
  assert.equal(meta.title,'Season 2');
  assert.equal(meta.linkList[0].episodesLink,id);
  assert.equal(meta.linkList[0].directLinks,undefined);
  assert.equal(meta.type,'series');
});
test('empty title page falls back to authoritative SEO metadata', async () => {
  const ctx={cheerio,commonHeaders:{},axios:{get:async url=>({data:url.includes('seo.mxplayer.in')?{data:{id,type:'movie',source:{title:'Real title'}}}:'<html></html>'})}};
  const meta=await load('meta').getMeta({link,providerContext:ctx});
  assert.equal(meta.title,'Real title');
});
