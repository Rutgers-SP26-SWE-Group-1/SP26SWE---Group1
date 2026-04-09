const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

Given('the website is running', async function () {
  // Website expected to be running at http://localhost:3000
});

When('the user visits the landing page', async function () {
  await this.page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
});

Then('the landing page should load', async function () {
  const url = this.page.url();
  assert.strictEqual(url, 'http://localhost:3000/');
});

When('the user visits the signup page', async function () {
  await this.page.goto('http://localhost:3000/signup', { waitUntil: 'networkidle0' });
});

Then('the signup page should load', async function () {
  const url = this.page.url();
  assert.strictEqual(url, 'http://localhost:3000/signup');
});