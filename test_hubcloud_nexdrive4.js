const axios = require('axios');
const cheerio = require('cheerio');
async function run() {
  const res = await axios('https://nexdrive.store/genxfm784776491742//');
  const dotlinkText = res.data;
  const $ = cheerio.load(dotlinkText);
  let vlink = dotlinkText.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i) || [];
  if (!vlink[1]) {
    const zcloud = $('a[href*="zcloud."], a[href*="zeefliz.vip"], a[href*="zeefliz18.skin"]').attr('href');
    if (zcloud) {
      vlink = [zcloud, zcloud];
    } else {
      const p = $('a').map((i, el) => $(el).attr('href')).get().find(l => l.includes('vcloud') || l.includes('zcloud'));
      if (p) vlink = [p, p];
    }
  }
  console.log("vlink:", vlink[1]);
  console.log("hubcloud.cx match:", dotlinkText.match(/https?:\/\/[^\/]*hubcloud\.cx[^\"]*/i));
}
run();
