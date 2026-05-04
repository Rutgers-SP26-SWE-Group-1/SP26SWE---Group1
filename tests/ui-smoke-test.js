const { launch, BASE_URL, sleep } = require('./puppeteer-config');

(async () => {
  const browser = await launch();
  const page = await browser.newPage();

  await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('main textarea', { timeout: 20000 });

  // Click New Chat
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('aside button')]
      .find((b) => (b.textContent || '').includes('New Chat'));
    if (btn) btn.click();
  });
  await sleep(400);

  // Type and send
  await page.type('main textarea', 'Hello Scarlet AI, testing search!');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.animate-pulse', { timeout: 10000 }).catch(() => {});

  // Open search and type
  const toggleSel = 'aside div.relative.mb-6 button';
  await page.waitForSelector(toggleSel, { timeout: 10000 });
  await page.click(toggleSel);
  await sleep(500);
  await page.type('input[placeholder="Search chats..."]', 'testing');

  console.log('[PASS] ui-smoke-test');
  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
