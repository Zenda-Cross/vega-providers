const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{buildSync}=require('esbuild');
test('ZCloud reuses the verified session only for the same origin',async()=>{
  const module={exports:{}};
  vm.runInNewContext(buildSync({entryPoints:['providers/extractors/zcloud.ts'],bundle:true,format:'cjs',write:false}).outputFiles[0].text,
    {module,exports:module.exports,URL,console:{log(){}}});
  const extract=module.exports.zcloudExtractor;
  const sessions=new Map();
  const requests=[];
  let prompts=0;
  const ctx={kvStore:{get:async k=>sessions.get(k),set:async(k,v)=>sessions.set(k,v)},
    openWebView:async url=>{
      prompts++;
      return {url,cookies:'cf_clearance=test; other=private',userAgent:'Verified browser',data:'<a class="server" href="https://cdn.example/file.mkv">Download</a>'};
    }};
  const axios=async(url,{headers})=>{
    requests.push({...headers});
    if(requests.length===1) throw {response:{status:403}};
    return {data:'<a class="server" href="https://cdn.example/file.mkv">Download</a>'};
  };
  for(const url of ['https://zcloud.lat/one','https://zcloud.lat/two','https://zcloud.example/three']){
    const streams=await extract(url,new AbortController().signal,axios,require('cheerio'),{},ctx);
    assert.equal(streams.length,1);
  }
  assert.equal(prompts,1);
  assert.deepEqual(requests,[{}, {Cookie:'cf_clearance=test','User-Agent':'Verified browser'}, {}]);
});
