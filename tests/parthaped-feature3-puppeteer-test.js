// Partha individual iteration - Feature 3 puppeteer test.
// Verifies the side-by-side comparison grid:
//   * grid is created on the same page (no overlay/modal indirection)
//   * each card has its own model label, latency badge, and content panel
//   * the fastest card gets the visual "fastest" marker
//   * "Clear transcript" empties the grid
//
// Pre-reqs: same as feature 2 (npm run dev + ollama serve + 5 local models).

const http = require('http');
const { launch, BASE_URL, shot, loadOllamaBaseUrl } = require('./puppeteer-config');
const { LOCAL_OLLAMA_MODELS } = require('../src/lib/multi-llm/localModels');

const PAGE = `${BASE_URL}/chat/multi`;
const STORAGE_KEY = 'scarlet-ai-multi-llm-selection';
const FANOUT_TIMEOUT_MS = Number(process.env.PUPPETEER_FANOUT_MS) || 240000;

let passed = 0;
let failed = 0;
function pass(name) { console.log(`[PASS] ${name}`); passed++; }
function fail(name, detail) { console.log(`[FAIL] ${name}${detail ? ' - ' + detail : ''}`); failed++; }

function checkOllama() {
  const base = loadOllamaBaseUrl();
  return new Promise((resolve, reject) => {
    http.get(`${base}/api/tags`, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          const installed = (JSON.parse(body).models || []).map((m) => m.name || '');
          const required = LOCAL_OLLAMA_MODELS.slice(0, 3).map((m) => m.ollamaTag);
          const missing = required.filter((tag) => !installed.includes(tag));
          if (missing.length > 0) {
            reject(new Error(`Missing Ollama models: ${missing.join(', ')}`));
            return;
          }
          resolve({ base });
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (err) => reject(new Error(`Ollama unreachable: ${err.message}`)));
  });
}

async function main() {
  try {
    await checkOllama();
    console.log('Ollama OK');
  } catch (err) {
    fail('ollama prerequisites', err.message);
    process.exit(1);
  }

  const browser = await launch();
  const page = await browser.newPage();

  try {
    const seedIds = [
      LOCAL_OLLAMA_MODELS[0].id,
      LOCAL_OLLAMA_MODELS[3].id,
      LOCAL_OLLAMA_MODELS[4].id,
    ];
    await page.evaluateOnNewDocument(
      (key, value) => window.localStorage.setItem(key, value),
      STORAGE_KEY,
      JSON.stringify(seedIds),
    );

    await page.goto(PAGE, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="multi-prompt-input"]');
    pass('multi-LLM page loads with 3 seeded models');

    const emptyGrid = await page.$('[data-testid="multi-response-grid"]');
    if (emptyGrid) {
      fail('grid is hidden before any prompt is sent');
    } else {
      pass('grid is hidden before any prompt is sent');
    }

    await page.click('[data-testid="multi-prompt-input"]');
    await page.type('[data-testid="multi-prompt-input"]', 'Reply with the single word OK.');
    await page.click('[data-testid="multi-send-button"]');
    await page.waitForSelector('[data-testid="multi-response-grid"]', { timeout: FANOUT_TIMEOUT_MS });
    pass('grid appears inline after the prompt is submitted');

    const cards = await page.$$('[data-testid^="model-response-card-"]');
    cards.length === seedIds.length
      ? pass(`one card per selected model (${seedIds.length})`)
      : fail(`one card per selected model (${seedIds.length})`, `got ${cards.length}`);

    const labels = await page.$$eval(
      '[data-testid^="model-response-label-"]',
      (nodes) => nodes.map((n) => (n.textContent || '').trim()),
    );
    const distinct = new Set(labels);
    distinct.size === seedIds.length
      ? pass('every card has a distinct model label')
      : fail('every card has a distinct model label', labels.join(' | '));

    const latencies = await page.$$eval(
      '[data-testid^="model-response-latency-"]',
      (nodes) => nodes.map((n) => (n.textContent || '').trim()),
    );
    latencies.every((t) => /\d+\.\d+s/.test(t))
      ? pass('each card shows a latency reading in seconds')
      : fail('each card shows a latency reading in seconds', latencies.join(' | '));

    const fastestMarkerCount = latencies.filter((t) => /fastest/i.test(t)).length;
    fastestMarkerCount === 1
      ? pass('exactly one card is marked as fastest')
      : fail('exactly one card is marked as fastest', `markers=${fastestMarkerCount}`);

    await shot(page, 'parthaped-feature3-grid.png');

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const target = buttons.find((b) => /clear transcript/i.test(b.textContent || ''));
      if (target) target.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    const gridAfterClear = await page.$('[data-testid="multi-response-grid"]');
    gridAfterClear === null
      ? pass('grid is removed after clearing the transcript')
      : fail('grid is removed after clearing the transcript');

    await shot(page, 'parthaped-feature3-cleared.png');
  } catch (err) {
    fail('feature3 unexpected exception', err && err.message);
  } finally {
    await browser.close();
  }

  console.log(`\nFeature 3 results: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
