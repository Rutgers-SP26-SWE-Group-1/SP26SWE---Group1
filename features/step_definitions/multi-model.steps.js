const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

Given('I am on the chat page', async function () {
  await this.page.goto('http://localhost:3000/chat', { waitUntil: 'networkidle2' });
});

When('I enter {string} into the prompt field', async function (prompt) {
  const inputSelector = 'textarea, input';

  await this.page.waitForSelector(inputSelector);
  await this.page.click(inputSelector);

  await this.page.keyboard.down('Control');
  await this.page.keyboard.press('A');
  await this.page.keyboard.up('Control');
  await this.page.keyboard.press('Backspace');

  await this.page.type(inputSelector, prompt);
});

When('I click the submit button', async function () {
  await this.page.waitForSelector('button');
  await this.page.click('button');
});

Then('I should see a response from {string}', async function (modelName) {
  await new Promise(resolve => setTimeout(resolve, 5000));

  const text = await this.page.evaluate(() => document.body.innerText);

  assert.ok(text.length > 0);
  assert.ok(
    text.toLowerCase().includes(modelName.toLowerCase()),
    `Expected to find "${modelName}" in page text, but got:\n${text}`
  );
});