const puppeteer = require('puppeteer');

describe('Multi-LLM Comparison Acceptance Test', () => {
  let browser;
  let page;

  // Setup: Open the browser and navigate to the chat hub
  beforeAll(async () => {
    browser = await puppeteer.launch({ 
      headless: false, // Set to false so you can watch the test run for your demo video!
      slowMo: 50       // Slows down actions so it's easy to record
    });
    page = await browser.newPage();
    await page.goto('http://localhost:3000/chat'); // Ensure your local server is running
  });

  // Teardown: Close the browser after the test
  afterAll(async () => {

    await browser.close();
  });

  it('Scenario: User compares Cloud and Local LLMs simultaneously', async () => {
    // 1. Wait for the page to load and find the chat composer
    await page.waitForSelector('textarea[placeholder*="ask Scarlet AI"]');

    // 2. Open the Multi-Model selector menu
    const compareButton = await page.$x("//button[contains(., 'Compare') or contains(., 'Gemini')]");
    if (compareButton.length > 0) {
      await compareButton[0].click();
    }

    // 3. Select a second model (e.g., Llama 3) to trigger the comparison grid
    // The menu opens, we look for the Llama option and click it
    await page.waitForSelector('button:has-text("Llama 3")');
    const llamaOption = await page.$x("//button[contains(., 'Llama 3')]");
    if (llamaOption.length > 0) {
      await llamaOption[0].click();
    }

    // 4. Type the prompt
    await page.type('textarea', 'What are the top 3 best places to study on the New Brunswick campus?');

    // 5. Click Send
    const sendButton = await page.$x("//button[contains(., 'Send')]");
    if (sendButton.length > 0) {
      await sendButton[0].click();
    }

    // 6. Wait for the generating state to finish and responses to render
    // We wait for the specific grid container or response cards to appear
    await page.waitForSelector('.grid-cols-1.md\\:grid-cols-2', { timeout: 30000 }); // Wait up to 30s for LLMs

    // 7. Assert that multiple response cards are visible inside the grid
    const responseCards = await page.$$('.grid-cols-1.md\\:grid-cols-2 > div');
    
    // Expectation: There should be exactly 2 response cards rendered side-by-side
    expect(responseCards.length).toBeGreaterThanOrEqual(2);
  }, 35000); // Extended timeout for API latency
});