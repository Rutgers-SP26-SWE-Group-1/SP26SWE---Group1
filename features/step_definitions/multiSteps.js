const { Given, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const assert = require('assert');
const { LOCAL_OLLAMA_MODELS } = require('../../src/lib/multi-llm/localModels');

// Multi-LLM scenarios talk to a real local Ollama daemon, which can be
// noticeably slower than the existing single-model tests. Bump the timeout
// per-step rather than globally so we don't disturb the team's other features.
setDefaultTimeout(120 * 1000);

const BASE_URL = process.env.PUPPETEER_BASE_URL || 'http://localhost:3000';
const MULTI_PAGE_URL = `${BASE_URL}/chat/multi`;

const SELECTORS = {
  toggle: '[data-testid="multi-model-dropdown-toggle"]',
  panel: '[data-testid="multi-model-dropdown-panel"]',
  counter: '[data-testid="multi-model-counter"]',
  promptInput: '[data-testid="multi-prompt-input"]',
  sendButton: '[data-testid="multi-send-button"]',
  grid: '[data-testid="multi-response-grid"]',
  errorBanner: '[data-testid="multi-error-banner"]',
};

const STORAGE_KEY = 'scarlet-ai-multi-llm-selection';
const VALID_IDS = LOCAL_OLLAMA_MODELS.map((m) => m.id);
const KNOWN_BAD_ID = 'cloud-only-model-fake';

async function seedSelection(page, ids) {
  await page.evaluateOnNewDocument(
    (key, value) => {
      window.localStorage.setItem(key, value);
    },
    STORAGE_KEY,
    JSON.stringify(ids),
  );
}

async function readCounterText(page) {
  await page.waitForSelector(SELECTORS.counter);
  return page.$eval(SELECTORS.counter, (el) => el.textContent.trim());
}

async function ensureDropdownOpen(page) {
  const isOpen = await page.$(SELECTORS.panel);
  if (!isOpen) {
    await page.click(SELECTORS.toggle);
    await page.waitForSelector(SELECTORS.panel, { timeout: 5000 });
  }
}

Given('the user is on the multi-LLM compare page', async function () {
  await this.page.goto(MULTI_PAGE_URL, { waitUntil: 'networkidle0' });
  await this.page.waitForSelector(SELECTORS.toggle, { timeout: 10000 });
});

Given('the local-models dropdown panel is open', async function () {
  await ensureDropdownOpen(this.page);
});

Given('the user has 2 local models selected', async function () {
  await seedSelection(this.page, [VALID_IDS[0], VALID_IDS[1]]);
  await this.page.goto(MULTI_PAGE_URL, { waitUntil: 'networkidle0' });
  const text = await readCounterText(this.page);
  assert.strictEqual(text, '2/4', `expected counter 2/4, got ${text}`);
});

Given('the user has 3 local models selected', async function () {
  await seedSelection(this.page, [VALID_IDS[0], VALID_IDS[1], VALID_IDS[3]]);
  await this.page.goto(MULTI_PAGE_URL, { waitUntil: 'networkidle0' });
  const text = await readCounterText(this.page);
  assert.strictEqual(text, '3/4', `expected counter 3/4, got ${text}`);
});

Given('the user has 4 local models selected', async function () {
  await seedSelection(this.page, [VALID_IDS[0], VALID_IDS[1], VALID_IDS[2], VALID_IDS[3]]);
  await this.page.goto(MULTI_PAGE_URL, { waitUntil: 'networkidle0' });
  const text = await readCounterText(this.page);
  assert.strictEqual(text, '4/4', `expected counter 4/4, got ${text}`);
});

Given('the user has selected {int} local models', async function (count) {
  const ids = VALID_IDS.slice(0, count);
  await seedSelection(this.page, ids);
  await this.page.goto(MULTI_PAGE_URL, { waitUntil: 'networkidle0' });
  const text = await readCounterText(this.page);
  assert.strictEqual(text, `${count}/4`, `expected counter ${count}/4, got ${text}`);
});

Given('the user has 3 local models selected including an invalid one', async function () {
  // Seed three real local models, then once the page loads intercept the
  // fan-out request and return a hand-crafted partial-failure response
  // where one of the three models is marked as rejected. This lets us
  // test the UI's partial-failure rendering without needing to actually
  // break one of the user's real local Ollama models.
  await seedSelection(this.page, [VALID_IDS[0], VALID_IDS[1], VALID_IDS[3]]);
  await this.page.goto(MULTI_PAGE_URL, { waitUntil: 'networkidle0' });

  await this.page.evaluate(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (url.endsWith('/api/chat/fanout') && init && typeof init.body === 'string') {
        let parsed = {};
        try { parsed = JSON.parse(init.body); } catch (_e) { parsed = {}; }
        const ids = Array.isArray(parsed.modelIds) ? parsed.modelIds : [];
        const payload = {
          conversationId: 'partial-failure-test',
          responses: ids.map((id, index) => {
            if (index === 0) {
              return {
                modelId: id,
                ollamaTag: `${id}:latest`,
                label: id,
                status: 'rejected',
                content: null,
                error: 'Simulated model failure for partial-failure acceptance test.',
                durationMs: 42,
              };
            }
            return {
              modelId: id,
              ollamaTag: `${id}:latest`,
              label: id,
              status: 'fulfilled',
              content: `OK (${id})`,
              error: null,
              durationMs: 128,
            };
          }),
          summary: {
            total: ids.length,
            succeeded: Math.max(ids.length - 1, 0),
            failed: 1,
            averageMs: 100,
          },
          totalDurationMs: 200,
          timestamp: new Date().toISOString(),
        };
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch(input, init);
    };
  });
});

When('the user clicks the local-models dropdown toggle', async function () {
  await this.page.click(SELECTORS.toggle);
  await this.page.waitForSelector(SELECTORS.panel, { timeout: 5000 });
});

When('the user toggles the {string} model', async function (modelId) {
  await ensureDropdownOpen(this.page);
  const optionSelector = `[data-testid="multi-model-option-${modelId}"]`;
  await this.page.waitForSelector(optionSelector, { timeout: 5000 });
  await this.page.click(optionSelector);
});

When('the user attempts to toggle a fifth local model', async function () {
  await ensureDropdownOpen(this.page);
  const target = VALID_IDS[4];
  const optionSelector = `[data-testid="multi-model-option-${target}"]`;
  await this.page.waitForSelector(optionSelector);
  await this.page.click(optionSelector).catch(() => {});
});

When('the user reduces the selection to a single local model', async function () {
  await ensureDropdownOpen(this.page);
  // Default selection is 3; deselect two.
  for (const id of [VALID_IDS[1], VALID_IDS[3]]) {
    const optionSelector = `[data-testid="multi-model-option-${id}"]`;
    if (await this.page.$(optionSelector)) {
      await this.page.click(optionSelector).catch(() => {});
    }
  }
});

When('the user submits the prompt {string}', async function (prompt) {
  await this.page.waitForSelector(SELECTORS.promptInput);
  await this.page.click(SELECTORS.promptInput);
  await this.page.type(SELECTORS.promptInput, prompt);
  await this.page.click(SELECTORS.sendButton);
  await this.page.waitForSelector(SELECTORS.grid, { timeout: 110000 });
});

When('the user clicks the clear-transcript button', async function () {
  await this.page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const target = buttons.find((b) => /clear transcript/i.test(b.textContent || ''));
    if (target) target.click();
  });
});

Then('the local-models dropdown panel should be visible', async function () {
  const visible = await this.page.$(SELECTORS.panel);
  assert.ok(visible, 'expected dropdown panel to be visible');
});

Then('the dropdown counter should show 3 of 4 selected by default', async function () {
  const text = await readCounterText(this.page);
  assert.strictEqual(text, '3/4', `expected 3/4 counter, got ${text}`);
});

Then('the dropdown counter should show 4 of 4 selected', async function () {
  const text = await readCounterText(this.page);
  assert.strictEqual(text, '4/4', `expected 4/4 counter, got ${text}`);
});

Then('the dropdown counter should still show 4 of 4 selected', async function () {
  const text = await readCounterText(this.page);
  assert.strictEqual(text, '4/4', `expected 4/4 counter, got ${text}`);
});

Then('the dropdown counter should show 1 of 4 selected', async function () {
  const text = await readCounterText(this.page);
  assert.strictEqual(text, '1/4', `expected 1/4 counter, got ${text}`);
});

Then('the only remaining local model should not be deselectable', async function () {
  await ensureDropdownOpen(this.page);
  const remaining = await this.page.$$eval(
    '[role="option"][aria-selected="true"]',
    (nodes) => nodes.map((n) => n.getAttribute('disabled') !== null),
  );
  assert.strictEqual(remaining.length, 1, 'expected exactly one selected option');
  assert.strictEqual(remaining[0], true, 'expected the lone selected option to be disabled');
});

Then('the response grid should contain {int} model cards', async function (count) {
  await this.page.waitForSelector(SELECTORS.grid, { timeout: 110000 });
  const cards = await this.page.$$('[data-testid^="model-response-card-"]');
  assert.strictEqual(cards.length, count, `expected ${count} cards, got ${cards.length}`);
});

Then('every visible model card should show a model label', async function () {
  const labels = await this.page.$$eval(
    '[data-testid^="model-response-label-"]',
    (nodes) => nodes.map((n) => (n.textContent || '').trim()),
  );
  assert.ok(labels.length > 0, 'expected at least one label');
  for (const label of labels) {
    assert.ok(label.length > 0, 'expected each label to be non-empty');
  }
});

Then('every model card should show a model label', async function () {
  const labels = await this.page.$$eval(
    '[data-testid^="model-response-label-"]',
    (nodes) => nodes.map((n) => (n.textContent || '').trim()),
  );
  assert.ok(labels.length > 0, 'expected labels');
  for (const label of labels) {
    assert.ok(label.length > 0, `expected non-empty label, got "${label}"`);
  }
});

Then('the response cards should be labelled with their respective local models', async function () {
  const labels = await this.page.$$eval(
    '[data-testid^="model-response-label-"]',
    (nodes) => nodes.map((n) => (n.textContent || '').trim()),
  );
  const known = new Set(LOCAL_OLLAMA_MODELS.map((m) => m.label));
  for (const label of labels) {
    assert.ok(known.has(label), `unexpected label "${label}" not in local registry`);
  }
});

Then('at least {int} model cards should display content', async function (min) {
  const filled = await this.page.$$eval(
    '[data-testid^="model-response-content-"]',
    (nodes) => nodes.filter((n) => (n.textContent || '').trim().length > 0).length,
  );
  assert.ok(filled >= min, `expected at least ${min} content cards, got ${filled}`);
});

Then('at least {int} model card should display an error', async function (min) {
  const errors = await this.page.$$('[data-testid^="model-response-error-"]');
  assert.ok(errors.length >= min, `expected at least ${min} error card(s), got ${errors.length}`);
});

Then('the response grid should remain visible after responses arrive', async function () {
  const grid = await this.page.$(SELECTORS.grid);
  assert.ok(grid, 'expected grid to remain in the DOM');
});

Then('the response grid should no longer be visible', async function () {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const grid = await this.page.$(SELECTORS.grid);
  assert.strictEqual(grid, null, 'expected grid to be removed after clearing');
});
