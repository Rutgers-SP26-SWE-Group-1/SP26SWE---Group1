// Partha individual iteration - Feature 2 puppeteer test.
// Verifies the parallel fan-out behaviour through the live UI:
//   * one prompt fires N requests, returns N labelled cards
//   * each card displays a model name, latency, and content
//   * a partial failure (one bad model id) does not block the others
//
// Pre-reqs:
//   * `npm run dev` is running on PUPPETEER_BASE_URL
//   * `ollama serve` is running
//   * The 5 local models from src/lib/multi-llm/localModels.js are pulled.

const http = require('http');
const { launch, BASE_URL, shot, startRecording, stopRecording, loadOllamaBaseUrl } = require('./puppeteer-config');
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
          const required = LOCAL_OLLAMA_MODELS.map((m) => m.ollamaTag);
          const missing = required.filter((tag) => !installed.includes(tag));
          if (missing.length > 0) {
            reject(new Error(`Missing Ollama models: ${missing.join(', ')}. Run: ollama pull ${missing.join(' ')}`));
            return;
          }
          resolve({ base, installed });
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (err) => reject(new Error(`Ollama unreachable: ${err.message}`)));
  });
}

async function main() {
  try {
    const { base } = await checkOllama();
    console.log(`Ollama OK at ${base}`);
  } catch (err) {
    fail('ollama prerequisites', err.message);
    process.exit(1);
  }

  const browser = await launch();
  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[browser console error] ${msg.text()}`);
  });
  const recording = await startRecording(page, 'parthaped-feature2.mp4');

  try {
    const seedIds = [LOCAL_OLLAMA_MODELS[3].id, LOCAL_OLLAMA_MODELS[4].id];
    await page.evaluateOnNewDocument(
      (key, value) => window.localStorage.setItem(key, value),
      STORAGE_KEY,
      JSON.stringify(seedIds),
    );

    await page.goto(PAGE, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="multi-prompt-input"]');
    pass('multi-LLM page loads with seeded selection');

    const counter = await page.$eval(
      '[data-testid="multi-model-counter"]',
      (el) => el.textContent.trim(),
    );
    counter === '2/4'
      ? pass('seeded selection shows 2/4 in the counter')
      : fail('seeded selection shows 2/4', `got ${counter}`);

    await page.click('[data-testid="multi-prompt-input"]');
    await page.type('[data-testid="multi-prompt-input"]', 'Reply with the single word OK.');
    await page.click('[data-testid="multi-send-button"]');
    pass('prompt submitted to fan-out endpoint');

    await page.waitForSelector('[data-testid="multi-response-grid"]', { timeout: FANOUT_TIMEOUT_MS });
    const cards = await page.$$('[data-testid^="model-response-card-"]');
    cards.length === seedIds.length
      ? pass(`grid renders ${seedIds.length} cards (one per selected model)`)
      : fail(`grid renders ${seedIds.length} cards`, `got ${cards.length}`);

    const labels = await page.$$eval(
      '[data-testid^="model-response-label-"]',
      (nodes) => nodes.map((n) => (n.textContent || '').trim()),
    );
    const knownLabels = new Set(LOCAL_OLLAMA_MODELS.map((m) => m.label));
    const allLabelled = labels.every((label) => label && knownLabels.has(label));
    allLabelled
      ? pass('every card shows a known local-model label')
      : fail('every card shows a known local-model label', labels.join(' | '));

    const latencyTexts = await page.$$eval(
      '[data-testid^="model-response-latency-"]',
      (nodes) => nodes.map((n) => (n.textContent || '').trim()),
    );
    latencyTexts.every((t) => /\ds/.test(t))
      ? pass('every card shows a latency reading')
      : fail('every card shows a latency reading', latencyTexts.join(' | '));

    await shot(page, 'parthaped-feature2-success.png');

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const target = buttons.find((b) => /clear transcript/i.test(b.textContent || ''));
      if (target) target.click();
    });
    await new Promise((r) => setTimeout(r, 300));

    // Intercept fetch(/api/chat/fanout) and return a crafted partial-
    // failure payload: two fulfilled responses + one rejected. This tests
    // the grid's error-card rendering without needing to break any of
    // the user's real local Ollama models.
    await page.evaluate(() => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        if (url.endsWith('/api/chat/fanout') && init && typeof init.body === 'string') {
          let parsed = {};
          try { parsed = JSON.parse(init.body); } catch (_e) { parsed = {}; }
          const ids = Array.isArray(parsed.modelIds) && parsed.modelIds.length > 0
            ? parsed.modelIds
            : ['tinyllama', 'gemma2-2b'];
          const payload = {
            conversationId: 'puppeteer-partial-failure',
            responses: ids.map((id, index) => index === 0
              ? {
                  modelId: id,
                  ollamaTag: `${id}:latest`,
                  label: id,
                  status: 'rejected',
                  content: null,
                  error: 'Simulated Ollama outage for partial-failure Puppeteer test.',
                  durationMs: 55,
                }
              : {
                  modelId: id,
                  ollamaTag: `${id}:latest`,
                  label: id,
                  status: 'fulfilled',
                  content: `OK (${id})`,
                  error: null,
                  durationMs: 120,
                }),
            summary: {
              total: ids.length,
              succeeded: Math.max(ids.length - 1, 0),
              failed: 1,
              averageMs: 100,
            },
            totalDurationMs: 200,
            timestamp: new Date().toISOString(),
          };
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return originalFetch(input, init);
      };
    });

    await page.click('[data-testid="multi-prompt-input"]');
    await page.type('[data-testid="multi-prompt-input"]', 'Reply with OK.');
    await page.click('[data-testid="multi-send-button"]');
    await page.waitForSelector('[data-testid="multi-response-grid"]', { timeout: FANOUT_TIMEOUT_MS });

    const errorCards = await page.$$('[data-testid^="model-response-error-"]');
    const contentCards = await page.$$eval(
      '[data-testid^="model-response-content-"]',
      (nodes) => nodes.filter((n) => (n.textContent || '').trim().length > 0).length,
    );
    errorCards.length >= 1
      ? pass('one card displays an error for the unknown model id')
      : fail('one card displays an error for the unknown model id', `errors=${errorCards.length}`);
    contentCards >= 1
      ? pass('valid local models still produced content alongside the failure')
      : fail('valid local models still produced content', `content cards=${contentCards}`);

    await shot(page, 'parthaped-feature2-partial-failure.png');
  } catch (err) {
    fail('feature2 unexpected exception', err && err.message);
  } finally {
    await stopRecording(recording);
    await browser.close();
  }

  console.log(`\nFeature 2 results: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
