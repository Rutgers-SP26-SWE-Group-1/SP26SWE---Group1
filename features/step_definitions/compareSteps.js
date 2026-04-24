const { Given, Then } = require('@cucumber/cucumber');
const assert = require('assert');

const MODEL_IDS = {
  'Mistral': 'mistral',
  'Llama 3.2': 'llama3.2',
  'DeepSeek R1': 'deepseek',
  'Qwen Coder': 'qwen-coder',
  'Gemma 3': 'gemma',
  'Gemini 2.5 Flash': 'gemini-2.5-flash',
  'Llama 3.1': 'llama-3-groq',
};

const KNOWN_MODEL_LABELS = Object.keys(MODEL_IDS);

function buildMockCompareResponse(modelLabels, unavailableModelLabel = null) {
  const responses = modelLabels.map((label, index) => {
    const modelId = MODEL_IDS[label];

    if (label === unavailableModelLabel) {
      return {
        content: `${label} could not respond right now.\n\nThis model is unavailable right now.`,
        durationMs: 0,
        isError: true,
        modelDescription: `Mock failure response for ${label}`,
        modelId,
        modelLabel: label,
      };
    }

    return {
      content: `${label} answer ${index + 1}: ${label} explains the prompt in a distinct way for comparison testing.`,
      durationMs: 600 + index * 200,
      modelDescription: `Mock success response for ${label}`,
      modelId,
      modelLabel: label,
    };
  });

  const primaryResponse = responses.find((response) => !response.isError) || responses[0];

  return {
    conversationId: 'mock-compare-conversation',
    content: primaryResponse.content,
    durationMs: primaryResponse.durationMs,
    modelId: primaryResponse.modelId,
    modelLabel: primaryResponse.modelLabel,
    modelDescription: primaryResponse.modelDescription,
    responses,
    timestamp: new Date().toISOString(),
  };
}

async function clickButtonByText(page, buttonText) {
  await page.waitForFunction(
    (text) =>
      Array.from(document.querySelectorAll('button')).some(
        (button) => button.textContent && button.textContent.trim() === text
      ),
    { timeout: 10000 },
    buttonText
  );

  const clicked = await page.evaluate((text) => {
    const button = Array.from(document.querySelectorAll('button')).find(
      (candidate) => candidate.textContent && candidate.textContent.trim() === text
    );

    if (!button) {
      return false;
    }

    button.click();
    return true;
  }, buttonText);

  assert.ok(clicked, `Expected to click the "${buttonText}" button`);
}

async function selectCompareModel(page, slotIndex, modelLabel) {
  const modelId = MODEL_IDS[modelLabel];
  assert.ok(modelId, `No compare-model mapping exists for "${modelLabel}"`);

  await page.waitForFunction(
    (index) =>
      Array.from(document.querySelectorAll('label')).some((label) => {
        const text = label.textContent || '';
        return text.includes(`LLM ${index + 1}`) && Boolean(label.querySelector('select'));
      }),
    { timeout: 10000 },
    slotIndex
  );

  await page.evaluate((index, nextModelId) => {
    const label = Array.from(document.querySelectorAll('label')).find((candidate) => {
      const text = candidate.textContent || '';
      return text.includes(`LLM ${index + 1}`) && Boolean(candidate.querySelector('select'));
    });

    if (!label) {
      throw new Error(`Could not find selector for LLM ${index + 1}`);
    }

    const select = label.querySelector('select');
    if (!select) {
      throw new Error(`Missing select element for LLM ${index + 1}`);
    }

    select.value = nextModelId;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, slotIndex, modelId);
}

async function getVisibleModelLabels(page) {
  return page.evaluate((knownLabels) => {
    return Array.from(document.querySelectorAll('span'))
      .map((element) => (element.textContent || '').trim())
      .filter((text) => knownLabels.includes(text));
  }, KNOWN_MODEL_LABELS);
}

Given('the user switches to {string} mode', async function (mode) {
  await clickButtonByText(this.page, mode);

  if (mode === '3 LLMs') {
    await this.page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('label')).some((label) =>
          (label.textContent || '').includes('LLM 1')
        ),
      { timeout: 10000 }
    );
  }
});

Given('the user has selected {string}, {string}, and {string}', async function (first, second, third) {
  const modelLabels = [first, second, third];

  for (let index = 0; index < modelLabels.length; index += 1) {
    await selectCompareModel(this.page, index, modelLabels[index]);
  }

  this.compareModelLabels = modelLabels;
  this.mockChatApiResponse = buildMockCompareResponse(modelLabels);
});

Given('the user has selected 3 models', async function () {
  const defaultModels = ['Mistral', 'Llama 3.2', 'Gemma 3'];

  for (let index = 0; index < defaultModels.length; index += 1) {
    await selectCompareModel(this.page, index, defaultModels[index]);
  }

  this.compareModelLabels = defaultModels;
  this.mockChatApiResponse = buildMockCompareResponse(defaultModels);
});

Given('one selected model is unavailable', async function () {
  assert.ok(
    Array.isArray(this.compareModelLabels) && this.compareModelLabels.length === 3,
    'Expected three selected models before marking one unavailable'
  );

  const failedModelLabel = this.compareModelLabels[1];
  this.failedModelLabel = failedModelLabel;
  this.mockChatApiResponse = buildMockCompareResponse(this.compareModelLabels, failedModelLabel);
});

Then('the app should show {int} assistant responses', async function (expectedCount) {
  await this.page.waitForFunction(
    (knownLabels, count) => {
      const labels = Array.from(document.querySelectorAll('span'))
        .map((element) => (element.textContent || '').trim())
        .filter((text) => knownLabels.includes(text));
      return labels.length >= count;
    },
    { timeout: 10000 },
    KNOWN_MODEL_LABELS,
    expectedCount
  );

  const visibleLabels = await getVisibleModelLabels(this.page);
  assert.strictEqual(
    visibleLabels.length,
    expectedCount,
    `Expected ${expectedCount} assistant responses but saw ${visibleLabels.length}`
  );
});

Then('each response should display its model label', async function () {
  assert.ok(
    Array.isArray(this.compareModelLabels) && this.compareModelLabels.length > 0,
    'Expected stored compare-model labels for this scenario'
  );

  const visibleLabels = await getVisibleModelLabels(this.page);

  for (const label of this.compareModelLabels) {
    assert.ok(
      visibleLabels.includes(label),
      `Expected to see a visible response label for "${label}"`
    );
  }
});

Then('the app should show responses from {string}, {string}, and {string}', async function (first, second, third) {
  const expectedLabels = [first, second, third];

  await this.page.waitForFunction(
    (labels) => {
      const visibleLabels = Array.from(document.querySelectorAll('span'))
        .map((element) => (element.textContent || '').trim());
      return labels.every((label) => visibleLabels.includes(label));
    },
    { timeout: 10000 },
    expectedLabels
  );

  const visibleLabels = await getVisibleModelLabels(this.page);
  for (const label of expectedLabels) {
    assert.ok(visibleLabels.includes(label), `Expected to see response label "${label}"`);
  }
});

Then('the app should still show the available model responses', async function () {
  assert.ok(
    Array.isArray(this.compareModelLabels) && this.compareModelLabels.length === 3,
    'Expected stored compare-model labels for the failure scenario'
  );

  const availableLabels = this.compareModelLabels.filter((label) => label !== this.failedModelLabel);

  await this.page.waitForFunction(
    (labels) => {
      const visibleLabels = Array.from(document.querySelectorAll('span'))
        .map((element) => (element.textContent || '').trim());
      return labels.every((label) => visibleLabels.includes(label));
    },
    { timeout: 10000 },
    availableLabels
  );

  const visibleLabels = await getVisibleModelLabels(this.page);
  for (const label of availableLabels) {
    assert.ok(visibleLabels.includes(label), `Expected to still see response label "${label}"`);
  }
});

Then('the failed model should show an error message', async function () {
  assert.ok(this.failedModelLabel, 'Expected a failed model label to be set for this scenario');

  await this.page.waitForFunction(
    (failedLabel) => document.body.innerText.includes(`${failedLabel} could not respond right now.`),
    { timeout: 10000 },
    this.failedModelLabel
  );

  const pageText = await this.page.evaluate(() => document.body.innerText);
  assert.ok(
    pageText.includes(`${this.failedModelLabel} could not respond right now.`),
    `Expected to see an error message for ${this.failedModelLabel}`
  );
});

Then('the chat should remain usable', async function () {
  await this.page.waitForSelector('textarea', { timeout: 10000 });
  await this.page.type('textarea', 'Follow-up check');

  const sendButtonEnabled = await this.page.$eval(
    'button[type="submit"]',
    (button) => !button.disabled
  );

  assert.ok(sendButtonEnabled, 'Expected the chat composer to remain usable after a model failure');
});
