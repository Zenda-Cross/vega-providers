const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{buildSync}=require('esbuild');
const code=buildSync({entryPoints:['providers/mod/request.ts'],bundle:true,format:'cjs',write:false}).outputFiles[0].text;
function load(){const m={exports:{}};vm.runInNewContext(code,{module:m,exports:m.exports,URL});return m.exports.getPage;}
test('Cloudflare challenge uses interactive verification and reuses the session',async()=>{
 let calls=0,prompts=0;const store=new Map();const ctx={commonHeaders:{},kvStore:{get:async k=>store.get(k),set:async(k,v)=>store.set(k,v)},axios:{get:async(url,config)=>{
 calls++;if(calls===1)return {data:'<title>Just a moment</title>',headers:{}};
 assert.equal(config.headers.Cookie,'cf_clearance=test');assert.equal(config.headers['User-Agent'],'Verified Browser');return {data:'page'};
 }},openWebView:async()=>{prompts++;return {url:'https://example.com/page',cookies:'cf_clearance=test',userAgent:'Verified Browser'};}};
 const get=load();await get('https://example.com/page',ctx);await get('https://example.com/page',ctx);assert.equal(prompts,1);
});
test('ordinary forbidden responses do not trigger verification',async()=>{
 let prompts=0;const ctx={axios:{get:async()=>{throw {response:{status:403,data:'Forbidden'}};}},openWebView:async()=>{prompts++;}};
 await assert.rejects(load()('https://example.com/',ctx));assert.equal(prompts,0);
});
test('missing verification support reports a useful error',async()=>{
 await assert.rejects(load()('https://example.com/',{axios:{get:async()=>({data:'<script src="/cdn-cgi/challenge-platform/test"></script>'})}}),/WebView support/);
});
