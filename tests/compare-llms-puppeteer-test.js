/* eslint-disable @typescript-eslint/no-require-imports */
const { launch, BASE_URL, shot, settled } = require('./puppeteer-config');

async function clickButtonByText(page, buttonText) {
  await page.waitForFunction(
    (text) =>
      Array.from(document.querySelectorAll('button')).some(
        (button) => (button.textContent || '').trim() === text
      ),
    { timeout: 15000 },
    buttonText
  );

  const clicked = await page.evaluate((text) => {
    const button = Array.from(document.querySelectorAll('button')).find(
      (candidate) => (candidate.textContent || '').trim() === text
    );
    if (!button) return false;
    button.click();
    return true;
  }, buttonText);

  if (!clicked) {
    throw new Error(`Unable to click button "${buttonText}"`);
  }
}

async function selectModelInSlot(page, slotNumber, modelId) {
  await page.waitForFunction(
    (slot) =>
      Array.from(document.querySelectorAll('label')).some((label) => {
        const text = label.textContent || '';
        return text.includes(`LLM ${slot}`) && Boolean(label.querySelector('select'));
      }),
    { timeout: 15000 },
    slotNumber
  );

  await page.evaluate((slot, nextModelId) => {
    const label = Array.from(document.querySelectorAll('label')).find((candidate) => {
      const text = candidate.textContent || '';
      return text.includes(`LLM ${slot}`) && Boolean(candidate.querySelector('select'));
    });

    if (!label) {
      throw new Error(`Unable to find selector for LLM ${slot}`);
    }

    const select = label.querySelector('select');
    if (!select) {
      throw new Error(`Missing select for LLM ${slot}`);
    }

    select.value = nextModelId;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, slotNumber, modelId);
}

async function typePromptAndSend(page, prompt) {
  await page.waitForSelector('main textarea', { timeout: 15000 });
  await page.focus('main textarea');
  await page.evaluate(() => {
    const textarea = document.querySelector('main textarea');
    if (textarea) textarea.value = '';
  });
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.type('main textarea', prompt);
  await page.click('button[type="submit"]');
}

async function attachChatApiMock(page, queue) {
  await page.setRequestInterception(true);

  page.on('request', async (request) => {
    if (request.url().endsWith('/api/chat') && request.method() === 'POST') {
      const next = queue.shift();

      if (!next) {
        await request.respond({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'No mock response queued for /api/chat' }),
        });
        return;
      }

      await request.respond({
        status: next.status || 200,
        contentType: 'application/json',
        body: JSON.stringify(next.body),
      });
      return;
    }

    await request.continue();
  });
}

function buildCompareResponse(responses) {
  const primary = responses.find((response) => !response.isError) || responses[0];

  return {
    conversationId: `compare-${Date.now()}`,
    content: primary.content,
    durationMs: primary.durationMs,
    modelId: primary.modelId,
    modelLabel: primary.modelLabel,
    modelDescription: primary.modelDescription,
    responses,
    timestamp: new Date().toISOString(),
  };
}

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  const mockQueue = [];
  let passed = 0;
  let failed = 0;

  function pass(name) {
    console.log(`[PASS] ${name}`);
    passed += 1;
  }

  function fail(name, detail) {
    console.log(`[FAIL] ${name}${detail ? ` - ${detail}` : ''}`);
    failed += 1;
  }

  try {
    await attachChatApiMock(page, mockQueue);
    await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('main textarea', { timeout: 20000 });
    pass('Chat page loads for compare-mode browser test');

    await clickButtonByText(page, '3 LLMs');
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('label')).filter((label) =>
          (label.textContent || '').includes('LLM ')
        ).length >= 3,
      { timeout: 10000 }
    );
    pass('Compare mode reveals three model selectors');

    await selectModelInSlot(page, 1, 'mistral');
    await selectModelInSlot(page, 2, 'llama3.2');
    await selectModelInSlot(page, 3, 'gemma');
    pass('User can choose three compare models');

    mockQueue.push({
      body: buildCompareResponse([
        {
          content: 'Mistral answer: recursion solves a problem by calling the same idea on a smaller input.',
          durationMs: 1200,
          modelDescription: 'Mock compare response',
          modelId: 'mistral',
          modelLabel: 'Mistral',
        },
        {
          content: 'Llama 3.2 answer: recursion keeps reducing the problem until it reaches a base case.',
          durationMs: 1400,
          modelDescription: 'Mock compare response',
          modelId: 'llama3.2',
          modelLabel: 'Llama 3.2',
        },
        {
          content: 'Gemma 3 answer: recursion is like repeating the same rule on smaller and smaller versions.',
          durationMs: 1600,
          modelDescription: 'Mock compare response',
          modelId: 'gemma',
          modelLabel: 'Gemma 3',
        },
      ]),
    });

    await typePromptAndSend(page, 'Explain recursion simply');

    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return (
          text.includes('Mistral answer:') &&
          text.includes('Llama 3.2 answer:') &&
          text.includes('Gemma 3 answer:')
        );
      },
      { timeout: 15000 }
    );
    pass('One prompt returns three mocked assistant responses');

    const labelsVisible = await page.evaluate(() => {
      const text = document.body.innerText;
      return ['Mistral', 'Llama 3.2', 'Gemma 3'].every((label) => text.includes(label));
    });
    if (labelsVisible) pass('Each compare response displays a model label');
    else fail('Each compare response displays a model label');

    await shot(page, 'compare-llms-success.png');

    await clickButtonByText(page, 'New Chat');
    await settled(page);

    mockQueue.push({
      body: buildCompareResponse([
        {
          content: 'Mistral answer: dynamic programming stores smaller results to avoid repeated work.',
          durationMs: 1100,
          modelDescription: 'Mock compare response',
          modelId: 'mistral',
          modelLabel: 'Mistral',
        },
        {
          content: 'Llama 3.2 could not respond right now.\n\nThis model is unavailable right now.',
          durationMs: 0,
          isError: true,
          modelDescription: 'Mock compare failure',
          modelId: 'llama3.2',
          modelLabel: 'Llama 3.2',
        },
        {
          content: 'Gemma 3 answer: dynamic programming works by solving overlapping subproblems once.',
          durationMs: 1300,
          modelDescription: 'Mock compare response',
          modelId: 'gemma',
          modelLabel: 'Gemma 3',
        },
      ]),
    });

    await typePromptAndSend(page, 'Summarize dynamic programming');

    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return (
          text.includes('Mistral answer: dynamic programming') &&
          text.includes('Gemma 3 answer: dynamic programming') &&
          text.includes('Llama 3.2 could not respond right now.')
        );
      },
      { timeout: 15000 }
    );
    pass('Available model responses still appear when one compare model fails');

    const composerWorks = await page.evaluate(() => {
      const textarea = document.querySelector('main textarea');
      return Boolean(textarea) && !textarea.disabled;
    });
    if (composerWorks) pass('Chat remains usable after partial model failure');
    else fail('Chat remains usable after partial model failure');

    await shot(page, 'compare-llms-partial-failure.png');
  } catch (error) {
    fail('Compare-mode Puppeteer test execution', error instanceof Error ? error.message : String(error));
  } finally {
    console.log(`\nCompare LLM Puppeteer Tests: ${passed} passed, ${failed} failed`);
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
