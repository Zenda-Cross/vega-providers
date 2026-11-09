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
 const catalogs=await load('catalog').catalog({providerContext:c.ctx});
 assert.equal(catalogs.length,4);
 assert.equal(c.calls[0].url,base+'/device/code');
 const loginUrl=new URL(c.dialogs[0].url);
 assert.equal(loginUrl.pathname,'/login');
 assert.equal(loginUrl.searchParams.get('redirect'),'/cloudstream/link?code=ABC123');
 assert.match(c.dialogs[0].config.description,/ABC123/);
 assert.equal(c.state.get(key).token,'device-token');
 assert.equal(c.state.has('kartoons_auth_session'),false);
 await load('posts').getPosts({filter:'/catalog/show',page:1,providerContext:c.ctx});
 assert.equal(c.dialogs.length,1);
 assert.equal(c.state.get(key).token,'device-token');
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
 await load('catalog').catalog({providerContext:c.ctx});
 assert.equal(c.dialogs.length,1);assert.equal(c.state.get(key).token,'device-token');
});
test('catalog is the sole entry point that opens the device-link dialog',async()=>{
 const c=setup({cancel:true});
 await assert.rejects(load('catalog').catalog({providerContext:c.ctx}),/WAF_DIALOG_CANCELLED/);
 assert.equal(c.calls.length,1);assert.equal(c.calls[0].url,base+'/device/code');assert.equal(c.state.has(key),false);
 for(const [name,fn,args] of [['posts','getPosts',{filter:'/catalog/show',page:1}],['posts','getSearchPosts',{searchQuery:'test',page:1}],['meta','getMeta',{link:'{}'}],['episodes','getEpisodes',{url:'{}'}],['stream','getStream',{link:'{}',type:'movie'}]]){
  const noLink=setup();await assert.rejects(load(name)[fn]({...args,providerContext:noLink.ctx}),/Open the Kartoons catalog/);
  assert.equal(noLink.dialogs.length,0);
 }
});
test('rejects account tokens, unrelated device codes and incomplete approval',async()=>{
 for(const payload of [{kartoonsAuth:true,accessToken:'jwt'},{kartoonsDevice:true,code:'OTHER1',token:'wrong'},{}]){
  const c=setup({payload:JSON.stringify(payload)});await assert.rejects(load('catalog').catalog({providerContext:c.ctx}),/not linked/);assert.equal(c.state.has(key),false);
 }
});
test('network and server failures preserve a linked device without reopening login',async()=>{
 for(const reply of [()=>{throw Error('offline')},()=>({status:503,data:{}})]){
  const c=setup({saved:{token:'saved-device',userAgent:'UA'},reply});const ctx=await load('headers').withKartoonsAuth(c.ctx);
  await assert.rejects(ctx.axios.get(base+'/catalog/show'),/kept/);assert.equal(c.dialogs.length,0);assert.equal(c.state.get(key).token,'saved-device');
 }
});
test('auth_required clears a rejected device link and requires catalog relinking',async()=>{
 const c=setup({saved:{token:'expired-device',userAgent:'UA'},reply:()=>({status:200,data:{auth_required:true}})});
 const ctx=await load('headers').withKartoonsAuth(c.ctx);await assert.rejects(ctx.axios.get(base+'/catalog/show'),/Open the Kartoons catalog/);
 assert.equal(c.dialogs.length,0);assert.equal(c.calls.filter(c=>c.url.includes('/catalog/show')).length,1);assert.equal(c.state.has(key),false);
});
test('an authentication rejection clears the bad device token without opening another dialog',async()=>{
 const c=setup({saved:{token:'expired-device',userAgent:'UA'},reply:()=>({status:401,data:{auth_required:true}})});
 const ctx=await load('headers').withKartoonsAuth(c.ctx);await assert.rejects(ctx.axios.get(base+'/catalog/show'),/Open the Kartoons catalog/);assert.equal(c.dialogs.length,0);assert.equal(c.state.has(key),false);
});
test('coalesced dialogs can share a linked device after server confirmation',async()=>{
 const c=setup({payload:JSON.stringify({kartoonsDevice:true,code:'SHARED',token:'shared-device'}),reply:()=>({status:200,data:{status:'linked',token:'shared-device'}})});
 await load('catalog').catalog({providerContext:c.ctx});
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
test('settings expose a credential reset without clearing an existing link just by opening settings',async()=>{
 const c=setup({saved:{token:'saved-device',userAgent:'UA'}});
 const fields=await load('settings').getSettingsSchema({providerContext:c.ctx});
 assert.equal(fields[0].key,'kartoons_clear_credentials');
 assert.equal(fields[0].type,'toggle');
 assert.equal(fields[0].defaultValue,false);
 assert.equal(c.state.get(key).token,'saved-device');
 assert.equal(c.calls.length,0);assert.equal(c.dialogs.length,0);
});
test('saved reset clears device and legacy credentials once while preserving other preferences',async()=>{
 const c=setup({saved:{token:'saved-device',userAgent:'UA'}});
 c.state.set('kartoons_clear_credentials',true);
 c.state.set('kartoons_auth_session',{accessToken:'old-account-token'});
 c.state.set('kartoons_challenge_token','old-challenge');
 c.state.set('unrelatedPreference','keep');
 await load('catalog').catalog({providerContext:c.ctx});
 assert.equal(c.state.get(key).token,'device-token');
 assert.equal(c.state.has('kartoons_auth_session'),false);
 assert.equal(c.state.has('kartoons_challenge_token'),false);
 assert.equal(c.state.get('kartoons_clear_credentials'),false);
 assert.equal(c.state.get('unrelatedPreference'),'keep');
 await load('catalog').catalog({providerContext:c.ctx});
 assert.equal(c.dialogs.length,1);
});
test('reset is also applied when settings are reopened, without automatically starting a new login',async()=>{
 const c=setup({saved:{token:'saved-device',userAgent:'UA'}});
 c.state.set('kartoons_clear_credentials',true);
 await load('settings').getSettingsSchema({providerContext:c.ctx});
 assert.equal(c.state.has(key),false);
 assert.equal(c.state.get('kartoons_clear_credentials'),false);
 assert.equal(c.dialogs.length,0);
});
