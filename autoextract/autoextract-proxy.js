/*
* !!!! PLEASE BE SURE TO UPDATE YOUR .env FILE WITH YOUR PROXY INFORMATION!!!!
* CLI script for fetching data of product url
* Usage: node autoextract-proxy.js http://www.domain.com/product
*/

'use strict';
require('dotenv').config()

const puppeteer = require('puppeteer');
var fs = require('fs')
var WAE = require('web-auto-extractor').default

var cmdArgs = process.argv.slice(2);
if(cmdArgs.length==0){
  console.log('Usage: node autoextract.js http://www.domain.com/product')
  process.exit(1);
}
var url = cmdArgs[0];

// Proxy
var proxy = {
  "url": process.env.proxyUrl,// ip_address:port
  "username": process.env.proxyUsername,
  "password": process.env.proxyPassword
}

const args = [
  `--proxy-server=${proxy.url}`,
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

  // Proxy
  await page.authenticate({
    username: proxy.username,
    password: proxy.password
  });

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');

  await page.goto(url);
  await page.screenshot({path: 'screenshot.png',  fullPage: true});

  const html = await page.content();
  var parsed = WAE().parse(html)
  console.log('url', url,'\n');
  console.log(JSON.stringify(parsed, null, 4));

  // DO SOMETHING COOL HERE

  await browser.close();
})();
