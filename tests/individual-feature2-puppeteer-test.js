const { launch, BASE_URL, shot, settled, sleep } = require('./puppeteer-config');

async function clickButtonByText(page, scopeSelector, text) {
  const clicked = await page.evaluate((scope, targetText) => {
    const root = scope ? document.querySelector(scope) : document;
    if (!root) return false;

    const button = [...root.querySelectorAll('button')].find((candidate) =>
      (candidate.textContent || '').includes(targetText)
    );

    if (!button) return false;
    button.click();
    return true;
  }, scopeSelector, text);

  if (!clicked) {
    throw new Error(`Unable to find button containing "${text}" within ${scopeSelector || 'document'}.`);
  }
}

async function clickVisibleButtonByText(page, text) {
  const clicked = await page.evaluate((targetText) => {
    const button = [...document.querySelectorAll('button')].find((candidate) => {
      const box = candidate.getBoundingClientRect();
      const visible = box.width > 0 && box.height > 0;
      return visible && (candidate.textContent || '').includes(targetText);
    });

    if (!button) return false;
    button.click();
    return true;
  }, text);

  if (!clicked) {
    throw new Error(`Unable to find visible button containing "${text}".`);
  }
}

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  let passed = 0;
  let failed = 0;
  let capturedChatRequest = null;

  function pass(name) { console.log(`[PASS] ${name}`); passed++; }
  function fail(name, detail) { console.log(`[FAIL] ${name}${detail ? ` — ${detail}` : ''}`); failed++; }

  try {
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.url() === `${BASE_URL}/api/chat` && request.method() === 'POST') {
        capturedChatRequest = JSON.parse(request.postData() || '{}');

        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            conversationId: capturedChatRequest.conversationId || 'feature2-puppeteer-chat',
            responses: [
              {
                content: 'Mistral generated response',
                durationMs: 100,
                modelId: 'mistral',
                modelLabel: 'Mistral',
                modelDescription: 'Fast local-purpose model for quick responses and everyday prompts.',
              },
              {
                content: 'Llama 3.1 generated response',
                durationMs: 100,
                modelId: 'llama3.1',
                modelLabel: 'Llama 3.1',
                modelDescription: 'Strong at clear explanations and step-by-step breakdowns.',
              },
              {
                content: 'DeepSeek R1 generated response',
                durationMs: 100,
                modelId: 'deepseek',
                modelLabel: 'DeepSeek R1',
                modelDescription: 'Best fit for deeper reasoning and complex logic questions.',
              },
            ],
            content: 'Mistral generated response',
            durationMs: 100,
            modelId: 'mistral',
            modelLabel: 'Mistral',
            modelDescription: 'Fast local-purpose model for quick responses and everyday prompts.',
            timestamp: new Date().toISOString(),
          }),
        });
        return;
      }

      request.continue();
    });

    await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('main textarea', { timeout: 20000 });
    await settled(page);

    await clickButtonByText(page, 'main', 'Choose LLM(s)');
    await page.waitForFunction(() => {
      const overlay = document.querySelector('div.fixed.inset-0');
      return Boolean(overlay && !overlay.className.includes('pointer-events-none'));
    }, { timeout: 10000 });

    await clickVisibleButtonByText(page, 'Llama 3.1');
    await sleep(200);
    await clickVisibleButtonByText(page, 'DeepSeek R1');
    await sleep(200);
    await clickVisibleButtonByText(page, 'Confirm');

    await page.waitForFunction(() => {
      const footerText = [...document.querySelectorAll('main p')]
        .map((node) => (node.textContent || '').trim())
        .join(' ');
      return footerText.includes('Mistral') &&
        footerText.includes('Llama 3.1') &&
        footerText.includes('DeepSeek R1');
    }, { timeout: 10000 });
    pass('Verified that the user selects multiple models');

    const question = 'Explain recursion in one sentence.';
    await page.type('main textarea', question);
    const enteredQuestion = await page.$eval('main textarea', (textarea) => textarea.value);
    if (enteredQuestion === question) pass('Verified that the user enters a question');
    else fail('Verified that the user enters a question', `textarea="${enteredQuestion}"`);

    await page.click('button[type="submit"]');
    await page.waitForFunction(
      () => document.body.innerText.includes('Mistral generated response'),
      { timeout: 10000 }
    );
    pass('Verified that the Send button is clicked');

    if (
      capturedChatRequest?.message === question &&
      JSON.stringify(capturedChatRequest.modelIds) === JSON.stringify(['mistral', 'llama3.1', 'deepseek'])
    ) {
      pass('Verified that the question is sent to all selected models');
    } else {
      fail('Verified that the question is sent to all selected models', JSON.stringify(capturedChatRequest));
    }

    const generatedResponses = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return [
        'Mistral generated response',
        'Llama 3.1 generated response',
        'DeepSeek R1 generated response',
      ].filter((responseText) => bodyText.includes(responseText));
    });
    if (generatedResponses.length === 3) pass('Verified that multiple responses are generated');
    else fail('Verified that multiple responses are generated', `found ${generatedResponses.length}`);

    const labelsVisible = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return ['Mistral', 'Llama 3.1', 'DeepSeek R1'].every((label) => bodyText.includes(label));
    });
    if (labelsVisible) pass('Verified that each response is labeled with the correct model name');
    else fail('Verified that each response is labeled with the correct model name');

    await shot(page, 'feature2-multi-model-responses.png');
  } catch (error) {
    console.error('Error:', error.message);
    failed++;
  }

  console.log(`\nFeature 2 Puppeteer Tests: ${passed} passed, ${failed} failed`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
