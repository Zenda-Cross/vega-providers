const axios = require('axios');
const cheerio = require('cheerio');
async function run() {
  const res = await axios('https://nexdrive.store/genxfm784776491742//');
  const dotlinkText = res.data;
  console.log(dotlinkText);
}
run();
