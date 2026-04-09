const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const assert = require('assert');
const puppeteer = require('puppeteer');


let browser;
let page;

Given('the user is on the signup page for auth', async function () {
  await page.goto('http://localhost:3000/signup', { waitUntil: 'networkidle0' });
});

Given('the user is on the login page for auth', async function () {
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
});

When('the user fills in {string} as first name and {string} as last name', async function (first, last) {
  await page.waitForSelector('input[placeholder="Ved"]', { timeout: 5000 });
  await page.type('input[placeholder="Ved"]', first);
  await page.type('input[placeholder="Patel"]', last);
});

When('the user selects {string} as major and {string} as year', async function (major, year) {
  await page.select('select:nth-of-type(1)', major);
  await page.select('select:nth-of-type(2)', year);
});

When('the user enters {string} as email', async function (email) {
  await page.type('input[type="email"]', email);
});

When('the user enters {string} as password and confirms it', async function (password) {
  const passwordFields = await page.$$('input[type="password"]');
  await passwordFields[0].type(password);
  await passwordFields[1].type(password);
});

When('the user clicks Create Account', async function () {
  await page.click('button[type="submit"]');
  await new Promise(resolve => setTimeout(resolve, 2000));
});

Then('an error message about Rutgers email should appear on signup', async function () {
  const errorText = await page.evaluate(() => {
    const el = document.querySelector('[class*="text-[#ff3b30]"]') ||
               document.querySelector('[class*="text-red"]');
    return el ? el.innerText : '';
  });
  assert.ok(
    errorText.toLowerCase().includes('rutgers') || errorText.toLowerCase().includes('scarletmail'),
    `Expected error about Rutgers email, got: "${errorText}"`
  );
});

When('the user enters {string} as login email', async function (email) {
  await page.type('input[type="email"]', email);
});

When('the user enters {string} as login password', async function (password) {
  await page.type('input[type="password"]', password);
});

When('the user clicks Log In', async function () {
  await page.click('button[type="submit"]');
  await new Promise(resolve => setTimeout(resolve, 2000));
});

Then('an error message about Rutgers email should appear on login', async function () {
  const errorText = await page.evaluate(() => {
    const el = document.querySelector('[class*="text-[#ff3b30]"]') ||
               document.querySelector('[class*="text-red"]');
    return el ? el.innerText : '';
  });
  assert.ok(
    errorText.toLowerCase().includes('rutgers') || errorText.toLowerCase().includes('scarletmail'),
    `Expected error about Rutgers email, got: "${errorText}"`
  );
});

When('the user clicks the Sign In link', async function () {
  await page.evaluate(() => {
    const links = document.querySelectorAll('a');
    const signIn = Array.from(links).find(a => a.innerText.trim() === 'Sign In');
    if (signIn) signIn.click();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
});

Then('the user should be on the login page', async function () {
  const url = page.url();
  assert.ok(url.includes('/login'), `Expected URL to contain /login, got: ${url}`);
});