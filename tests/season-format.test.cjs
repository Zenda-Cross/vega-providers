const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {transformSync} = require('esbuild');
const helper = {exports: {}};
new Function('module', 'exports', transformSync(fs.readFileSync('providers/formatSeasonLinks.ts', 'utf8'), {loader: 'ts', format: 'cjs'}).code)(helper, helper.exports);
const {formatSeasonTitle, formatSeasonLinks} = helper.exports;
test('formats season release details while preserving episode availability', () => {
  assert.equal(formatSeasonTitle('Season 1 (Episode.01-6 Added) {Hindi-English} 1080p WEB-DL DD5.1 x264 [1.3GB/E]'), 'Season 1 • EP 1–6 • Hindi-English • 1080p • WEB-DL • DD5.1 • x264 • 1.3 GB/episode');
});
test('keeps season ranges and distinguishing release details', () => {
  const title = formatSeasonTitle('Season 1-2 {Hindi-English} 2160p WEB-DL DDP5.1 x265 [10GB] HDR10+ DV 10Bit');
  assert.ok(title.startsWith('Season 1–2 • Hindi-English • 2160p'));
  assert.ok(title.includes('HDR10+ DV 10Bit'));
  assert.equal(formatSeasonTitle('English Dub'), 'English Dub');
});

test('formatting an existing label again does not reorder or duplicate details', () => {
  const formatted = formatSeasonTitle('Season 1 (Episode.01-6 Added) {Hindi-English} 1080p WEB-DL DD5.1 x264 [1.3GB/E]');
  assert.equal(formatSeasonTitle(formatted), formatted);
});
test('formatting retains link data and dynamic episode semantics', () => {
  const input = [{title: 'Season 1 720p', episodesLink: 'https://example.com/season'}, {title: 'Season 2 1080p', directLinks: [{title: 'Episode 1', link: 'https://example.com/episode'}]}];
  const result = formatSeasonLinks(input);
  assert.ok(!('directLinks' in result[0]));
  assert.equal(result[0].episodesLink, input[0].episodesLink);
  assert.equal(result[1].directLinks, input[1].directLinks);
  assert.equal(input[0].title, 'Season 1 720p');
});
