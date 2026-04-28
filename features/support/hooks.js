const { Before, After } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');

Before(async function () {
  this.browser = await puppeteer.launch({ headless: true });
  this.page = await this.browser.newPage();
});

After(async function () {
  await this.browser.close();
});