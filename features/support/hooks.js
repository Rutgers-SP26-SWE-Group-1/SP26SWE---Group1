const { Before, After } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');

Before(async function () {
  this.browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 50 // Makes the 1-minute demo video easier for graders to follow
  });
  this.page = await this.browser.newPage();
});

After(async function () {
  if (this.browser) {
    await this.browser.close();
  }
});