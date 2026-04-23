const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

Given('the user is on the chat page', async function () {
  await this.page.goto('http://localhost:3000/chat', { waitUntil: 'networkidle0' });
});

Given('the user navigates to the chat page directly', async function () {
  await this.page.goto('http://localhost:3000/chat', { waitUntil: 'networkidle0' });
});

When('the user types {string} and sends the message', async function (message) {
  // Note: Updated to match your page.tsx textarea logic
  await this.page.waitForSelector('textarea', { timeout: 10000 });
  await this.page.type('textarea', message);
  await this.page.click('button[type="submit"]');
});

Then('the user message should appear in the chat', async function () {
  await this.page.waitForFunction(
    () => document.querySelectorAll('[class*="bg-[#cc0033]"]').length > 0,
    { timeout: 5000 }
  );
  const userMessages = await this.page.$$('[class*="bg-[#cc0033]"]');
  assert.ok(userMessages.length > 0, 'Expected user message bubble to appear');
});

Then('the AI should display a response within 30 seconds', async function () {
  await this.page.waitForFunction(
    () => document.querySelectorAll('[class*="bg-white"]').length > 0,
    { timeout: 30000 }
  );
  const aiMessages = await this.page.$$('[class*="bg-white"]');
  assert.ok(aiMessages.length > 0, 'Expected AI response bubble to appear');
});

Then('the chat input field should be empty', async function () {
  await new Promise(resolve => setTimeout(resolve, 500));
  const value = await this.page.$eval('textarea', el => el.value);
  assert.strictEqual(value, '', 'Expected input field to be cleared after sending');
});

Then('the chat page should load successfully', async function () {
  const url = this.page.url();
  assert.ok(url.includes('/chat'), 'Expected URL to contain /chat');
});

Then('the chat input should be available', async function () {
  const input = await this.page.$('textarea');
  assert.ok(input !== null, 'Expected chat input field to exist');
});

// Mocking previous chats in local state for testing
Given('I have previous chats titled {string} and {string}', async function (title1, title2) {
  // FIX: Navigate to the site FIRST to establish the origin for localStorage access
  await this.page.goto('http://localhost:3000/chat', { waitUntil: 'networkidle0' });

  await this.page.evaluate((t1, t2) => {
    const mockChats = [
      { 
        id: '1', 
        title: t1, 
        updatedAt: new Date().toISOString(), 
        messages: [{ role: 'user', content: 'Calc help' }] 
      },
      { 
        id: '2', 
        title: t2, 
        updatedAt: new Date().toISOString(), 
        messages: [{ role: 'user', content: 'Physics help' }] 
      }
    ];
    // Now that we are on localhost:3000, we have permission to write to localStorage
    window.localStorage.setItem('scarlet-ai-conversations', JSON.stringify(mockChats));
  }, title1, title2);

  // Reload to ensure the React state picks up the new localStorage data
  await this.page.reload({ waitUntil: 'networkidle0' });
});

Given('I am on the Chat Hub page', async function () {
  await this.page.goto('http://localhost:3000/chat', { waitUntil: 'networkidle0' });
});

When('I click the magnifying glass icon', async function () {
  const searchBtn = await this.page.waitForSelector('button svg circle');
  await searchBtn.click();
});

When('I type {string} into the search bar', async function (query) {
  await this.page.type('input[placeholder="Search history..."]', query);
});

Then('I should see {string} in the history list', async function (expectedTitle) {
  await this.page.waitForFunction((text) => 
    document.querySelector('aside').innerText.includes(text), 
    {}, expectedTitle
  );
});

Then('I should not see {string}', async function (unexpectedTitle) {
  const content = await this.page.$eval('aside', el => el.innerText);
  if (content.includes(unexpectedTitle)) {
    throw new Error(`Expected not to see "${unexpectedTitle}" but it was found.`);
  }
});