const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

// ── Shared helper ─────────────────────────────────────────────────────────────

async function clickCompareToggle(page) {
  const btn = await page.evaluateHandle(() =>
    [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Compare') || b.textContent.includes('⊞'))
  );
  assert.ok(btn, 'Compare toggle button not found');
  await btn.click();
  await new Promise((resolve) => setTimeout(resolve, 400));
}

// ── Model selection ───────────────────────────────────────────────────────────

When('the user selects {string} from the model dropdown', async function(modelLabel) {
  await this.page.waitForSelector('select', { timeout: 5000 });
  const selected = await this.page.evaluate((label) => {
    const selects = document.querySelectorAll('select');
    for (const sel of selects) {
      for (const opt of sel.options) {
        if (opt.text.includes(label)) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
    }
    return false;
  }, modelLabel);
  assert.ok(selected, `Model option "${modelLabel}" not found in any dropdown`);
});

// ── Compare toggle ────────────────────────────────────────────────────────────

When('the user clicks the compare toggle button', async function() {
  await clickCompareToggle(this.page);
});

Given('compare mode is enabled', async function() {
  await this.page.goto('http://localhost:3000/chat', { waitUntil: 'networkidle0' });
  await clickCompareToggle(this.page);
});

// ── Assertions ────────────────────────────────────────────────────────────────

Then('two model selector dropdowns should be visible', async function() {
  await this.page.waitForFunction(
    () => document.querySelectorAll('select').length >= 2,
    { timeout: 5000 }
  );
  const count = await this.page.$$eval('select', (els) => els.length);
  assert.ok(count >= 2, `Expected at least 2 model selectors, found ${count}`);
});

Then('only one model selector dropdown should be visible', async function() {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const count = await this.page.$$eval('select', (els) => els.length);
  assert.strictEqual(count, 1, `Expected 1 model selector, found ${count}`);
});

Then('the compare button should show active state', async function() {
  const isActive = await this.page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (b) => b.textContent.includes('⊞')
    );
    return btn ? btn.textContent.includes('On') : false;
  });
  assert.ok(isActive, 'Expected compare button to show active state (⊞ On)');
});

Then('two response columns should appear', async function() {
  await this.page.waitForFunction(
    () => document.querySelector('.grid-cols-2') !== null,
    { timeout: 60000 }
  );
  const grid = await this.page.$('.grid-cols-2');
  assert.ok(grid !== null, 'Expected a two-column response grid to appear');
});

Then('each column should have a model label header', async function() {
  const labelCount = await this.page.evaluate(() => {
    const grid = document.querySelector('.grid-cols-2');
    if (!grid) return 0;
    return grid.querySelectorAll('span.text-scarlet').length;
  });
  assert.ok(labelCount >= 2, `Expected at least 2 model label headers, found ${labelCount}`);
});
