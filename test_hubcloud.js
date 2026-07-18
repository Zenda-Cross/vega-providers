const { hubcloudExtractor } = require('./providers/extractors/hubcloud');
const axios = require('axios');
const cheerio = require('cheerio');
const commonHeaders = {};
async function run() {
  const result = await hubcloudExtractor("https://zcloud.lol/ipzr7rrq2r0fllp", new AbortController().signal, axios, cheerio, commonHeaders);
  console.log(result);
}
run();
