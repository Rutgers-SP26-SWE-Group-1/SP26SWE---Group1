/* eslint-disable @typescript-eslint/no-require-imports */
const puppeteer = require('puppeteer');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

const STEP_BY_STEP_RESPONSE = [
  'Understanding:',
  'We need to solve the equation 2x + 4 = 10.',
  '',
  'Step 1:',
  'Subtract 4 from both sides to isolate the variable term.',
  '',
  'Step 2:',
  'This simplifies the equation to 2x = 6.',
  '',
  'Step 3:',
  'Divide both sides by 2, so x = 3.',
  '',
  'Final Answer:',
  'x = 3',
].join('\n');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  let passed = 0;
  let failed = 0;

  function log(testName, success, detail) {
    console.log(`[${success ? 'PASS' : 'FAIL'}] ${testName}${detail ? ` - ${detail}` : ''}`);
    if (success) {
      passed += 1;
    } else {
      failed += 1;
    }
  }

  try {
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      if (request.url().includes('/api/chat') && request.method() === 'POST') {
        const body = JSON.parse(request.postData() || '{}');

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
        return;
      }

      await request.continue();
    });

    await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      window.localStorage.removeItem('scarlet-ai-conversations');
    });
    await page.reload({ waitUntil: 'networkidle0' });

    await page.waitForSelector('[data-testid="step-by-step-toggle"]', { timeout: 10000 });
    await page.click('[data-testid="step-by-step-toggle"]');
    await page.type('textarea', 'Solve 2x + 4 = 10');
    await page.click('button[type="submit"]');

    await page.waitForSelector('[data-testid="thinking-state"]', { timeout: 5000 });
    const thinkingCopy = await page.$eval('[data-testid="thinking-state"]', (el) => el.textContent || '');
    log(
      'Thinking state renders for Solve equation',
      thinkingCopy.includes('Understanding problem...') ||
        thinkingCopy.includes('Planning solution...') ||
        thinkingCopy.includes('Generating explanation...')
    );

    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });
    const assistantCopy = await page.$eval('[data-testid="assistant-message"]', (el) => el.textContent || '');
    log('Structured response renders for Solve equation', assistantCopy.includes('Understanding:'));
    log(
      'Solve equation response includes all math steps',
      assistantCopy.includes('Step 1:') &&
        assistantCopy.includes('Step 2:') &&
        assistantCopy.includes('Step 3:') &&
        assistantCopy.includes('Final Answer:') &&
        assistantCopy.includes('x = 3')
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Test error:', message);
    failed += 1;
  } finally {
    console.log(`\n========================================`);
    console.log(`Browser Tests: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);
    await browser.close();
    process.exitCode = failed > 0 ? 1 : 0;
  }
})();
