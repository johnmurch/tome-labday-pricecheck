const {
  Cluster
} = require('puppeteer-cluster');

// max CPU usage
const cpus = require('os').cpus().length;

const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);

const mkdirp = require('mkdirp');
const extractDomain = require('extract-domain');

const getInnerText = async (page, selector) => page.$eval(selector, el => el.textContent)
const numberify = string => Number(string.replace(/[^\d.]+/, '') || 0)

const BIG_STRING_OF_PRICE_SELECTOR = '#priceblock_ourprice, #priceblock_dealprice, #price_inside_buybox, #newBuyBoxPrice, #soldByThirdParty .a-color-price, .product-price'

// optional proxy settings
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
  // Create a cluster with X workers based on CPUs
  // - you can default to 2 if you want
  const pupcluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_BROWSER,
    maxConcurrency: cpus,
    monitor: true,
    puppeteerOptions: {
      headless: true,
      ignoreHTTPSErrors: true,
      args: args
    }
  });

  const processData = async({
    page,
    data: url
  }) => {

    // optional proxy settings
    await page.authenticate({
      username: proxy.username,
      password: proxy.password
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
    const response = await page.goto(url);

    // generate hash of URL - TODO - might want to switch to asain for amazon
    var crypto = require('crypto');
    var hash = crypto.createHash('md5').update(url).digest("hex");

    //build results folder
    const FOLDER = 'results/' + extractDomain(url)+'-'+hash;//.replace(/[^a-zA-Z]/g, '_');
    mkdirp.sync(FOLDER)

    // WRITE URL
    const urlFile = FOLDER + '/url.txt'
    fs.writeFileSync(urlFile, url);

    // save source
    const sourceFile = FOLDER + '/source.html'
    const source = await response.text();
    fs.writeFileSync(sourceFile, source);

    // save dom
    const html = await page.content();
    const domFile = FOLDER + '/dom.html'
    fs.writeFileSync(domFile, html);

    // Generate Screeenshots
    const path = FOLDER + '/screenshot.png';
    await page.screenshot({
      path:path, fullPage: true
    });

    // extract Page Title
    const pageTitle = await page.evaluate(() => document.title);
    const pageTitleFile = FOLDER + '/pageTitle.txt'
    fs.writeFileSync(pageTitleFile, pageTitle);

    // Try to find price on page
    try{
      // try to detect price and parse
      var price = await getInnerText(page,
                BIG_STRING_OF_PRICE_SELECTOR)
      price = price.toString().trim()
      const priceFile = FOLDER + '/price.txt'
      fs.writeFileSync(priceFile, price);

      var productData = {
        title: pageTitle,
        price: price,
        url: url
      }
      const prodData = FOLDER + '/productData.json'
      fs.writeFileSync(prodData, JSON.stringify(productData,null,4));
    }catch(err) {
      console.log('No price found', url)
    }
  }

  // Read list of URLs file (no Header, just 1 URL per line)
  const csvFile = await readFile(__dirname + '/URLS', 'utf8');
  const lines = csvFile.split('\n');
  var links = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.indexOf('http') > -1) {
      // queue the URLs
      console.log('URL:' + line);
      links++;
      await pupcluster.queue(line, processData);
    }
  }
  // Number of URLs in file
  console.log('Found ' + links + ' URLs');

  // Shutdown after everything is done
  await pupcluster.idle();
  await pupcluster.close();
})();

