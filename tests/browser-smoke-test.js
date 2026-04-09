const { launch, BASE_URL, shot, settled } = require('./puppeteer-config');

(async () => {
  const browser = await launch();
  const page = await browser.newPage();

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
  await settled(page);
  console.log('[PASS] Landing page loaded');
  await shot(page, 'landing-page.png');

  await page.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle2' });
  await settled(page);
  console.log('[PASS] Signup page loaded');
  await shot(page, 'signup-page.png');

  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
