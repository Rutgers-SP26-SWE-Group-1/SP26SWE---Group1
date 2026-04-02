// tests/browser-smoke-test-full.js
// Puppeteer smoke test covering all pages in Scarlet AI




const puppeteer = require('puppeteer');


const PAGES = [
  { name: 'Landing Page',       url: '/',                       screenshot: 'landing-page.png' },
  { name: 'Signup Page',        url: '/signup',                 screenshot: 'signup-page.png' },
  { name: 'Login Page',         url: '/login',                  screenshot: 'login-page.png' },
  { name: 'Chat Page (Guest)',  url: '/chat',                   screenshot: 'chat-page.png' },
  { name: 'Verify Notice',      url: '/signup/verify-notice',   screenshot: 'verify-notice-page.png' },
  { name: 'Update Password',    url: '/auth/update-password',   screenshot: 'update-password-page.png' },
];


(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  let passed = 0;
  let failed = 0;


  for (const pg of PAGES) {
    try {
      const response = await page.goto(`http://localhost:3000${pg.url}`, {
        waitUntil: 'networkidle0',
        timeout: 15000
      });
      const status = response.status();
      await page.screenshot({ path: `test-screenshots/${pg.screenshot}`, fullPage: true });


      if (status === 200) {
        console.log(`[PASS] ${pg.name} (${pg.url}) - status ${status}`);
        passed++;
      } else {
        console.log(`[FAIL] ${pg.name} (${pg.url}) - status ${status}`);
        failed++;
      }
    } catch (err) {
      console.log(`[FAIL] ${pg.name} (${pg.url}) - ${err.message}`);
      failed++;
    }
  }


  console.log(`\n========================================`);
  console.log(`Smoke Test: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);


  await browser.close();
})();