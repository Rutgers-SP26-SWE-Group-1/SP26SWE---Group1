const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const assert = require('assert');
const puppeteer = require('puppeteer');

let browser;
let page;

Before(async function () {
  browser = await puppeteer.launch({ headless: false });
  page = await browser.newPage();
});

After(async function () {
  await browser.close();
});

Given('the website is running', async function () {
  // app is already running at localhost:3000
});

When('the user visits the landing page', async function () {
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
});

Then('the landing page should load', async function () {
  const url = page.url();
  assert.strictEqual(url, 'http://localhost:3000/');
});

When('the user visits the signup page', async function () {
  await page.goto('http://localhost:3000/signup', { waitUntil: 'networkidle0' });
});

Then('the signup page should load', async function () {
  const url = page.url();
  assert.strictEqual(url, 'http://localhost:3000/signup');
});