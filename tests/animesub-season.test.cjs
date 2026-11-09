const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const {buildSync} = require('esbuild');
function load(entry) {
  const code = buildSync({entryPoints:[entry],bundle:true,platform:'browser',format:'cjs',write:false}).outputFiles[0].text;
  const module={exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports,URL,URLSearchParams,Error,console:{log(){},warn(){}}});
  return module.exports;
}
const metaPath='providers/animesub/meta.ts';
const streamPath='providers/animesub/stream.ts';
function context(reply, skip=true) {
  const calls=[];
  return {calls,ctx:{commonHeaders:{},kvStore:{get:async key=>key.endsWith('skipTimings')?skip:undefined},axios:{get:async(url)=>{calls.push(url);return {data:await reply(url)}}}}};
}
function kitsuMeta(season=2, episode=1) {
  return {meta:{id:'kitsu:50016',name:'Cyberpunk: Edgerunners II',imdb_id:'tt12590266',type:'anime',videos:[{id:'kitsu:50016:1',season:1,episode:1,imdbSeason:season,imdbEpisode:episode,released:'2022-01-01',title:'Episode 1'}]}};
}
test('maps the MAL sequel to IMDb season 2 before enriching its skip timings',async()=>{
  const c=context(url=>{
    if(url.includes('/edge/mappings?'))return {included:[{id:'50016'}]};
    if(url.includes('anime-kitsu.strem.fun'))return kitsuMeta();
    if(url.includes('aniskip.com'))return {found:false};
    if(url.includes('theintrodb.org'))return {intro:[{start_ms:10000,end_ms:20000}]};
    throw Error('Unexpected request '+url);
  });
  const info=await load(metaPath).getMeta({link:JSON.stringify({malId:'61990',title:'Cyberpunk: Edgerunners 2'}),providerContext:c.ctx});
  assert.equal(info.linkList[0].title,'Season 2');
  const ep=info.linkList[0].directLinks[0];
  const p=JSON.parse(ep.link);
  assert.equal(p.season,'2');
  assert.equal(p.episode,'1');
  assert.equal(p.animeEpisode,'1');
  assert.equal(p.malId,'61990');
  assert.ok(c.calls.some(u=>u.includes('/skip-times/61990/1?')));
  assert.ok(c.calls.some(u=>u.includes('season=2&episode=1')));
  assert.ok(!c.calls.some(u=>u.includes('/42310/')||u.includes('season=1&')));
  assert.equal(ep.skip[0].from,10);
});
test('keeps local anime episode numbers separate from IMDb numbering',async()=>{
  const c=context(url=>{
    if(url.includes('/edge/mappings?'))return {included:[{id:'50016'}]};
    if(url.includes('anime-kitsu.strem.fun'))return kitsuMeta(2,13);
    if(url.includes('aniskip.com'))return {found:false};
    if(url.includes('theintrodb.org'))return {};
    throw Error('Unexpected '+url);
  });
  const info=await load(metaPath).getMeta({link:JSON.stringify({malId:'61990'}),providerContext:c.ctx});
  const p=JSON.parse(info.linkList[0].directLinks[0].link);
  assert.equal(p.episode,'13');
  assert.equal(p.animeEpisode,'1');
  assert.ok(c.calls.some(u=>u.includes('/skip-times/61990/1?')));
  assert.ok(c.calls.some(u=>u.includes('season=2&episode=13')));
});
test('sequel stream fallback and IntroDB both request season 2, never season 1',async()=>{
  const c=context(url=>{
    if(url.includes('aniskip.com'))return {found:false};
    if(url.includes('theintrodb.org'))return {};
    if(url.includes('/stream/anime/'))return {streams:[]};
    if(url.includes('/stream/series/'))return {streams:[{url:'https://cdn.example/video.mp4'}]};
    throw Error('Unexpected '+url);
  });
  const streams=await load(streamPath).getStream({link:JSON.stringify({title:'Cyberpunk: Edgerunners II',malId:'61990',kitsuId:'kitsu:50016:1',imdbId:'tt12590266',season:'2',episode:'1',animeEpisode:'1',type:'series'}),providerContext:c.ctx});
  assert.equal(streams.length,1);
  assert.equal(streams[0].skip,undefined);
  assert.ok(c.calls.some(u=>u.includes('/stream/series/tt12590266:2:1.json')));
  assert.ok(!c.calls.some(u=>u.includes('tt12590266:1:1')||u.includes('season=1&')));
});
test('a later Cinemeta season uses season-specific IntroDB without title-only AniSkip matching',async()=>{
  const c=context(url=>{
    if(url.includes('v3-cinemeta'))return {meta:{imdb_id:'tt12590266',name:'Cyberpunk: Edgerunners',type:'series',videos:[{season:2,episode:1,name:'Episode 1'}]}};
    if(url.includes('theintrodb.org'))return {};
    throw Error('Unexpected '+url);
  });
  await load(metaPath).getMeta({link:'https://v3-cinemeta.strem.io/meta/series/tt12590266.json',providerContext:c.ctx});
  assert.ok(c.calls.some(u=>u.includes('season=2&episode=1')));
  assert.ok(!c.calls.some(u=>u.includes('kitsu.io')||u.includes('aniskip.com')));
});
test('stream timing lookup never resolves a generic season 2 title to a first-season MAL entry',async()=>{
  const c=context(url=>{
    if(url.includes('theintrodb.org'))return {};
    if(url.includes('/stream/series/'))return {streams:[{url:'https://cdn.example/video.mp4'}]};
    throw Error('Unexpected '+url);
  });
  await load(streamPath).getStream({link:JSON.stringify({title:'Cyberpunk: Edgerunners',imdbId:'tt12590266',season:'2',episode:'1',type:'series'}),providerContext:c.ctx});
  assert.ok(!c.calls.some(u=>u.includes('kitsu.io')||u.includes('aniskip.com')));
});
test('AniSkip caches are isolated by MAL season identity and local episode number',async()=>{
  const c=context(url=>({found:true,results:[{skipType:'op',interval:{startTime:url.includes('/61990/')?100:10,endTime:url.includes('/61990/')?190:100}}]}));
  const helper=load('providers/aniskip.ts');
  const first=await helper.fetchAnimeSkipTimings({malId:'42310',episode:1,season:1,providerContext:c.ctx});
  const second=await helper.fetchAnimeSkipTimings({malId:'61990',episode:1,season:2,providerContext:c.ctx});
  assert.equal(first[0].from,10);
  assert.equal(second[0].from,100);
  assert.equal(c.calls.length,2);
});
