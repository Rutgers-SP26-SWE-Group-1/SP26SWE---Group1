const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Opening app...');
    await page.goto('http://localhost:3000/chat', {
      waitUntil: 'networkidle2',
    });

    console.log('Typing prompt...');
    await page.waitForSelector('textarea, input');
    await page.type('textarea, input', 'Hello');

    console.log('Clicking send...');
    await page.waitForSelector('button');
    await page.click('button');

    console.log('Waiting for response...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const text = await page.evaluate(() => document.body.innerText);

    if (text.length === 0) {
      throw new Error('No content found on page');
    }

    console.log('✅ Puppeteer test passed');
  } catch (error) {
    console.error('❌ Puppeteer test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();