const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // Set to false to record video
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/chat');

  // 1. Click New Chat
  await page.click('button:text("+ New Chat")');

  // 2. Type a message
  await page.type('textarea', 'Hello Scarlet AI, testing search!');
  await page.keyboard.press('Enter');

  // 3. Verify AI thinking state
  await page.waitForSelector('.animate-pulse');

  // 4. Test Search
  await page.click('button svg'); // Click search icon
  await page.type('input[placeholder="Search chats..."]', 'testing');
  
  console.log('UI verification complete. Capture this for your demo video.');
  await browser.close();
})();