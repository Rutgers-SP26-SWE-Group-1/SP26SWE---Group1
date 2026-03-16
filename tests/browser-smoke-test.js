const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  console.log('Landing page loaded');

  await page.screenshot({ path: 'landing-page.png', fullPage: true });

  await page.goto('http://localhost:3000/signup', { waitUntil: 'networkidle0' });

  console.log('Signup page opened');

  await page.screenshot({ path: 'signup-page.png', fullPage: true });

  await browser.close();
})();