const { launch, BASE_URL, shot, settled } = require('./puppeteer-config');

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  let passed = 0;
  let failed = 0;

  function pass(name) { console.log(`[PASS] ${name}`); passed++; }
  function fail(name, d) { console.log(`[FAIL] ${name}${d ? ' — ' + d : ''}`); failed++; }

  await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('main textarea', { timeout: 20000 });
  pass('Chat page loads');

  await page.type('main textarea', 'What is CS111 at Rutgers?');
  await page.click('button[type="submit"]');

  await page.waitForFunction(
    () => document.querySelectorAll('[class*="user-bubble-bg"]').length > 0,
    { timeout: 10000 }
  );
  pass('User message bubble appeared');

  let replyOrError = false;
  try {
    await page.waitForFunction(() => {
      const hasReply = [...document.querySelectorAll('[class*="rounded-tl-none"]')]
        .some((el) => {
          const t = (el.textContent || '').trim();
          return t.length > 15 && !t.toLowerCase().includes('thinking with');
        });
      const err = document.querySelector('[class*="message-error-border"]');
      return hasReply || (err && err.textContent.trim().length > 0);
    }, { timeout: 90000 });
    replyOrError = true;
  } catch {}

  if (replyOrError) pass('AI reply or error banner after send');
  else fail('AI reply or error banner after send');

  await shot(page, replyOrError ? 'chat-ai-response.png' : 'chat-no-response.png');

  const cleared = await page.$eval('main textarea', (el) => el.value === '');
  if (cleared) pass('Input cleared after send');
  else fail('Input cleared after send');

  console.log(`\nChat Tests: ${passed} passed, ${failed} failed`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
