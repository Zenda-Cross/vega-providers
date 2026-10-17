const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const {transformSync} = require('esbuild');
const cheerio = require('cheerio');
function load(name, imports = {}) {
  const file = path.join(__dirname, '../providers/extractors', name + '.ts');
  const code = transformSync(fs.readFileSync(file, 'utf8'), {loader:'ts', format:'cjs'}).code;
  const module = {exports:{}};
  new Function('module','exports','require',code)(module,module.exports,key=>{
    if (imports[key]) return imports[key];
    throw Error('Unexpected import: ' + key);
  });
  return module.exports;
}
const {buzzheavierExtractor} = load('buzzheavier');
const ctx = {cheerio, commonHeaders:{'User-Agent':'test-browser'}};

test('resolves Buzzheavier HTMX endpoint and preserves playback headers', async()=>{
  const calls=[];
  const axios={
    get:async(url)=>{
      calls.push(url);
      return {data:'<a class="download-btn" hx-get="/file/download">Download</a>',headers:{'set-cookie':['session=one; Path=/','token=two; Secure']}};
    },
    head:async(url,config)=>{
      assert.equal(url,'https://bzzhr.co/file/download');
      assert.equal(config.maxRedirects,0);
      assert.equal(config.headers['HX-Request'],'true');
      assert.equal(config.headers.Cookie,'session=one; token=two');
      return {headers:{'hx-redirect':'https://cdn.example/media.mkv'}};
    },
  };
  const result=await buzzheavierExtractor('https://bzzhr.co/file/download',axios,ctx);
  assert.deepEqual(calls,['https://bzzhr.co/file']);
  assert.equal(result.link,'https://cdn.example/media.mkv');
  assert.equal(result.headers.Referer,'https://bzzhr.co/file');
});

test('does not return a made-up /download URL when Buzzheavier is unavailable',async()=>{
  const result=await buzzheavierExtractor('https://bzzhr.co/file',{get:async()=>({data:'<h1>Not found</h1>',headers:{}})},ctx);
  assert.equal(result,null);
});

test('does not expose an unresolved HTMX response as a stream',async()=>{
  const result=await buzzheavierExtractor('https://bzzhr.co/file',{
    get:async()=>({data:'<a class="download-btn" hx-get="/file/download">Download</a>',headers:{}}),
    head:async()=>({headers:{}}),
  },ctx);
  assert.equal(result,null);
});

test('follows a VegaDrive mirror redirect and keeps Gofile authentication',async()=>{
  const {vegadriveExtractor}=load('vegadrive',{
    './buzzheavier':{buzzheavierExtractor},
    './transferit':{transferitExtractor:async()=>null},
    './gofile':{gofileExtractor:async(id)=>{
      assert.equal(id,'realFolder');
      return {link:'https://store.gofile.io/download/video.mkv',token:'account-token'};
    }},
  });
  const axios={get:async(url)=>{
    if(url==='https://old.example/s/share')return {status:301,headers:{location:'https://new.example/s/share'}};
    if(url==='https://new.example/s/share')return {status:200,headers:{}};
    assert.ok(url.startsWith('https://new.example/d/share/'));
    return {headers:url.endsWith('/gofile')?{location:'https://gofile.io/d/realFolder'}:{}};
  }};
  const streams=await vegadriveExtractor('https://old.example/s/share',axios,ctx);
  assert.equal(streams.length,1);
  assert.equal(streams[0].headers.Cookie,'accountToken=account-token');
  assert.equal(streams[0].headers.Referer,'https://gofile.io/');
});

test('resolves mirror redirects with no final-URL fields in published apps', async()=>{
    const calls=[];
    const {vegadriveExtractor}=load('vegadrive',{
      './buzzheavier':{buzzheavierExtractor:async()=>null},
      './transferit':{transferitExtractor:async(id)=>{
        assert.equal(id,'transferId');return 'https://cdn.example/video.mp4';
      }},
      './gofile':{gofileExtractor:async()=>{throw Error('not used');}},
    });
    const axios={get:async(url,config)=>{
      calls.push(url);
      assert.equal(config.maxRedirects,0);
      // No request.responseURL, request.res.responseUrl, or fetch.url available.
      if(url==='https://old.example/s/share')return {status:301,headers:{location:'https://new.example/redirect/share'}};
      if(url==='https://new.example/redirect/share')return {status:302,headers:{location:'../s/share'}};
      if(url==='https://new.example/s/share')return {status:200,headers:{}};
      assert.ok(url.startsWith('https://new.example/d/share/'));
      return {status:302,headers:url.endsWith('/transferit')?{location:'https://transfer.it/t/transferId'}:{}};
    }};
    const streams=await vegadriveExtractor('https://old.example/s/share',axios,ctx);
    assert.equal(streams.length,1);
    assert.equal(streams[0].link,'https://cdn.example/video.mp4');
    assert.ok(calls.includes('https://new.example/s/share'));
  });
