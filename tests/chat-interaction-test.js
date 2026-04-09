// Puppeteer E2E test for AI chat interaction

const puppeteer = require('puppeteer');


(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  let passed = 0;
  let failed = 0;


  function log(testName, success, detail) {
    console.log(`[${success ? 'PASS' : 'FAIL'}] ${testName}${detail ? ' - ' + detail : ''}`);
    if (success) passed++; else failed++;
  }


  try {
    // TEST 1: Chat page loads for guest user
    await page.goto('http://localhost:3000/chat', { waitUntil: 'networkidle0' });
    log('Chat page loads for guest', page.url().includes('/chat'));
    await page.screenshot({ path: 'test-screenshots/chat-page-guest.png', fullPage: true });


    // TEST 2: Chat input and send button exist
    const inputExists = await page.$('input[type="text"]');
    const sendBtn = await page.$('button[type="submit"]');
    log('Chat input field exists', inputExists !== null);
    log('Send button exists', sendBtn !== null);


    // TEST 3: Type and send a message
    await page.type('input[type="text"]', 'What is CS111 at Rutgers?');
    await page.click('button[type="submit"]');


    // TEST 4: User message bubble appears
    await page.waitForFunction(
      () => document.querySelectorAll('[class*="bg-[#cc0033]"]').length > 0,
      { timeout: 5000 }
    );
    log('User message bubble appeared', true);


    // TEST 5: AI response appears within 30 seconds
    let aiResponded = false;
    try {
      await page.waitForFunction(
        () => document.querySelectorAll('[class*="bg-slate-100"]').length > 0,
        { timeout: 30000 }
      );
      aiResponded = true;
    } catch { aiResponded = false; }
    log('AI response appeared within 30s', aiResponded);
    await page.screenshot({ path: 'test-screenshots/chat-ai-response.png', fullPage: true });


    // TEST 6: Input field clears after send
    const inputValue = await page.$eval('input[type="text"]', el => el.value);
    log('Input cleared after send', inputValue === '');


  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
  }


  console.log(`\n========================================`);
  console.log(`Chat Tests: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);


  await browser.close();
})();
