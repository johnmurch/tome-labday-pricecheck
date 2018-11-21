/*
* CLI script for fetching data of product url
* Usage: node autoextract.js http://www.domain.com/product
*/

'use strict';

const puppeteer = require('puppeteer');
var fs = require('fs')
var WAE = require('web-auto-extractor').default

var cmdArgs = process.argv.slice(2);
if(cmdArgs.length==0){
  console.log('Usage: node autoextract.js http://www.domain.com/product')
  process.exit(1);
}
var url = cmdArgs[0];

const args = [
  "--disable-setuid-sandbox",
  "--no-sandbox",
];

(async() => {
  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
    args: args
  });

  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');

  await page.goto(url);

  const html = await page.content();
  var parsed = WAE().parse(html)

  // DO SOMETHING COOL HERE

  // Output
  console.log('url', url,'\n');
  console.log(JSON.stringify(parsed, null, 4));


  await browser.close();
})();
