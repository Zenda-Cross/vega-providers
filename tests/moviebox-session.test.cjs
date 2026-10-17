const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const {transformSync}=require('esbuild');
const code=transformSync(fs.readFileSync(path.join(__dirname,'../providers/movieBoxWeb/stream.ts'),'utf8'),{loader:'ts',format:'cjs'}).code;
function load(){
 const module={exports:{}};
 new Function('module','exports','require',code)(module,module.exports,key=>{
  if(key==='./utils')return {decodeLink:JSON.parse,getProviderBaseUrl:async()=> 'https://officialmoviebox.com',absoluteUrl:(base,value)=>new URL(value,base).href};
  if(key==='../providerErrors')return {throwProviderError:(_p,_o,e)=>{throw e;}};
  throw Error('Unexpected import '+key);
 });
 return module.exports.getStream;
}
const playback={subjectId:'1234567890123456789',detailPath:'example-title',language:'Original',fallbackSubjectId:'9876543210123456789'};
function context(reply){
 const requests=[];
 return {requests,providerContext:{commonHeaders:{'User-Agent':'mobile-browser'},axios:{get:async(url,config)=>{
  requests.push({url,config});
  assert.equal(config.headers.Cookie,'token=');
  if(url.includes('/subject/caption?'))return {status:200,data:{data:{captions:[]}}};
  return reply;
 }}}};
}
test('uses anonymous public API for play and captions without inheriting the website token',async()=>{
 const c=context({status:200,data:{code:0,data:{hasResource:true,streams:[{id:'file',format:'MP4',resolutions:'720',url:'https://cdn.example/video.mp4'}]}}});
 const streams=await load()({link:JSON.stringify(playback),providerContext:c.providerContext});
 assert.equal(streams.length,1);
 assert.equal(c.requests.length,2);
 assert.equal(streams[0].quality,'720');
});
test('reports a session limit without repeating requests against other dubs',async()=>{
 const c=context({status:200,data:{code:0,data:{hasResource:true,limited:true,streams:[]}}});
 await assert.rejects(load()({link:JSON.stringify(playback),providerContext:c.providerContext}),/limiting playback/);
 assert.equal(c.requests.length,1);
});
test('reports HTTP 429 and stops instead of converting it into no streams',async()=>{
 const c=context({status:429,data:{code:429}});
 await assert.rejects(load()({link:JSON.stringify(playback),providerContext:c.providerContext}),/rate limiting/);
 assert.equal(c.requests.length,1);
});
test('keeps VIP-locked sources excluded',async()=>{
 const c=context({status:200,data:{code:0,data:{hasResource:true,streams:[{url:'https://cdn.example/locked.mp4',vipLocked:true}]}}});
 const streams=await load()({link:JSON.stringify(playback),providerContext:c.providerContext});
 assert.equal(streams.length,0);
});
