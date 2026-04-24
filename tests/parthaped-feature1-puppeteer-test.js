// Partha individual iteration - Feature 1 puppeteer test.
// Verifies the local-models dropdown contract end-to-end:
//   * opens on click
//   * starts at 3/4 selected by default
//   * lets the user pick a fourth distinct local model
//   * refuses a fifth
//   * refuses to drop below the 1-model floor
//
// Pre-reqs: `npm run dev` is running on PUPPETEER_BASE_URL (default
// http://localhost:3000). No Ollama daemon required for this feature.

const { launch, BASE_URL, shot, startRecording, stopRecording } = require('./puppeteer-config');
const { LOCAL_OLLAMA_MODELS } = require('../src/lib/multi-llm/localModels');

const PAGE = `${BASE_URL}/chat/multi`;
const STORAGE_KEY = 'scarlet-ai-multi-llm-selection';
const IDS = LOCAL_OLLAMA_MODELS.map((m) => m.id);

let passed = 0;
let failed = 0;
function pass(name) { console.log(`[PASS] ${name}`); passed++; }
function fail(name, detail) { console.log(`[FAIL] ${name}${detail ? ' - ' + detail : ''}`); failed++; }

async function main() {
  const browser = await launch();
  const page = await browser.newPage();
  const recording = await startRecording(page, 'parthaped-feature1.mp4');

  try {
    await page.evaluateOnNewDocument(
      (key) => window.localStorage.removeItem(key),
      STORAGE_KEY,
    );
    await page.goto(PAGE, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="multi-model-dropdown-toggle"]');
    pass('multi-LLM page loads');

    const counter = await page.$eval(
      '[data-testid="multi-model-counter"]',
      (el) => el.textContent.trim(),
    );
    counter === '3/4'
      ? pass('default selection is 3 of 4')
      : fail('default selection is 3 of 4', `got ${counter}`);

    await page.click('[data-testid="multi-model-dropdown-toggle"]');
    await page.waitForSelector('[data-testid="multi-model-dropdown-panel"]', { timeout: 5000 });
    pass('dropdown opens on click');

    const visibleOptions = await page.$$('[role="option"]');
    visibleOptions.length === LOCAL_OLLAMA_MODELS.length
      ? pass(`dropdown lists all ${LOCAL_OLLAMA_MODELS.length} local models`)
      : fail('dropdown lists all 5 local models', `got ${visibleOptions.length}`);

    async function selectedIdSet() {
      const ids = await page.$$eval('[role="option"]', (nodes) =>
        nodes
          .filter((n) => n.getAttribute('aria-selected') === 'true')
          .map((n) => (n.getAttribute('data-testid') || '').replace('multi-model-option-', '')),
      );
      return new Set(ids.filter(Boolean));
    }

    let selected = await selectedIdSet();
    const fourthModelId = IDS.find((id) => !selected.has(id)) || IDS[3];
    await page.click(`[data-testid="multi-model-option-${fourthModelId}"]`);
    await new Promise((r) => setTimeout(r, 200));
    const after4 = await page.$eval(
      '[data-testid="multi-model-counter"]',
      (el) => el.textContent.trim(),
    );
    after4 === '4/4'
      ? pass('user can add a fourth local model')
      : fail('user can add a fourth local model', `counter=${after4}`);

    selected = await selectedIdSet();
    const remainingId = IDS.find((id) => !selected.has(id)) || IDS[IDS.length - 1];
    const fifthSel = `[data-testid="multi-model-option-${remainingId}"]`;
    const fifthDisabled = await page.$eval(fifthSel, (n) => n.getAttribute('disabled') !== null);
    fifthDisabled
      ? pass('fifth local model is disabled at the cap')
      : fail('fifth local model is disabled at the cap');

    await shot(page, 'parthaped-feature1-after-cap.png');

    let firstSelectedId = null;
    for (const id of IDS) {
      const sel = `[data-testid="multi-model-option-${id}"]`;
      const isSelected = await page.$eval(sel, (n) => n.getAttribute('aria-selected') === 'true');
      if (isSelected) {
        if (!firstSelectedId) {
          firstSelectedId = id;
          continue;
        }
        await page.click(sel);
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    const finalCounter = await page.$eval(
      '[data-testid="multi-model-counter"]',
      (el) => el.textContent.trim(),
    );
    finalCounter === '1/4'
      ? pass('user can deselect down to one model')
      : fail('user can deselect down to one model', `counter=${finalCounter}`);

    if (firstSelectedId) {
      const lastSel = `[data-testid="multi-model-option-${firstSelectedId}"]`;
      const lastDisabled = await page.$eval(lastSel, (n) => n.getAttribute('disabled') !== null);
      lastDisabled
        ? pass('last remaining local model is locked at MIN floor')
        : fail('last remaining local model is locked at MIN floor');
    }

    await shot(page, 'parthaped-feature1-after-min.png');
  } catch (err) {
    fail('feature1 unexpected exception', err && err.message);
  } finally {
    await stopRecording(recording);
    await browser.close();
  }

  console.log(`\nFeature 1 results: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
