/* eslint-disable @typescript-eslint/no-require-imports */
const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

function buildDebateThread(overrides = {}) {
  const baseMessages = [
    {
      id: 'msg-gemini-opening',
      model: 'Gemini 2.5 Flash (Cloud)',
      role: 'opening',
      content: 'Computer Science is usually stronger for software, AI, theory, and flexible tech career paths.',
      timestamp: new Date().toISOString(),
      round: 1,
    },
    {
      id: 'msg-llama-opening',
      model: 'Llama 3.1 (Cloud)',
      role: 'opening',
      content: 'Computer Engineering can be better for students who want hardware, embedded systems, and low-level computing.',
      timestamp: new Date().toISOString(),
      round: 1,
    },
  ];

  return {
    id: 'mock-debate-thread',
    originalQuestion: 'Which major is better, Computer Engineering or Computer Science?',
    selectedModels: ['gemini-2.5-flash', 'llama-3.1-8b-instant'],
    contextUsed: 'local data',
    depth: 'standard',
    maxRounds: 5,
    completedRounds: 1,
    messages: baseMessages,
    verdict: {
      status: 'consensus',
      summary: 'Consensus reached in Round 1. The models agree on the main recommendation.',
      reachedRound: 1,
      modelPositions: {
        'Gemini 2.5 Flash (Cloud)': 'Computer Science is stronger for software and AI.',
        'Llama 3.1 (Cloud)': 'Computer Engineering is stronger for hardware-oriented computing.',
      },
    },
    ...overrides,
  };
}

function buildFollowUpThread() {
  const thread = buildDebateThread();

  return {
    ...thread,
    completedRounds: 2,
    messages: [
      ...thread.messages,
      {
        id: 'msg-gemini-followup',
        model: 'Gemini 2.5 Flash (Cloud)',
        role: 'followup',
        content: 'If you want to work in AI, Computer Science is usually the better fit because it emphasizes algorithms, data, and machine learning foundations.',
        timestamp: new Date().toISOString(),
        round: 2,
      },
      {
        id: 'msg-llama-followup',
        model: 'Llama 3.1 (Cloud)',
        role: 'followup',
        content: 'Computer Engineering can still lead to AI work, especially robotics or edge devices, but Computer Science is the more direct path.',
        timestamp: new Date().toISOString(),
        round: 2,
      },
    ],
  };
}

function attachDebateMock(page, world) {
  page.on('request', async (request) => {
    if (!request.url().includes('/api/chat') || request.method() !== 'POST') {
      await request.continue();
      return;
    }

    const body = JSON.parse(request.postData() || '{}');

    if (body.debateFollowUp) {
      world.lastDebateFollowUpRequest = body;

      await request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          conversationId: 'mock-conversation-id',
          responses: [
            {
              modelId: 'debate',
              modelLabel: 'Debate Mode',
              content: 'Debate follow-up answered.',
              durationMs: 25,
              status: 'success',
            },
          ],
          debateThread: buildFollowUpThread(),
          timestamp: new Date().toISOString(),
        }),
      });
      return;
    }

    if (body.debateMode) {
      world.lastDebateRequest = body;

      await request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          conversationId: body.conversationId || 'mock-conversation-id',
          responses: [
            {
              modelId: 'debate',
              modelLabel: 'Debate Mode',
              content: 'Debate started: Which major is better, Computer Engineering or Computer Science?',
              durationMs: 25,
              status: 'success',
            },
          ],
          debateThread: buildDebateThread({ originalQuestion: body.message }),
          timestamp: new Date().toISOString(),
        }),
      });
      return;
    }

    await request.continue();
  });
}

Given('the debate API responses are mocked', async function () {
  await this.page.setRequestInterception(true);
  attachDebateMock(this.page, this);
});

When('the user enables Debate Mode', async function () {
  await this.page.waitForSelector('[data-testid="debate-mode-toggle"]', { timeout: 10000 });
  await this.page.click('[data-testid="debate-mode-toggle"]');
});

When('the user selects debate models {string} and {string}', async function (firstModel, secondModel) {
  await this.page.waitForSelector('[data-testid="debate-model-panel"]', { timeout: 10000 });

  for (const modelLabel of [firstModel, secondModel]) {
    await this.page.evaluate((labelText) => {
      const labels = Array.from(document.querySelectorAll('[data-testid="debate-model-panel"] label'));
      const label = labels.find((item) => item.textContent?.includes(labelText));
      if (!label) throw new Error(`Could not find debate model label: ${labelText}`);
      label.click();
    }, modelLabel);
  }
});

When('the user submits the debate question {string}', async function (message) {
  await this.page.waitForSelector('textarea', { timeout: 10000 });
  await this.page.type('textarea', message);
  await this.page.click('button[type="submit"]');
});

When('the user opens the debate thread', async function () {
  await this.page.waitForSelector('[data-testid="debate-started-card"]', { timeout: 10000 });
  await this.page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const openButton = buttons.find((button) => button.textContent?.includes('Open Debate'));
    if (!openButton) throw new Error('Open Debate button was not found.');
    openButton.click();
  });
  await this.page.waitForSelector('[data-testid="debate-thread-panel"]', { timeout: 10000 });
});

When('the user asks the debate follow-up {string}', async function (message) {
  await this.page.waitForSelector('[data-testid="debate-thread-panel"] input[placeholder="Ask both models a follow-up..."]', {
    timeout: 10000,
  });
  await this.page.type('[data-testid="debate-thread-panel"] input[placeholder="Ask both models a follow-up..."]', message);
  await this.page.evaluate(() => {
    const panel = document.querySelector('[data-testid="debate-thread-panel"]');
    const buttons = Array.from(panel?.querySelectorAll('button') || []);
    const askButton = buttons.find((button) => button.textContent?.includes('Ask'));
    if (!askButton) throw new Error('Debate follow-up Ask button was not found.');
    askButton.click();
  });
});

Then('the debate model panel should be visible', async function () {
  const panel = await this.page.$('[data-testid="debate-model-panel"]');
  assert.ok(panel, 'Expected Debate Mode to reveal the debate model panel.');
});

Then('the chat request should be sent in Debate Mode', async function () {
  assert.ok(this.lastDebateRequest, 'Expected a mocked /api/chat debate request.');
  assert.strictEqual(this.lastDebateRequest.debateMode, true);
  assert.ok(Array.isArray(this.lastDebateRequest.debateModelIds), 'Expected debateModelIds to be sent.');
  assert.ok(this.lastDebateRequest.debateModelIds.length >= 2, 'Expected at least two selected debate models.');
});

Then('the debate started card should appear', async function () {
  await this.page.waitForSelector('[data-testid="debate-started-card"]', { timeout: 10000 });
});

Then('the Open Debate button should be visible', async function () {
  const visible = await this.page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).some((button) => button.textContent?.includes('Open Debate'));
  });
  assert.ok(visible, 'Expected an Open Debate button on the debate started card.');
});

Then('the debate follow-up request should be sent', async function () {
  await this.page.waitForFunction(
    () => document.body.innerText.includes('If you want to work in AI'),
    { timeout: 10000 }
  );
  assert.ok(this.lastDebateFollowUpRequest, 'Expected a mocked debate follow-up request.');
  assert.strictEqual(this.lastDebateFollowUpRequest.debateFollowUp, true);
});

Then('the debate thread should show the follow-up answer', async function () {
  const text = await this.page.$eval('[data-testid="debate-thread-panel"]', (panel) => panel.textContent || '');
  assert.ok(text.includes('If you want to work in AI'), 'Expected the follow-up answer inside the debate thread.');
});
