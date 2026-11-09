const assert = require('node:assert/strict');
const {test} = require('node:test');
const {getMeta} = require('../dist/internetArchive/meta');
const {getStream} = require('../dist/internetArchive/stream');
const cheerio = require('cheerio');

function context(names) {
  return {
    commonHeaders: {}, cheerio,
    axios: {get: async () => ({data: {
      metadata: {title: 'Test Show', collection: ['classic_tv']},
      files: names.flatMap(name => [
        {name, source: 'original'},
        {name: name.replace(/\.mp4$/, '.ogv'), source: 'derivative', original: name},
      ]),
    }})},
  };
}

test('separates and numerically sorts seasons and episodes while keeping encodes together', async () => {
  const ctx = context(['Show S02E10.mp4', 'Show S01E19.mp4', 'Show 2x02.mp4', 'Show S00E01.mp4']);
  const meta = await getMeta({link: 'show', providerContext: ctx});
  assert.deepEqual(meta.linkList.map(s => s.title), ['Season 0', 'Season 1', 'Season 2']);
  assert.deepEqual(meta.linkList[2].directLinks.map(e => e.title), ['Show 2x02', 'Show S02E10']);
  const streams = await getStream({link: meta.linkList[2].directLinks[0].link, providerContext: ctx});
  assert.equal(streams.length, 2);
  assert.ok(streams.every(s => decodeURIComponent(new URL(s.link).pathname).includes('Show 2x02')));
});

test('round-trips reserved characters in generated episode links without decoding twice', async () => {
  for (const name of ['folder/Episode 1 100% complete.mp4', 'Episode 1 literal%20 #?.mp4']) {
    const ctx = context([name, 'Episode 2.mp4']);
    const meta = await getMeta({link: 'show', providerContext: ctx});
    const episode = meta.linkList[0].directLinks.find(e => e.title.includes('Episode 1'));
    const streams = await getStream({link: episode.link, providerContext: ctx});
    assert.equal(streams.length, 2);
    assert.equal(decodeURIComponent(new URL(streams[0].link).pathname), `/download/show/${name}`);
  }
});
