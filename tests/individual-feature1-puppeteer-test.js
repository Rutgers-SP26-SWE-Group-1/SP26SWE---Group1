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

async function getModelCardState(page, modelLabel) {
  return page.evaluate((label) => {
    const dialog = [...document.querySelectorAll('[role="dialog"]')]
      .find((candidate) => candidate.closest('.pointer-events-auto'));
    if (!dialog) return null;

    const button = [...dialog.querySelectorAll('button')].find((candidate) =>
      (candidate.textContent || '').includes(label)
    );

    if (!button) return null;

    return {
      disabled: button.disabled,
      pressed: button.getAttribute('aria-pressed'),
      text: button.textContent || '',
    };
  }, modelLabel);
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

  function pass(name) { console.log(`[PASS] ${name}`); passed++; }
  function fail(name, detail) { console.log(`[FAIL] ${name}${detail ? ` — ${detail}` : ''}`); failed++; }

  try {
    await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('main textarea', { timeout: 20000 });
    await settled(page);

    await clickButtonByText(page, 'main', 'Choose LLM(s)');
    await page.waitForFunction(() => {
      const overlay = document.querySelector('div.fixed.inset-0');
      return Boolean(overlay && !overlay.className.includes('pointer-events-none'));
    }, { timeout: 10000 });
    pass('Model selector opens from chat composer');

    const initialCount = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog?.textContent?.includes('1 of 3 selected') ?? false;
    });
    if (initialCount) pass('Model selector starts with one saved model');
    else fail('Model selector starts with one saved model');

    await clickVisibleButtonByText(page, 'Llama 3.1');
    await sleep(200);
    await clickVisibleButtonByText(page, 'DeepSeek R1');
    await sleep(200);

    const selectionCountReached = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog?.textContent?.includes('3 of 3 selected') ?? false;
    });
    if (selectionCountReached) pass('User can select up to three models');
    else fail('User can select up to three models');

    const qwenState = await getModelCardState(page, 'Qwen Coder');
    if (qwenState?.disabled) pass('Fourth model option becomes disabled at the limit');
    else fail('Fourth model option becomes disabled at the limit', qwenState ? 'button was still enabled' : 'button not found');

    await clickVisibleButtonByText(page, 'Qwen Coder').catch(() => {});
    await sleep(200);

    const qwenAfterClick = await getModelCardState(page, 'Qwen Coder');
    const stillThreeSelected = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog?.textContent?.includes('3 of 3 selected') ?? false;
    });
    if (stillThreeSelected && qwenAfterClick?.pressed === 'false') {
      pass('Selector prevents choosing more than three models');
    } else {
      fail(
        'Selector prevents choosing more than three models',
        qwenAfterClick ? `pressed=${qwenAfterClick.pressed} disabled=${qwenAfterClick.disabled}` : 'button not found'
      );
    }

    await clickVisibleButtonByText(page, 'Confirm');
    await page.waitForFunction(() => {
      const overlay = document.querySelector('div.fixed.inset-0');
      return Boolean(overlay && overlay.className.includes('pointer-events-none'));
    }, { timeout: 10000 });

    const savedSelection = await page.evaluate(() => {
      const footerTexts = [...document.querySelectorAll('main p')].map((node) => (node.textContent || '').trim());
      return footerTexts.find((text) => text.includes('Mistral') && text.includes('Llama 3.1') && text.includes('DeepSeek R1')) || '';
    });
    if (savedSelection === 'Mistral • Llama 3.1 • DeepSeek R1') {
      pass('Confirmed selection is saved to the chat footer');
    } else {
      fail('Confirmed selection is saved to the chat footer', `found "${savedSelection}"`);
    }

    await shot(page, 'feature1-model-selector.png');
  } catch (error) {
    console.error('Error:', error.message);
    failed++;
  }

  console.log(`\nModel Selector Tests: ${passed} passed, ${failed} failed`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
