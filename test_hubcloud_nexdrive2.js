const axios = require('axios');
const cheerio = require('cheerio');
async function run() {
  const res = await axios('https://nexdrive.store/genxfm784776491742//');
  const dotlinkText = res.data;
  const $ = cheerio.load(dotlinkText);
  let vlink = dotlinkText.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i) || [];
  if (!vlink[1]) {
    const zcloud = $('a[href*="zcloud."]').attr('href');
    if (zcloud) {
      vlink = [zcloud, zcloud];
    }
  }
  console.log("vlink from regex and fallback:", vlink[1]);
  console.log("All a tag links:", $('a').map((i, el) => $(el).attr('href')).get());
}
run();
