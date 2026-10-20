const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const {buildSync} = require('esbuild');
const code = buildSync({entryPoints:['providers/animesub/stream.ts'],bundle:true,platform:'browser',format:'cjs',write:false}).outputFiles[0].text;
const hash = '11af6a56b75f71b7d54a8e89c07e7bb3f3980fc1';
const name = 'Cyberpunk.Edgerunners.S01E01.1080p.mkv';
function source(extra = {}) {
  return {name:'AnimeSub+ 1080p',description: name + '\n💾 8.31 GB',infoHash:hash,fileIdx:0,behaviorHints:{filename:name,videoSize:8.31*1024**3},...extra};
}
async function run(streams, references = [], options = {}) {
  const module = {exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports,URL,URLSearchParams,Error,console:{log(){},warn(){}}});
  const calls = [];
  const ctx = {
    commonHeaders:{},
    kvStore:{get:async key => key === 'animesub_skipTimings' ? false : key === 'animesub_sortBy' ? options.sort : undefined},
    axios:{get:async (url,config) => {
      calls.push({url,config});
      if(url.startsWith('https://torrentio.strem.fun/')) {
        if(options.fail)throw Error('Unavailable');
        return {data:{streams:references}};
      }
      return {data:{streams}};
    }},
  };
  const result=await module.exports.getStream({link:JSON.stringify({imdbId:'tt12590266',season:'1',episode:'1',type:options.type || 'series'}),providerContext:ctx});
  return {result,calls};
}
test('replaces the upstream season-pack videoSize with a matching episode file size',async()=>{
  const {result,calls}=await run([source()],[{infoHash:hash,fileIdx:0,title:'💾 621.98 MB'}]);
  assert.ok(result[0].tags.includes('621.98 MB'));
  assert.doesNotMatch(result[0].tag,/8\.31 GB/);
  assert.equal(calls.filter(c=>c.url.includes('torrentio.strem.fun')).length,1);
});
test('matches filenames when no file index is available',async()=>{
  const {result}=await run([source({fileIdx:undefined})],[{infoHash:hash.toUpperCase(),fileIdx:0,behaviorHints:{filename:name},title:'💾 621.98 MB'}]);
  assert.ok(result[0].tags.includes('621.98 MB'));
});
test('does not borrow another episode size even when the torrent hash matches',async()=>{
  const {result}=await run([source()],[{infoHash:hash,fileIdx:1,behaviorHints:{filename:name},title:'💾 2.50 GB'}]);
  assert.doesNotMatch(result[0].tag,/\b(?:GB|MB)\b/);
});
test('does not match an unrelated torrent with the same filename and index',async()=>{
  const {result}=await run([source()],[{infoHash:'a'.repeat(40),fileIdx:0,behaviorHints:{filename:name},title:'💾 2.50 GB'}]);
  assert.doesNotMatch(result[0].tag,/\b(?:GB|MB)\b/);
});
test('keeps streams available when file-size enrichment fails and omits the bundle size',async()=>{
  const {result}=await run([source()],[],{fail:true});
  assert.equal(result.length,1);
  assert.doesNotMatch(result[0].tag,/\b(?:GB|MB)\b/);
});
test('uses an explicit fileSize without looking it up again',async()=>{
  const {result,calls}=await run([source({behaviorHints:{filename:name,videoSize:8.31*1024**3,fileSize:500*1024**2}})]);
  assert.ok(result[0].tags.includes('500.0 MB'));
  assert.equal(calls.length,1);
});
test('sorts by episode size rather than pack size',async()=>{
  const other='b'.repeat(40);
  const {result}=await run([source(),source({infoHash:other,description:'💾 3 GB'})],[{infoHash:hash,fileIdx:0,title:'💾 621.98 MB'},{infoHash:other,fileIdx:0,title:'💾 1.31 GB'}],{sort:'size'});
  assert.ok(result[0].link.includes(other));
  assert.ok(result[0].tags.includes('1.31 GB'));
});
test('preserves movie size labels without performing episode enrichment',async()=>{
  const {result,calls}=await run([source()],[],{type:'movie'});
  assert.ok(result[0].tags.includes('8.31 GB'));
  assert.equal(calls.length,1);
});
