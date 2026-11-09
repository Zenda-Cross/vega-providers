const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {transformSync} = require('esbuild');
const cheerio = require('cheerio');
function setup(preferences, qualities = [480,720,1080,2160]) {
  const module = {exports: {}}, resolved = [];
  new Function('module','exports','require',transformSync(fs.readFileSync('providers/hdhub4u/stream.ts','utf8'),{loader:'ts',format:'cjs'}).code)(module,module.exports,key => {
    if(key==='../extractors/hubcloud') return {hubcloudExtractor: async url => {resolved.push(url);return [{server:'Direct',link:url,type:'mp4'}];}};
    return {throwProviderError: (_p,_f,e) => {throw e;}};
  });
  const html = `<main>${qualities.map(q=>`<h4>${q===2160?'4K':q+'p'} – <a href="https://hubcloud.example/drive/${q}">Direct</a></h4>`).join('')}</main>`;
  const ctx = {cheerio,commonHeaders:{},kvStore:{get:async()=>preferences},axios:{get:async()=>({data:html})}};
  return {run:()=>module.exports.getStream({link:'https://hblinks.example/episode',providerContext:ctx}),resolved};
}
test('default 1080p is detected from its row instead of shared 4K container',async()=>{
  const c=setup();const streams=await c.run();
  assert.deepEqual(c.resolved,['https://hubcloud.example/drive/1080']);
  assert.equal(streams[0].quality,'1080');
});
test('multiple preferences return available resolutions highest first',async()=>{
  const c=setup(['720','1080']);const streams=await c.run();
  assert.deepEqual(streams.map(s=>s.quality),['1080','720']);
});
test('unavailable preferences choose nearest quality',async()=>{
  const c=setup(['1080'],[480,720]);const streams=await c.run();
  assert.equal(streams[0].quality,'720');
});
test('an empty selection retains the default',async()=>{
  const c=setup([]);assert.equal((await c.run())[0].quality,'1080');
});
