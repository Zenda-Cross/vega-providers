const assert=require('node:assert/strict');
const {test}=require('node:test');
const vm=require('node:vm');
const {buildSync}=require('esbuild');
function load(name){const module={exports:{}};const code=buildSync({entryPoints:[`providers/kartoons/${name}.ts`],bundle:true,platform:'browser',format:'cjs',write:false}).outputFiles[0].text;vm.runInNewContext(code,{module,exports:module.exports,URL,Error});return module.exports;}
const base='https://api.kartoons.to/api/cloudstream',key='kartoons_device_session';
function setup(options={}){
 const state=new Map(options.saved?[[key,options.saved]]:[]),calls=[],dialogs=[];
 const ctx={commonHeaders:{},kvStore:{get:async k=>state.get(k),set:async(k,v)=>state.set(k,v),delete:async k=>state.delete(k)},axios:{
  get:async(url,config)=>{calls.push({url,config});return options.reply?options.reply(url,config):{status:200,data:{data:[]}};},
  post:async(url,data,config)=>{calls.push({url,data,config});return {status:200,data:{success:true,code:'ABC123',expires_in:600,poll_interval:5}};},
 },openWebView:async(url,config)=>{dialogs.push({url,config});if(options.cancel)throw Error('WAF_DIALOG_CANCELLED');return {data:options.payload||JSON.stringify({kartoonsDevice:true,code:'ABC123',token:'device-token'}),userAgent:'Device UA'};}};
 return {ctx,state,calls,dialogs};
}
test('links using the official device-code flow and persists the returned device token',async()=>{
 const c=setup();c.state.set('kartoons_auth_session',{accessToken:'old-website-token'});
 await load('posts').getPosts({filter:'/catalog/show',page:1,providerContext:c.ctx});
 assert.equal(c.calls[0].url,base+'/device/code');
 assert.equal(c.dialogs[0].url,'https://kartoons.to/cloudstream/link?code=ABC123');
 assert.match(c.dialogs[0].config.description,/ABC123/);
 assert.equal(c.state.get(key).token,'device-token');
 assert.equal(c.state.has('kartoons_auth_session'),false);
 assert.equal(new URL(c.calls[1].url).searchParams.get('token'),'device-token');
 assert.equal(c.calls[1].config.headers.Authorization,undefined);
 assert.ok(!c.calls.some(c=>c.url.includes('/auth/me')||c.url.includes('/auth/refresh')));
});
test('reuses linked device tokens without making profile requests or opening dialogs',async()=>{
 const c=setup({saved:{token:'saved-device',userAgent:'UA'}});
 const ctx=await load('headers').withKartoonsAuth(c.ctx);
 assert.equal(c.calls.length,0);
 await ctx.axios.get(base+'/search?q=vinland');
 assert.equal(c.calls.length,1);assert.equal(c.dialogs.length,0);
 assert.equal(new URL(c.calls[0].url).searchParams.get('q'),'vinland');
 assert.equal(new URL(c.calls[0].url).searchParams.get('token'),'saved-device');
});
test('old website tokens do not masquerade as official device tokens',async()=>{
 const c=setup();c.state.set('kartoons_auth_session',{accessToken:'website-jwt',refreshToken:'refresh'});
 await load('headers').withKartoonsAuth(c.ctx);
 assert.equal(c.dialogs.length,1);assert.equal(c.state.get(key).token,'device-token');
});
test('all entry points stop after cancelled device approval',async()=>{
 for(const [name,fn,args] of [['posts','getPosts',{filter:'/catalog/show',page:1}],['posts','getSearchPosts',{searchQuery:'test',page:1}],['meta','getMeta',{link:'{}'}],['episodes','getEpisodes',{url:'{}'}],['stream','getStream',{link:'{}',type:'movie'}]]){
  const c=setup({cancel:true});await assert.rejects(load(name)[fn]({...args,providerContext:c.ctx}),/WAF_DIALOG_CANCELLED/);
  assert.equal(c.calls.length,1);assert.equal(c.calls[0].url,base+'/device/code');assert.equal(c.state.has(key),false);
 }
});
test('rejects account tokens, unrelated device codes and incomplete approval',async()=>{
 for(const payload of [{kartoonsAuth:true,accessToken:'jwt'},{kartoonsDevice:true,code:'OTHER1',token:'wrong'},{}]){
  const c=setup({payload:JSON.stringify(payload)});await assert.rejects(load('headers').withKartoonsAuth(c.ctx),/not linked/);assert.equal(c.state.has(key),false);
 }
});
test('network and server failures preserve a linked device without reopening login',async()=>{
 for(const reply of [()=>{throw Error('offline')},()=>({status:503,data:{}})]){
  const c=setup({saved:{token:'saved-device',userAgent:'UA'},reply});const ctx=await load('headers').withKartoonsAuth(c.ctx);
  await assert.rejects(ctx.axios.get(base+'/catalog/show'),/kept/);assert.equal(c.dialogs.length,0);assert.equal(c.state.get(key).token,'saved-device');
 }
});
test('explicit auth_required triggers a new link and one retry',async()=>{
 const c=setup({saved:{token:'expired-device',userAgent:'UA'},reply:url=>({status:200,data:new URL(url).searchParams.get('token')==='expired-device'?{auth_required:true}:{data:[]}})});
 const ctx=await load('headers').withKartoonsAuth(c.ctx);await ctx.axios.get(base+'/catalog/show');
 assert.equal(c.dialogs.length,1);assert.equal(c.calls.filter(c=>c.url.includes('/catalog/show')).length,2);assert.equal(c.state.get(key).token,'device-token');
});
test('a second authentication rejection clears the bad device token without looping',async()=>{
 const c=setup({saved:{token:'expired-device',userAgent:'UA'},reply:()=>({status:401,data:{auth_required:true}})});
 const ctx=await load('headers').withKartoonsAuth(c.ctx);await assert.rejects(ctx.axios.get(base+'/catalog/show'),/rejected the device link/);assert.equal(c.dialogs.length,1);assert.equal(c.state.has(key),false);
});
test('coalesced dialogs can share a linked device after server confirmation',async()=>{
 const c=setup({payload:JSON.stringify({kartoonsDevice:true,code:'SHARED',token:'shared-device'}),reply:()=>({status:200,data:{status:'linked',token:'shared-device'}})});
 await load('headers').withKartoonsAuth(c.ctx);
 assert.equal(c.state.get(key).token,'shared-device');
 assert.ok(c.calls.some(c=>c.url.endsWith('/device/status?code=SHARED')));
});
test('device tokens are never added to worker or unrelated URLs',async()=>{
 const c=setup({saved:{token:'saved-device',userAgent:'UA'}});const ctx=await load('headers').withKartoonsAuth(c.ctx);
 for(const url of ['https://v178.example.workers.dev/playlist/test','https://api.kartoons.to.evil.example/api/cloudstream/search']){await ctx.axios.get(url,{headers:{}});assert.equal(c.calls.at(-1).url,url);assert.equal(c.calls.at(-1).config.headers.Authorization,undefined);}
});
test('the browser polls device status and resolves only after linked, without reading account storage',async()=>{
 const helper=load('headers');const callbacks=[],messages=[];let linked=false;
 const window={fetch:async url=>{assert.equal(url,base+'/device/status?code=ABC123');return {ok:true,json:async()=>linked?{status:'linked',token:'server-device-token'}:{status:'pending'}};},ReactNativeWebView:{postMessage:s=>messages.push(JSON.parse(s))}};
 vm.runInNewContext(helper.deviceLoginScript('ABC123',5000),{window,setTimeout:(fn,ms)=>{assert.equal(ms,5000);callbacks.push(fn);}});
 await new Promise(r=>setImmediate(r));assert.equal(messages.length,0);linked=true;await callbacks.shift()();
 const data=JSON.parse(messages[0].data);assert.equal(data.token,'server-device-token');assert.equal(data.code,'ABC123');
});
test('catalogue and search use Cloudstream id fields and the official q parameter',async()=>{
 const c=setup({saved:{token:'saved-device',userAgent:'UA'},reply:()=>({status:200,data:{data:[{id:'show-id',title:'Vinland Saga',type:'show',image:'poster'}]}})});
 const posts=load('posts');
 const result=await posts.getPosts({filter:'/catalog/show?catalog=popular',page:2,providerContext:c.ctx});
 assert.equal(JSON.parse(result[0].link).id,'show-id');
 assert.equal(new URL(c.calls[0].url).pathname,'/api/cloudstream/catalog/show');
 assert.equal(new URL(c.calls[0].url).searchParams.get('page'),'2');
 await posts.getSearchPosts({searchQuery:'vinland saga',page:1,providerContext:c.ctx});
 assert.equal(new URL(c.calls[1].url).searchParams.get('q'),'vinland saga');
});
test('seasons use the official slug-based episode route rather than a MongoDB season id',async()=>{
 const c=setup({saved:{token:'saved-device',userAgent:'UA'},reply:()=>({status:200,data:{data:[{_id:'ep-1',episodeNumber:1,title:'Episode'}]}})});
 const eps=await load('episodes').getEpisodes({url:JSON.stringify({showId:'show-id',seasonId:'mongo-id',slug:'season-2',seasonNumber:2}),providerContext:c.ctx});
 assert.equal(new URL(c.calls[0].url).pathname,'/api/cloudstream/show/show-id/season/season-2/episodes');
 assert.equal(JSON.parse(eps[0].link).id,'ep-1');
});
