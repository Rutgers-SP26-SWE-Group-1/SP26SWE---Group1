const fs = require('fs');

const puppeteer = require('puppeteer');

(async () => {
  console.log("🎬 Launching 3-LLM Comparison Demo...");
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--window-size=1280,800'],
    slowMo: 50 
  });

  const page = await browser.newPage();
  
  // 1. Clear local storage so we always start fresh with Gemini selected
  await page.goto('http://localhost:3000');
  await page.evaluate(() => localStorage.clear());
  
  await page.goto('http://localhost:3000/chat');
  await page.waitForSelector('textarea');

  console.log("🖱️ Opening Selection Menu...");
  const menuSelector = "::-p-xpath(//button[contains(., 'Compare') or contains(., 'Gemini')])";
  await page.waitForSelector(menuSelector);
  const menuButtons = await page.$$(menuSelector);
  if (menuButtons.length > 0) await menuButtons[0].click();

  // 2. Gemini is default, so we only need to ADD the other two!
  const modelsToAdd = ['Llama 3.1', 'Llama 3.2'];
  
  for (const modelLabel of modelsToAdd) {
    console.log(`✅ Adding ${modelLabel} to comparison...`);
    const optionSelector = `::-p-xpath(//button[contains(., '${modelLabel}')])`;
    await new Promise(r => setTimeout(r, 500)); 
    const options = await page.$$(optionSelector);
    if (options.length > 0) {
      await options[0].click();
    }
  }
  
  await page.keyboard.press('Escape');

  console.log("⌨️ Typing prompt...");
  await page.type('textarea', 'Can you compare the computer science and electrical engineering majors at Rutgers?');

  console.log("🚀 Executing Triple-Model Inference...");
  const sendSelector = "::-p-xpath(//button[contains(., 'Send')])";
  const sendButtons = await page.$$(sendSelector);
  if (sendButtons.length > 0) await sendButtons[0].click();

  console.log("⏳ Waiting for all 3 models to respond...");
  
  // 3. Wait until a grid with exactly 3 child cards exists on the page
  await page.waitForFunction(() => {
    const grids = document.querySelectorAll('.grid');
    for (let grid of grids) {
      if (grid.children.length >= 3) return true;
    }
    return false;
  }, { timeout: 90000 }); // Gave it 90 seconds just in case Llama takes a moment

  console.log("🏁 3 LLMs Responded Successfully. Recording finished.");
  await new Promise(r => setTimeout(r, 6000));


  // Create the folder if it doesn't exist
  if (!fs.existsSync('./test-screenshots')) {
    fs.mkdirSync('./test-screenshots');
  }
  
  console.log("📸 Taking a screenshot for the TA...");
  // Take the screenshot and save it
  await page.screenshot({ 
    path: './test-screenshots/multi-llm-result.png', 
    fullPage: true 
  });


  await browser.close();
})();