# Advanced Math Reasoning Cucumber Tests

This file collects the full Cucumber acceptance test content for the `Advanced Math Reasoning` feature in one place for reporting purposes.

## Feature File

```gherkin
Feature: Advanced Math Reasoning

  Scenario: User can enable and disable Advanced Math Reasoning
    Given the user is on the chat page
    When the user enables Step-by-Step Mode
    Then the Step-by-Step button should be highlighted red
    When the user disables Step-by-Step Mode
    Then the Step-by-Step button should be greyed out
    And Advanced Math Reasoning should not be in use

  Scenario: Step-by-Step Mode gives a structured DeepSeek math explanation
    Given the step-by-step math response is mocked
    And the user is on the chat page
    When the user enables Step-by-Step Mode
    And the user submits the math question "Solve 2x + 4 = 10"
    Then the Step-by-Step thinking state should appear
    And the structured math steps should appear
    And the final answer should be displayed
    And the Advanced Math Reasoning response should use DeepSeek R1

  Scenario: Standard chat behavior remains available when Advanced Math Reasoning is off
    Given the standard chat response is mocked
    And the user is on the chat page
    When the user selects the model "Qwen Coder"
    And the user submits the normal question "What clubs should I join at Rutgers?"
    Then the standard chat response should appear
    And the response should not use the step-by-step math format
    And the selected model should remain "Qwen Coder"
```

## Step Definitions

```javascript
/* eslint-disable @typescript-eslint/no-require-imports */
const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

const STEP_BY_STEP_RESPONSE = [
  'Understanding:',
  'We need to solve a simple linear equation for x.',
  '',
  'Step 1:',
  'Start with 2x + 4 = 10 and isolate the variable term by subtracting 4 from both sides.',
  '',
  'Step 2:',
  'This gives 2x = 6.',
  '',
  'Step 3:',
  'Divide both sides by 2 to get x = 3.',
  '',
  'Final Answer:',
  'x = 3',
].join('\\n');

const STANDARD_CHAT_RESPONSE = 'Rutgers has academic, cultural, service, and hobby clubs. Start with the Involvement Fair and get involved site to find a few that match your interests.';

function attachChatMock(page, handler) {
  let requestInterceptionEnabled = false;

  page.on('request', async (request) => {
    if (request.url().includes('/api/chat') && request.method() === 'POST') {
      await handler(request);
      return;
    }

    await request.continue();
  });

  return async () => {
    if (!requestInterceptionEnabled) {
      await page.setRequestInterception(true);
      requestInterceptionEnabled = true;
    }
  };
}

Given('the user is on the chat page', async function () {
  await this.page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle0' });
});

Given('the step-by-step math response is mocked', async function () {
  const enableInterception = attachChatMock(this.page, async (request) => {
    const body = JSON.parse(request.postData() || '{}');
    this.lastChatRequest = body;
    this.lastChatResponse = {
      modelId: 'deepseek',
      modelLabel: 'DeepSeek R1',
      stepByStepMode: true,
    };

    await new Promise((resolve) => setTimeout(resolve, 1800));

    await request.respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        conversationId: body.conversationId || 'mock-conversation-id',
        content: STEP_BY_STEP_RESPONSE,
        durationMs: 1800,
        modelId: 'deepseek',
        modelLabel: 'DeepSeek R1',
        modelDescription: 'Best for complex logic. Requires local install.',
        stepByStepMode: true,
        timestamp: new Date().toISOString(),
      }),
    });
  });

  await enableInterception();
});

Given('the standard chat response is mocked', async function () {
  const enableInterception = attachChatMock(this.page, async (request) => {
    const body = JSON.parse(request.postData() || '{}');
    this.lastChatRequest = body;
    this.lastChatResponse = {
      modelId: body.modelId,
      modelLabel: body.modelId,
      stepByStepMode: false,
    };

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await request.respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        conversationId: body.conversationId || 'mock-conversation-id',
        content: STANDARD_CHAT_RESPONSE,
        durationMs: 1000,
        modelId: body.modelId || 'mistral',
        modelLabel: body.modelId === 'qwen-coder' ? 'Qwen Coder' : 'Mistral',
        modelDescription: 'Programming assistant. Requires local install.',
        stepByStepMode: false,
        timestamp: new Date().toISOString(),
      }),
    });
  });

  await enableInterception();
});

When('the user enables Step-by-Step Mode', async function () {
  await this.page.waitForSelector('[data-testid="step-by-step-toggle"]', { timeout: 10000 });
  await this.page.click('[data-testid="step-by-step-toggle"]');
});

When('the user disables Step-by-Step Mode', async function () {
  await this.page.waitForSelector('[data-testid="step-by-step-toggle"]', { timeout: 10000 });
  await this.page.click('[data-testid="step-by-step-toggle"]');
});

When('the user selects the model {string}', async function (modelLabel) {
  await this.page.waitForSelector('select', { timeout: 10000 });
  await this.page.select('select', await this.page.$eval(
    'select',
    (select, expectedLabel) => {
      const option = Array.from(select.options).find((item) => item.textContent?.includes(expectedLabel));
      return option ? option.value : '';
    },
    modelLabel
  ));
});

When('the user submits the math question {string}', async function (message) {
  await this.page.waitForSelector('textarea', { timeout: 10000 });
  await this.page.type('textarea', message);
  await this.page.click('button[type="submit"]');
});

When('the user submits the normal question {string}', async function (message) {
  await this.page.waitForSelector('textarea', { timeout: 10000 });
  await this.page.type('textarea', message);
  await this.page.click('button[type="submit"]');
});

Then('the Step-by-Step button should be highlighted red', async function () {
  const isPressed = await this.page.$eval(
    '[data-testid="step-by-step-toggle"]',
    (el) => el.getAttribute('aria-pressed') === 'true'
  );
  const className = await this.page.$eval('[data-testid="step-by-step-toggle"]', (el) => el.className);
  assert.ok(isPressed, 'Expected Step-by-Step button to be pressed');
  assert.ok(String(className).includes('text-scarlet'), 'Expected Step-by-Step button to use the red active style');
});

Then('the Step-by-Step button should be greyed out', async function () {
  const isPressed = await this.page.$eval(
    '[data-testid="step-by-step-toggle"]',
    (el) => el.getAttribute('aria-pressed') === 'true'
  );
  const className = await this.page.$eval('[data-testid="step-by-step-toggle"]', (el) => el.className);
  assert.ok(!isPressed, 'Expected Step-by-Step button to be unpressed');
  assert.ok(String(className).includes('text-[var(--text-secondary)]'), 'Expected Step-by-Step button to use the grey inactive style');
});

Then('Advanced Math Reasoning should not be in use', async function () {
  const helperText = await this.page.$eval('[data-testid="step-by-step-toggle"]', (el) => el.textContent || '');
  assert.ok(helperText.includes('Click to use for math reasoning'), 'Expected inactive helper copy to be visible');
});

Then('the Step-by-Step thinking state should appear', async function () {
  await this.page.waitForSelector('[data-testid="thinking-state"]', { timeout: 5000 });
  const thinkingCopy = await this.page.$eval('[data-testid="thinking-state"]', (el) => el.textContent || '');
  assert.ok(
    thinkingCopy.includes('Understanding problem...') ||
      thinkingCopy.includes('Planning solution...') ||
      thinkingCopy.includes('Generating explanation...'),
    'Expected a rotating Step-by-Step thinking message to appear'
  );
});

Then('the structured math steps should appear', async function () {
  await this.page.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });
  const assistantCopy = await this.page.$eval('[data-testid="assistant-message"]', (el) => el.textContent || '');
  assert.ok(assistantCopy.includes('Understanding:'), 'Expected Understanding section');
  assert.ok(assistantCopy.includes('Step 1:'), 'Expected Step 1 section');
  assert.ok(assistantCopy.includes('Step 2:'), 'Expected Step 2 section');
  assert.ok(assistantCopy.includes('Step 3:'), 'Expected Step 3 section');
});

Then('the final answer should be displayed', async function () {
  const assistantCopy = await this.page.$eval('[data-testid="assistant-message"]', (el) => el.textContent || '');
  assert.ok(assistantCopy.includes('Final Answer:'), 'Expected Final Answer section');
  assert.ok(assistantCopy.includes('x = 3'), 'Expected the final solved value to be displayed');
});

Then('the Advanced Math Reasoning response should use DeepSeek R1', async function () {
  assert.strictEqual(this.lastChatRequest.stepByStepMode, true, 'Expected Step-by-Step Mode request flag to be enabled');
  assert.strictEqual(this.lastChatResponse.modelId, 'deepseek', 'Expected the mocked response to use DeepSeek R1');
});

Then('the standard chat response should appear', async function () {
  await this.page.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });
  const assistantCopy = await this.page.$eval('[data-testid="assistant-message"]', (el) => el.textContent || '');
  assert.ok(assistantCopy.includes('Rutgers has academic, cultural, service, and hobby clubs.'), 'Expected the standard chat response to appear');
});

Then('the response should not use the step-by-step math format', async function () {
  const assistantCopy = await this.page.$eval('[data-testid="assistant-message"]', (el) => el.textContent || '');
  assert.ok(!assistantCopy.includes('Understanding:'), 'Did not expect step-by-step formatting in a standard chat response');
  assert.ok(!assistantCopy.includes('Final Answer:'), 'Did not expect final-answer formatting in a standard chat response');
});

Then('the selected model should remain {string}', async function (modelLabel) {
  assert.strictEqual(this.lastChatRequest.stepByStepMode, false, 'Expected Step-by-Step Mode to remain disabled');
  assert.strictEqual(this.lastChatRequest.modelId, 'qwen-coder', 'Expected the selected model id to stay on the requested model');

  const selectedOptionLabel = await this.page.$eval('select', (select) => select.selectedOptions[0]?.textContent || '');
  assert.ok(selectedOptionLabel.includes(modelLabel), `Expected selected dropdown option to remain "${modelLabel}"`);
});
```
