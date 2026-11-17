const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{buildSync}=require('esbuild');
const code=buildSync({entryPoints:['providers/mod/request.ts'],bundle:true,format:'cjs',write:false}).outputFiles[0].text;
function load(){const m={exports:{}};vm.runInNewContext(code,{module:m,exports:m.exports,URL});return m.exports.getPage;}
test('Cloudflare challenge uses interactive verification and reuses the session',async()=>{
 let calls=0,prompts=0;const store=new Map();const ctx={commonHeaders:{},kvStore:{get:async k=>store.get(k),set:async(k,v)=>store.set(k,v)},axios:{get:async(url,config)=>{
 calls++;if(calls===1)return {data:'<title>Just a moment...</title>',headers:{}};
 assert.equal(config.headers.Cookie,'cf_clearance=test');assert.equal(config.headers['User-Agent'],'Verified Browser');return {data:'page'};
 }},openWebView:async()=>{prompts++;return {url:'https://example.com/page',cookies:'cf_clearance=test',userAgent:'Verified Browser'};}};
 const get=load();await get('https://example.com/page',ctx);await get('https://example.com/page',ctx);assert.equal(prompts,1);
});
test('ordinary forbidden responses do not trigger verification',async()=>{
 let prompts=0;const ctx={axios:{get:async()=>{throw {response:{status:403,data:'Forbidden'}};}},openWebView:async()=>{prompts++;}};
 await assert.rejects(load()('https://example.com/',ctx));assert.equal(prompts,0);
});
test('missing verification support reports a useful error',async()=>{
 await assert.rejects(load()('https://example.com/',{axios:{get:async()=>({data:'<title>Just a moment...</title>'})}}),/WebView support/);
});

test('normal pages with Turnstile widgets do not reopen verification',async()=>{
 let prompts=0;const ctx={axios:{get:async()=>({data:'<title>Movie</title><script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script><div class="cf-turnstile"></div>'})},openWebView:async()=>{prompts++;}};
 await load()('https://example.com/movie',ctx);assert.equal(prompts,0);
});
test('verification may reuse a solved session and return the requested HTML directly',async()=>{
 let calls=0;const ctx={axios:{get:async()=>{calls++;return {data:'<title>Just a moment...</title>'};}},openWebView:async(url,options)=>{
 assert.equal(options.force,false);return {url,cookies:'cf_clearance=test',userAgent:'Verified Browser',data:'<title>Movie information</title>'};}};
 const result=await load()('https://example.com/movie',ctx);assert.equal(calls,1);assert.equal(result.data,'<title>Movie information</title>');
});
test('verified rendered redirect is consumed without requesting the challenged wrapper again',async()=>{
 let calls=0;const ctx={axios:{get:async()=>{calls++;return {data:'<title>Just a moment...</title>'};}},openWebView:async()=>({url:'https://example.com/episodes/',cookies:'',userAgent:'Browser',data:'<h3>Episode 1</h3>'})};
 const response=await load()('https://example.com/wrapper',ctx);assert.equal(calls,1);assert.equal(response.url,'https://example.com/episodes/');
});
test('episode wrapper decoding and relative refresh preserve navigation and final episode URLs',async()=>{
 const code=buildSync({entryPoints:['providers/mod/episodes.ts'],bundle:true,format:'cjs',write:false}).outputFiles[0].text;
 const m={exports:{}};vm.runInNewContext(code,{module:m,exports:m.exports,URL,atob,console});
 const calls=[];const ctx={cheerio:require('cheerio'),commonHeaders:{},axios:{get:async(url,config)=>{
 calls.push(url);if(calls.length===1)return {data:'<meta http-equiv="refresh" content="0;url=/season/episodes">'};
 assert.equal(config.headers.Referer,'https://example.com/season');return {data:'<h3><a href="episode-1">Episode 1</a></h3>'};
 }}};
 const url='https://example.com/wrapper?url='+encodeURIComponent(btoa('https://example.com/season'))+'&extra=1';
 const result=await m.exports.getEpisodes({url,providerContext:ctx});assert.equal(calls[0],'https://example.com/season');assert.equal(result[0].link,'https://example.com/season/episode-1');
});
