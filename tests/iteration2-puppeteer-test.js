const http = require('http');
const { launch, BASE_URL, shot, sleep, settled, loadOllamaBaseUrl } = require('./puppeteer-config');

const STORAGE_KEY = 'scarlet-ai-conversations';
const LLAMA_TIMEOUT = Number(process.env.PUPPETEER_LLAMA_RESPONSE_MS) || 240000;

function checkOllama() {
  const base = loadOllamaBaseUrl();
  return new Promise((resolve, reject) => {
    http.get(`${base}/api/tags`, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        const models = (JSON.parse(body).models || []).map((m) => m.name || '');
        if (!models.some((n) => /llama3\.?2/i.test(n))) {
          reject(new Error(`No llama3.2 in Ollama. Found: ${models.join(', ')}`));
          return;
        }
        resolve({ base, models });
      });
    }).on('error', (e) => reject(new Error(`Ollama unreachable: ${e.message}`)));
  });
}

(async () => {
  const ollama = await checkOllama();
  console.log(`Ollama OK — models: ${ollama.models.join(', ')}`);

  const browser = await launch();
  const page = await browser.newPage();
  let passed = 0;
  let failed = 0;

  function pass(name) { console.log(`[PASS] ${name}`); passed++; }
  function fail(name, d) { console.log(`[FAIL] ${name}${d ? ' — ' + d : ''}`); failed++; }

  const now = Date.now();
  const seed = [
    {
      id: 'e2e-beta', title: 'Beta study notes',
      createdAt: new Date(now - 2000).toISOString(),
      updatedAt: new Date(now).toISOString(),
      messages: [{ role: 'user', content: 'Second thread unique text' }],
    },
    {
      id: 'e2e-alpha', title: 'Alpha chat topic',
      createdAt: new Date(now - 4000).toISOString(),
      updatedAt: new Date(now - 1000).toISOString(),
      messages: [{ role: 'user', content: 'First thread unique text' }],
    },
  ];

  try {
    // Seed localStorage
    await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle2' });
    await page.evaluate((key, json) => {
      localStorage.removeItem(key);
      localStorage.setItem(key, json);
    }, STORAGE_KEY, JSON.stringify(seed));
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('main textarea', { timeout: 20000 });

    // 1. Newest conversation loads
    try {
      await page.waitForFunction(
        () => document.body.innerText.includes('Second thread unique text'),
        { timeout: 15000 }
      );
      pass('Active conversation loads newest (Beta)');
    } catch { fail('Active conversation loads newest (Beta)'); }

    // 2. Switch to Alpha
    await page.evaluate(() => {
      const row = [...document.querySelectorAll('aside div.rounded-xl.border')]
        .find((r) => (r.textContent || '').includes('Alpha chat topic'));
      row?.querySelector('button.min-w-0.flex-1')?.click();
    });
    await page.waitForFunction(
      () => document.body.innerText.includes('First thread unique text'),
      { timeout: 8000 }
    );
    pass('Switch conversation shows Alpha');

    // 3. History persists after reload
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('main textarea', { timeout: 20000 });
    const count = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || '[]').length,
      STORAGE_KEY
    );
    if (count === 2) pass('History persists after reload');
    else fail('History persists after reload', `got ${count}`);

    // 4. Search filters sidebar
    const toggleSel = 'aside div.relative.mb-6 button';
    await page.waitForSelector(toggleSel, { timeout: 10000 });
    for (let i = 0; i < 5; i++) {
      if (await page.$('input[placeholder="Search chats..."]')) break;
      await page.click(toggleSel);
      await sleep(400);
    }
    await page.type('input[placeholder="Search chats..."]', 'Alpha');
    try {
      await page.waitForFunction(() => {
        const t = document.querySelector('aside')?.innerText || '';
        return t.includes('Alpha chat topic') && !t.includes('Beta study notes');
      }, { timeout: 8000 });
      pass('Search filters sidebar');
    } catch { fail('Search filters sidebar'); }

    // 5. Delete conversation
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('main textarea', { timeout: 20000 });
    await page.waitForFunction(
      () => document.querySelector('aside')?.innerText.includes('Beta study notes'),
      { timeout: 15000 }
    );

    page.once('dialog', (d) => d.accept());

    const betaBtn = await page.evaluateHandle(() =>
      [...document.querySelectorAll('aside button')]
        .find((b) => (b.textContent || '').includes('Beta study notes')) || null
    );
    const betaRow = await betaBtn.evaluateHandle((el) => el.closest('[class*="rounded-xl"]'));
    const rowEl = await betaRow.asElement();
    if (rowEl) {
      const buttons = await rowEl.$$('button');
      const menuBtn = buttons[buttons.length - 1];
      await menuBtn.evaluate((b) => { b.style.opacity = '1'; });
      await menuBtn.click();
    }

    await page.waitForFunction(
      () => [...document.querySelectorAll('aside button')].some((b) => (b.textContent || '').includes('DELETE')),
      { timeout: 10000 }
    );
    await page.evaluate(() => {
      [...document.querySelectorAll('aside button')]
        .find((b) => (b.textContent || '').includes('DELETE'))?.click();
    });
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key) || '[]').length === 1,
      { timeout: 8000 }, STORAGE_KEY
    );
    pass('Delete conversation removes one thread');
    await shot(page, 'iteration2-after-delete.png');

    // 6. Dark theme
    await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.setItem('scarlet-theme', 'dark'));
    await page.reload({ waitUntil: 'networkidle2' });
    await settled(page);
    const dark = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    if (dark === 'dark') pass('Dark theme from localStorage');
    else fail('Dark theme from localStorage', `got ${dark}`);
    await shot(page, 'iteration2-theme-dark.png');

    // 7. Light theme
    await page.evaluate(() => localStorage.setItem('scarlet-theme', 'light'));
    await page.reload({ waitUntil: 'networkidle2' });
    await settled(page);
    const light = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    if (light === 'light') pass('Light theme from localStorage');
    else fail('Light theme from localStorage', `got ${light}`);

    // 8. Model selector — Llama 3.2 + Rutgers question
    await page.waitForSelector('main select', { timeout: 10000 });
    await page.evaluate((id) => {
      const sel = document.querySelector('main select');
      if (!sel) return;
      const idx = [...sel.options].findIndex((o) => o.value === id);
      if (idx >= 0) {
        sel.selectedIndex = idx;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, 'llama3.2');
    await sleep(500);

    const selected = await page.$eval('main select', (el) => el.value);
    if (selected !== 'llama3.2') {
      fail('Llama 3.2 in model selector', `value="${selected}"`);
    } else {
      await page.type('main textarea', 'What is Rutgers University?');
      await page.click('button[type="submit"]');

      await page.waitForFunction(
        () => document.querySelectorAll('[class*="user-bubble-bg"]').length > 0,
        { timeout: 15000 }
      );

      const t0 = Date.now();
      try {
        await page.waitForFunction(() => {
          return [...document.querySelectorAll('[class*="rounded-tl-none"]')]
            .some((el) => {
              const t = (el.textContent || '').trim();
              return t.length > 20 && !t.toLowerCase().includes('thinking with');
            });
        }, { timeout: LLAMA_TIMEOUT, polling: 250 });
        console.log(`[llama3.2] reply in ${Date.now() - t0}ms`);
        pass('Llama 3.2 assistant reply');
        await sleep(500);
        await shot(page, 'iteration2-llama32-rutgers-response.png');
      } catch {
        fail('Llama 3.2 assistant reply', `timed out >${Math.round(LLAMA_TIMEOUT / 1000)}s`);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
    failed++;
  }

  console.log(`\nIteration 2: ${passed} passed, ${failed} failed`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
