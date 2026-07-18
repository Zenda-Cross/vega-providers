const axios = require('axios');
const cheerio = require('cheerio');

async function run() {
  const res = await axios('https://nexdrive.store/genxfm784776491742//');
  const $ = cheerio.load(res.data);
  const vlink = res.data.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i) || [];
  console.log("vlink from regex", vlink);
  console.log("all links", $('a').map((i, el) => $(el).attr('href')).get());
}
run();
