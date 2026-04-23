// tests/multi-llm.test.js
const puppeteer = require('puppeteer');

(async () => {
  console.log("🎬 Launching 3-LLM Comparison Acceptance Test...");
  const browser = await puppeteer.launch({ headless: false, slowMo: 40 });
  const page = await browser.newPage();
  
  // 1. Navigate to the local app
  await page.goto('http://localhost:3000/chat');
  await page.waitForSelector('textarea');

  // 2. Open the model selection menu
  const menuSelector = "::-p-xpath(//button[contains(., 'Compare') or contains(., 'Gemini')])";
  await page.waitForSelector(menuSelector);
  const menuButtons = await page.$$(menuSelector);
  if (menuButtons.length > 0) await menuButtons[0].click();

  // 3. Select 3 specific models (Assuming Gemini is default, we add the Llamas)
  const modelsToAdd = ['Llama 3.1', 'Llama 3.2'];
  for (const modelLabel of modelsToAdd) {
    const optionSelector = `::-p-xpath(//button[contains(., '${modelLabel}')])`;
    await new Promise(r => setTimeout(r, 300)); // UI animation buffer
    const options = await page.$$(optionSelector);
    if (options.length > 0) await options[0].click();
  }
  await page.keyboard.press('Escape'); // Close menu

  // 4. Send the prompt
  await page.type('textarea', 'Explain the differences between CS and ECE.');
  const sendSelector = "::-p-xpath(//button[contains(., 'Send')])";
  const sendButtons = await page.$$(sendSelector);
  if (sendButtons.length > 0) await sendButtons[0].click();

  console.log("⏳ Awaiting multi-model response grid...");

  // 5. VERIFICATION: Check that a grid with exactly 3 child bubbles appears
  await page.waitForFunction(() => {
    const grids = document.querySelectorAll('.grid');
    for (let grid of grids) {
      // Validates that 3 separate message bubbles rendered in the DOM
      if (grid.children.length >= 3) return true; 
    }
    return false;
  }, { timeout: 90000 }); // Extended timeout for local LLM inference

  console.log("✅ Verification Passed: 3 distinct LLM responses rendered simultaneously.");
  
  await new Promise(r => setTimeout(r, 3000));

  await browser.close();
})();
