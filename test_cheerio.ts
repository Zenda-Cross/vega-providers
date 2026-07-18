import axios from 'axios';
import * as cheerio from 'cheerio';
async function run() {
  const res = await axios('https://zcloud.lol/ipzr7rrq2r0fllp', { headers: { 'Cookie': 'ext_name=ojplmecpdpgccookcobabopnaifgidhf; xla=s4t; cf_clearance=woQrFGXtLfmEMBEiGUsVHrUBMT8s3cmguIzmMjmvpkg-1770053679-1.2.1.1-xBrQdciOJsweUF6F2T_OtH6jmyanN_TduQ0yslc_XqjU6RcHSxI7.YOKv6ry7oYo64868HYoULnVyww536H2eVI3R2e4wKzsky6abjPdfQPxqpUaXjxfJ02o6jl3_Vkwr4uiaU7Wy596Vdst3y78HXvVmKdIohhtPvp.vZ9_L7wvWdce0GRixjh_6JiqWmWMws46hwEt3hboaS1e1e4EoWCvj5b0M_jVwvSxBOAW5emFzvT3QrnRh4nyYmKDERnY' }});
  const text = res.data;
  const $ = cheerio.load(text);
  console.log('text length:', text.length);
  console.log($('.btn-success.btn-lg.h6,.btn-danger,.btn-secondary').length);
  console.log('body html:', $('body').html()?.slice(0, 500));
}
run();
