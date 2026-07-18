const { hubcloudExtractor } = require('./providers/extractors/hubcloud');
const axios = require('axios');
const cheerio = require('cheerio');

async function run() {
  const link = "https://zcloud.lol/ipzr7rrq2r0fllp";
  const html = `...let dynamicUrl = atob(atob('YUhSMGNITTZMeTkyWTJ4dmRXUXVlbWx3TDJsd2VuSTNjbkp4TW5Jd1pteHNjRDkwYjJ0bGJqMWthM1F3VlZWcmRtUldTVFJpVnpsVVlqTmtUV1JxWnpKT2JGazFXakp3VmxScVZYZGxSWGhzVTFaUk5WSXdWa05OUm5CSVUyNVpORkZVTUQwPQ=='));...`;
}
