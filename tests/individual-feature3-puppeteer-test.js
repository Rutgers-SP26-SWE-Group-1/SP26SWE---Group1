/* eslint-disable @typescript-eslint/no-require-imports */
const { launch, BASE_URL, shot, settled } = require('./puppeteer-config');

const STORAGE_KEY = 'scarlet-ai-conversations';

const LATEST_MODEL_RESPONSES = [
  {
    role: 'assistant',
    content: 'Mistral integrated comparison response',
    durationMs: 100,
    modelId: 'mistral',
    modelLabel: 'Mistral',
    modelDescription: 'Fast local-purpose model for quick responses and everyday prompts.',
  },
  {
    role: 'assistant',
    content: 'Llama 3.1 integrated comparison response',
    durationMs: 100,
    modelId: 'llama3.1',
    modelLabel: 'Llama 3.1',
    modelDescription: 'Strong at clear explanations and step-by-step breakdowns.',
  },
  {
    role: 'assistant',
    content: 'DeepSeek R1 integrated comparison response',
    durationMs: 100,
    modelId: 'deepseek',
    modelLabel: 'DeepSeek R1',
    modelDescription: 'Best fit for deeper reasoning and complex logic questions.',
  },
];

async function seedChatWithLatestMultiModelResponses(page) {
  const now = new Date().toISOString();
  const conversation = {
    id: 'feature3-integrated-view-seed',
    title: 'Feature 3 integrated view',
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        role: 'user',
        content: 'Older prompt.',
      },
      {
        role: 'assistant',
        content: 'Older response that must not appear in the integrated view.',
        durationMs: 100,
        modelId: 'gemma',
        modelLabel: 'Gemma 3',
        modelDescription: 'Balanced local model for a mix of speed, quality, and versatility.',
      },
      {
        role: 'user',
        content: 'Compare only these latest responses.',
      },
      ...LATEST_MODEL_RESPONSES,
    ],
  };

  await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((key, seededConversation) => {
    localStorage.setItem(key, JSON.stringify([seededConversation]));
  }, STORAGE_KEY, conversation);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('main textarea', { timeout: 20000 });
  await settled(page);
}

async function readComparisonCards(page) {
  return page.$$eval('[data-testid="comparison-response-section"]', (sections) =>
    sections.map((section) => ({
      label: section.querySelector('p')?.textContent?.trim() || '',
      text: section.textContent || '',
      width: section.getBoundingClientRect().width,
      height: section.getBoundingClientRect().height,
    }))
  );
}

async function clickOpenButtonInPage(page) {
  const result = await page.evaluate(() => {
    const button = document.querySelector('[data-testid="open-comparison-view"]');
    if (!button) {
      return {
        clicked: false,
        reason: 'button missing',
      };
    }

    button.scrollIntoView({ block: 'center', inline: 'center' });
    button.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
    }));

    return {
      clicked: true,
      text: (button.textContent || '').replace(/\s+/g, ' ').trim(),
    };
  });

  if (!result.clicked) {
    throw new Error(`Could not click integrated view button: ${result.reason}`);
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
    await seedChatWithLatestMultiModelResponses(page);

    await page.waitForSelector('[data-testid="open-comparison-view"]', { timeout: 10000 });

    await page.waitForSelector('[data-testid="comparison-view-overlay"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="comparison-view-dialog"]', { timeout: 10000 });

    await clickOpenButtonInPage(page);
    pass('Verified that the user clicks the "Open in Integrated View" button');

    await page.waitForFunction(() => {
      const overlay = document.querySelector('[data-testid="comparison-view-overlay"]');
      return Boolean(overlay && !overlay.className.includes('pointer-events-none'));
    }, { timeout: 10000 });

    const dialogText = await page.$eval(
      '[data-testid="comparison-view-dialog"]',
      (dialog) => (dialog.textContent || '').replace(/\s+/g, ' ').trim()
    );
    if (!dialogText.includes('Compare Model Responses')) {
      fail('Verified that the integrated comparison view opens', `dialogText="${dialogText}"`);
    } else {
      pass('Verified that the integrated comparison view opens');
    }

    const cards = await readComparisonCards(page);
    const expectedLabels = LATEST_MODEL_RESPONSES.map((response) => response.modelLabel);
    const expectedContents = LATEST_MODEL_RESPONSES.map((response) => response.content);

    const hasOneCardPerLatestResponse =
      cards.length === LATEST_MODEL_RESPONSES.length &&
      expectedContents.every((content) => cards.filter((card) => card.text.includes(content)).length === 1) &&
      cards.every((card) => !card.text.includes('Older response that must not appear'));

    if (hasOneCardPerLatestResponse) {
      pass('Verified that each model response appears in its own section');
    } else {
      fail('Verified that each model response appears in its own section', `cards=${cards.length}`);
    }

    const hasCorrectModelLabels = expectedLabels.every((label) =>
      cards.some((card) => card.label === label)
    );

    if (hasCorrectModelLabels) {
      pass('Verified that each section displays the correct model name');
    } else {
      fail('Verified that each section displays the correct model name');
    }

    const cardsAreLargeEnoughForCleanView = cards.every((card) => card.width >= 250 && card.height >= 300);
    if (cardsAreLargeEnoughForCleanView) {
      pass('Verified that the integrated view uses large response cards');
    } else {
      fail('Verified that the integrated view uses large response cards', JSON.stringify(cards));
    }

    await page.click('[data-testid="close-comparison-view"]');
    await page.waitForFunction(() => {
      const overlay = document.querySelector('[data-testid="comparison-view-overlay"]');
      return Boolean(overlay && overlay.className.includes('pointer-events-none'));
    }, { timeout: 10000 });
    pass('Verified that the comparison view can be closed');

    await shot(page, 'feature3-integrated-comparison-view.png');
  } catch (error) {
    console.error('Error:', error.message);
    failed++;
  }

  console.log(`\nFeature 3 Puppeteer Tests: ${passed} passed, ${failed} failed`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
