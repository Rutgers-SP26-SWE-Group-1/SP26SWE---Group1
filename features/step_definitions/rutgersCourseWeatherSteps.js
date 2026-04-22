/* eslint-disable @typescript-eslint/no-require-imports */
const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

const COURSE_RESPONSE = [
  'Rutgers Course Results:',
  '- Course: 01:198:440 INTRO TO ARTIFICIAL INTELLIGENCE',
  '- Section: 01 (Index 12345)',
  '- Time: M 9:00 AM - 10:20 AM @ COLLEGE AVENUE',
  '- Instructor: DOE, JANE',
  '- Status: OPEN',
].join('\n');

const WEATHER_RESPONSE = [
  'Rutgers Weather:',
  '- Location: New Brunswick, NJ',
  '- Temperature: 52°F',
  '- Conditions: Partly cloudy',
  '- Suggested clothing: bring a jacket; dress in light layers',
].join('\n');

const COMBINED_RESPONSE = [
  'Rutgers Course Results:',
  '- Course: 01:640:251 MULTIVARIABLE CALCULUS',
  '- Section: 03 (Index 24680)',
  '- Time: T 1:10 PM - 2:30 PM @ BUSCH',
  '- Instructor: PATEL, RAVI',
  '- Status: OPEN',
  '',
  'Rutgers Weather:',
  '- Location: New Brunswick, NJ',
  '- Temperature: High 61°F / Low 45°F',
  '- Conditions: Light rain',
  '- Suggested clothing: bring a jacket; pack an umbrella or rain jacket',
  '',
  'Recommendation:',
  'Check the open section details and bring a jacket plus an umbrella tomorrow.',
].join('\n');

async function getAssistantText(page) {
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });
  return page.$eval('[data-testid="assistant-message"]', (el) => el.textContent || '');
}

function attachChatMock(page, responseFactory) {
  let requestInterceptionEnabled = false;

  page.on('request', async (request) => {
    if (request.url().includes('/api/chat') && request.method() === 'POST') {
      const body = JSON.parse(request.postData() || '{}');
      const payload = await responseFactory(body);
      await request.respond({
        status: payload.status || 200,
        contentType: 'application/json',
        body: JSON.stringify(payload.body),
      });
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

Given('the Rutgers course search response is mocked', async function () {
  const enableInterception = attachChatMock(this.page, async (body) => {
    await new Promise((resolve) => setTimeout(resolve, 1400));
    return {
      body: {
        conversationId: body.conversationId || 'mock-course-conversation',
        content: COURSE_RESPONSE,
        durationMs: 1400,
        modelId: body.modelId || 'mistral',
        modelLabel: 'Mistral',
        modelDescription: 'Local (Ollama)',
        timestamp: new Date().toISOString(),
      },
    };
  });

  await enableInterception();
});

Given('the Rutgers weather response is mocked', async function () {
  const enableInterception = attachChatMock(this.page, async (body) => {
    await new Promise((resolve) => setTimeout(resolve, 1400));
    return {
      body: {
        conversationId: body.conversationId || 'mock-weather-conversation',
        content: WEATHER_RESPONSE,
        durationMs: 1400,
        modelId: body.modelId || 'mistral',
        modelLabel: 'Mistral',
        modelDescription: 'Local (Ollama)',
        timestamp: new Date().toISOString(),
      },
    };
  });

  await enableInterception();
});

Given('the Rutgers course and weather responses are mocked', async function () {
  const enableInterception = attachChatMock(this.page, async (body) => {
    await new Promise((resolve) => setTimeout(resolve, 1600));
    return {
      body: {
        conversationId: body.conversationId || 'mock-combined-conversation',
        content: COMBINED_RESPONSE,
        durationMs: 1600,
        modelId: body.modelId || 'mistral',
        modelLabel: 'Mistral',
        modelDescription: 'Local (Ollama)',
        timestamp: new Date().toISOString(),
      },
    };
  });

  await enableInterception();
});

When('the user submits a Rutgers course query', async function () {
  await this.page.waitForSelector('textarea', { timeout: 10000 });
  await this.page.type('textarea', 'Find open Rutgers CS classes on Monday');
  await this.page.click('button[type="submit"]');
});

When('the user submits a Rutgers weather query', async function () {
  await this.page.waitForSelector('textarea', { timeout: 10000 });
  await this.page.type('textarea', 'What is the weather in New Brunswick today?');
  await this.page.click('button[type="submit"]');
});

When('the user submits a combined Rutgers course and weather query', async function () {
  await this.page.waitForSelector('textarea', { timeout: 10000 });
  await this.page.type('textarea', 'Find available Rutgers math courses and tell me the weather for tomorrow');
  await this.page.click('button[type="submit"]');
});

Then('the loading state should appear', async function () {
  await this.page.waitForSelector('[data-testid="thinking-state"]', { timeout: 5000 });
  const text = await this.page.$eval('[data-testid="thinking-state"]', (el) => el.textContent || '');
  assert.ok(text.length > 0, 'Expected the loading state to render text');
});

Then('the response should show Rutgers Course Results:', async function () {
  const text = await getAssistantText(this.page);
  assert.ok(text.includes('Rutgers Course Results:'), 'Expected Rutgers Course Results section');
});

Then('the response should show Course:', async function () {
  const text = await getAssistantText(this.page);
  assert.ok(text.includes('- Course:'), 'Expected Course field');
});

Then('the response should show Section:', async function () {
  const text = await getAssistantText(this.page);
  assert.ok(text.includes('- Section:'), 'Expected Section field');
});

Then('the response should show Time:', async function () {
  const text = await getAssistantText(this.page);
  assert.ok(text.includes('- Time:'), 'Expected Time field');
});

Then('the response should show Instructor:', async function () {
  const text = await getAssistantText(this.page);
  assert.ok(text.includes('- Instructor:'), 'Expected Instructor field');
});

Then('the response should show Status:', async function () {
  const text = await getAssistantText(this.page);
  assert.ok(text.includes('- Status:'), 'Expected Status field');
});

Then('the response should show Rutgers Weather:', async function () {
  const text = await getAssistantText(this.page);
  assert.ok(text.includes('Rutgers Weather:'), 'Expected Rutgers Weather section');
});

Then('the response should show Location:', async function () {
  const text = await getAssistantText(this.page);
  assert.ok(text.includes('- Location:'), 'Expected Location field');
});

Then('the response should show Temperature:', async function () {
  const text = await getAssistantText(this.page);
  assert.ok(text.includes('- Temperature:'), 'Expected Temperature field');
});

Then('the response should show Conditions:', async function () {
  const text = await getAssistantText(this.page);
  assert.ok(text.includes('- Conditions:'), 'Expected Conditions field');
});

Then('the response should show Suggested clothing:', async function () {
  const text = await getAssistantText(this.page);
  assert.ok(text.includes('- Suggested clothing:'), 'Expected Suggested clothing field');
});

Then('the response should show Recommendation:', async function () {
  const text = await getAssistantText(this.page);
  assert.ok(text.includes('Recommendation:'), 'Expected Recommendation section');
});

Then('both tool results should be rendered in the same response', async function () {
  const text = await getAssistantText(this.page);
  assert.ok(text.includes('Rutgers Course Results:'), 'Expected course results in the combined response');
  assert.ok(text.includes('Rutgers Weather:'), 'Expected weather results in the combined response');
});
