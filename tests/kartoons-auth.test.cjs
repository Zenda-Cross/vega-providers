const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const {buildSync} = require('esbuild');
function load(name) {
  const code=buildSync({entryPoints:[`providers/kartoons/${name}.ts`],bundle:true,platform:'browser',format:'cjs',write:false}).outputFiles[0].text;
  const module={exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports,URL,Error});
  return module.exports;
}
const key='kartoons_auth_session';
function setup(options={}) {
  const state=new Map(options.saved ? [[key,options.saved]] : []);
  const calls=[], dialogs=[];
  const ctx={
    commonHeaders:{},
    kvStore:{get:async k=>state.get(k),set:async(k,v)=>state.set(k,v),delete:async k=>state.delete(k)},
    axios:{get:async(url,config={})=>{
      calls.push({url,config});
      if(url.endsWith('/auth/me')) {
        if(options.networkFailure)throw Error('offline');
        if(options.invalid || config.headers.Authorization === 'Bearer expired')return {status:401,data:{}};
        return {status:200,data:{data:{id:'user-1',username:'tester'}}};
      }
      if(options.reply)return options.reply(url,config);
      return {status:200,data:{data:[]}};
    },post:async(url,data,config)=>({status:200,data:{}})},
    openWebView:async(url,config)=>{
      dialogs.push({url,config});
      if(options.cancel)throw Error('WAF_DIALOG_CANCELLED');
      return {data:options.payload || JSON.stringify({kartoonsAuth:true,accessToken:'new-account-token'}),userAgent:'Login UA'};
    },
  };
  return {ctx,state,calls,dialogs};
}
test('opens login and validates the bearer token before allowing catalogue requests',async()=>{
  const c=setup();
  await load('posts').getPosts({filter:'/shows',page:1,providerContext:c.ctx});
  assert.equal(c.dialogs[0].url,'https://kartoons.to/login');
  assert.equal(c.dialogs[0].config.force,true);
  assert.match(c.dialogs[0].config.description,/account is required/);
  assert.equal(c.calls[0].url,'https://api.kartoons.to/api/auth/me');
  assert.equal(c.calls[1].config.headers.Authorization,'Bearer new-account-token');
  assert.equal(c.calls[1].config.headers['user-agent'],'Login UA');
  assert.equal(c.state.get(key).accessToken,'new-account-token');
});
test('every content entry point stops when login is cancelled',async()=>{
  for(const [module,method,args] of [
    ['posts','getPosts',{filter:'/shows',page:1}],
    ['posts','getSearchPosts',{searchQuery:'test',page:1}],
    ['meta','getMeta',{link:'{}'}],
    ['episodes','getEpisodes',{url:'{}'}],
    ['stream','getStream',{link:'{}',type:'movie'}],
  ]) {
    const c=setup({cancel:true});
    await assert.rejects(load(module)[method]({...args,providerContext:c.ctx}),/WAF_DIALOG_CANCELLED/);
    assert.equal(c.calls.length,0,module+' must not make anonymous content requests');
    assert.equal(c.state.has(key),false);
  }
});
test('a challenge token or page HTML cannot unlock authenticated provider access',async()=>{
  for(const payload of [JSON.stringify({challengeToken:'challenge-only'}),'<html>Logged in</html>']) {
    const c=setup({payload});
    await assert.rejects(load('headers').withKartoonsAuth(c.ctx),/No authenticated session/);
    assert.equal(c.calls.length,0);
    assert.equal(c.state.has(key),false);
  }
});
test('rejects an invalid captured token without caching it or requesting content',async()=>{
  const c=setup({invalid:true});
  await assert.rejects(load('headers').withKartoonsAuth(c.ctx),/expired or was rejected/);
  assert.equal(c.calls.length,1);
  assert.equal(c.state.has(key),false);
});
test('validates a saved login without opening the browser again',async()=>{
  const c=setup({saved:{accessToken:'saved-token',userAgent:'saved UA'}});
  const ctx=await load('headers').withKartoonsAuth(c.ctx);
  await ctx.axios.get('https://api.kartoons.to/api/shows');
  assert.equal(c.dialogs.length,0);
  assert.equal(c.calls[1].config.headers.Authorization,'Bearer saved-token');
});
test('rejected stored logins reopen login and replace both session and old challenge state',async()=>{
  const c=setup({saved:{accessToken:'expired',userAgent:'old UA'}});
  c.state.set('kartoons_challenge_token','old-challenge');
  await load('headers').withKartoonsAuth(c.ctx);
  assert.equal(c.dialogs.length,1);
  assert.equal(c.state.get(key).accessToken,'new-account-token');
  assert.equal(c.state.has('kartoons_challenge_token'),false);
});
test('a mid-request 401 opens login and retries exactly once with the new token',async()=>{
  const c=setup({saved:{accessToken:'saved-token',userAgent:'saved UA'},reply:(_url,config)=>({status:config.headers.Authorization==='Bearer saved-token'?401:200,data:{}})});
  const ctx=await load('headers').withKartoonsAuth(c.ctx);
  assert.equal((await ctx.axios.get('https://api.kartoons.to/api/shows')).status,200);
  assert.equal(c.dialogs.length,1);
  const content=c.calls.filter(c=>c.url.endsWith('/shows'));
  assert.equal(content.length,2);
  assert.equal(content[1].config.headers.Authorization,'Bearer new-account-token');
});
test('a second 401 clears the session and fails instead of looping',async()=>{
  const c=setup({saved:{accessToken:'saved-token',userAgent:'UA'},reply:()=>{const e=Error('unauthorized');e.response={status:401};throw e;}});
  const ctx=await load('headers').withKartoonsAuth(c.ctx);
  await assert.rejects(ctx.axios.get('https://api.kartoons.to/api/shows'),/rejected your login/);
  assert.equal(c.dialogs.length,1);
  assert.equal(c.state.has(key),false);
});
test('account authorization is never added to worker or unrelated URLs',async()=>{
  const c=setup({saved:{accessToken:'saved-token',userAgent:'UA'}});
  const ctx=await load('headers').withKartoonsAuth(c.ctx);
  for(const url of ['https://v178.example.workers.dev/playlist/test','https://api.kartoons.to.evil.example/api/shows']) {
    await ctx.axios.get(url,{headers:{Referer:'https://kartoons.to/'}});
    assert.equal(c.calls.at(-1).config.headers.Authorization,undefined);
  }
});
test('a network error validating an existing login does not discard it or open a login dialog',async()=>{
  const c=setup({saved:{accessToken:'saved-token',userAgent:'UA'},networkFailure:true});
  await assert.rejects(load('headers').withKartoonsAuth(c.ctx),/could not validate/);
  assert.equal(c.dialogs.length,0);
  assert.equal(c.state.get(key).accessToken,'saved-token');
});
test('the injected script sends the account token only after a successful profile check',async()=>{
  const script=load('headers').loginScript;
  for(const valid of [true,false]) {
    const storage=new Map([['token','browser-token'],['user','{}']]),messages=[],timers=[];
    const localStorage={getItem:k=>storage.get(k),removeItem:k=>storage.delete(k)};
    const window={ReactNativeWebView:{postMessage:s=>messages.push(JSON.parse(s))},fetch:async(url,config)=>{
      assert.equal(url,'https://api.kartoons.to/api/auth/me');
      assert.equal(config.headers.Authorization,'Bearer browser-token');
      return {ok:valid,status:valid?200:401,json:async()=>({data:{id:'user-1'}})};
    }};
    vm.runInNewContext(script,{window,localStorage,setTimeout:fn=>timers.push(fn)});
    await new Promise(resolve=>setImmediate(resolve));
    if(valid)assert.equal(JSON.parse(messages[0].data).accessToken,'browser-token');
    else {assert.equal(messages.length,0);assert.equal(storage.has('token'),false);}
  }
});
