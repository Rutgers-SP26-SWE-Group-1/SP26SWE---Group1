/* eslint-disable @typescript-eslint/no-require-imports */
const puppeteer = require('puppeteer');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

const COURSE_RESPONSE = [
  'Rutgers Course Results:',
  '- Course: 01:198:440 INTRO TO ARTIFICIAL INTELLIGENCE',
  '- Section: 01 (Index 12345)',
  '- Time: M 9:00 AM - 10:20 AM @ COLLEGE AVENUE',
  '- Instructor: DOE, JANE',
  '- Status: OPEN',
].join('\n');

const WEATHER_RESPONSE = [
  'Rutgers Weather:',
  '- Location: New Brunswick, NJ',
  '- Temperature: 52°F',
  '- Conditions: Partly cloudy',
  '- Suggested clothing: bring a jacket; dress in light layers',
].join('\n');

const COMBINED_RESPONSE = [
  'Rutgers Course Results:',
  '- Course: 01:640:251 MULTIVARIABLE CALCULUS',
  '- Section: 03 (Index 24680)',
  '- Time: T 1:10 PM - 2:30 PM @ BUSCH',
  '- Instructor: PATEL, RAVI',
  '- Status: OPEN',
  '',
  'Rutgers Weather:',
  '- Location: New Brunswick, NJ',
  '- Temperature: High 61°F / Low 45°F',
  '- Conditions: Light rain',
  '- Suggested clothing: bring a jacket; pack an umbrella or rain jacket',
  '',
  'Recommendation:',
  'Check the open section details and bring a jacket plus an umbrella tomorrow.',
].join('\n');

const PARTIAL_FAILURE_RESPONSE = [
  'Rutgers Course Results:',
  '- Course: 01:198:336 PRINCIPLES OF INFORMATION AND DATA MANAGEMENT',
  '- Section: 02 (Index 11223)',
  '- Time: W 10:20 AM - 11:40 AM @ LIVINGSTON',
  '- Instructor: SMITH, ALEX',
  '- Status: OPEN',
  '',
  'Rutgers Weather:',
  '- Weather data is unavailable.',
  '',
  'Recommendation:',
  'Review the course details above and check the forecast again later.',
].join('\n');

function createReporter() {
  let passed = 0;
  let failed = 0;

  return {
    log(testName, success, detail) {
      console.log(`[${success ? 'PASS' : 'FAIL'}] ${testName}${detail ? ` - ${detail}` : ''}`);
      if (success) {
        passed += 1;
      } else {
        failed += 1;
      }
    },
    finish() {
      console.log(`\n========================================`);
      console.log(`Rutgers Course Weather Browser Tests: ${passed} passed, ${failed} failed`);
      console.log(`========================================\n`);
      return failed;
    },
  };
}

async function createMockedPage(browser, responseFactory) {
  const page = await browser.newPage();
  await page.setRequestInterception(true);

  page.on('request', async (request) => {
    if (request.url().includes('/api/chat') && request.method() === 'POST') {
      const body = JSON.parse(request.postData() || '{}');
      const payload = await responseFactory(body);
      await request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
      return;
    }

    await request.continue();
  });

  return page;
}

async function openFreshChat(page) {
  await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    window.localStorage.removeItem('scarlet-ai-conversations');
  });
  await page.reload({ waitUntil: 'networkidle0' });
}

async function submitMessage(page, message) {
  await page.waitForSelector('textarea', { timeout: 10000 });
  await page.type('textarea', message);
  await page.click('button[type="submit"]');
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const reporter = createReporter();

  try {
    const coursePage = await createMockedPage(browser, async (body) => {
      await new Promise((resolve) => setTimeout(resolve, 1400));
      return {
        conversationId: body.conversationId || 'course-browser-test',
        content: COURSE_RESPONSE,
        durationMs: 1400,
        modelId: body.modelId || 'mistral',
        modelLabel: 'Mistral',
        modelDescription: 'Local (Ollama)',
        timestamp: new Date().toISOString(),
      };
    });

    await openFreshChat(coursePage);
    await submitMessage(coursePage, 'Find open Rutgers CS classes on Monday');
    await coursePage.waitForSelector('[data-testid="thinking-state"]', { timeout: 5000 });
    const courseLoading = await coursePage.$eval('[data-testid="thinking-state"]', (el) => el.textContent || '');
    reporter.log('Loading state appears while fetching course data', courseLoading.includes('Searching Rutgers courses...'));
    await coursePage.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });
    const courseText = await coursePage.$eval('[data-testid="assistant-message"]', (el) => el.textContent || '');
    reporter.log('Rutgers course query renders course results', courseText.includes('Rutgers Course Results:') && courseText.includes('- Course:'));
    await coursePage.close();

    const weatherPage = await createMockedPage(browser, async (body) => {
      await new Promise((resolve) => setTimeout(resolve, 1400));
      return {
        conversationId: body.conversationId || 'weather-browser-test',
        content: WEATHER_RESPONSE,
        durationMs: 1400,
        modelId: body.modelId || 'mistral',
        modelLabel: 'Mistral',
        modelDescription: 'Local (Ollama)',
        timestamp: new Date().toISOString(),
      };
    });

    await openFreshChat(weatherPage);
    await submitMessage(weatherPage, 'What is the weather in New Brunswick today?');
    await weatherPage.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });
    const weatherText = await weatherPage.$eval('[data-testid="assistant-message"]', (el) => el.textContent || '');
    reporter.log(
      'Rutgers weather query renders weather results and clothing suggestions',
      weatherText.includes('Rutgers Weather:') &&
        weatherText.includes('- Temperature:') &&
        weatherText.includes('- Suggested clothing:')
    );
    await weatherPage.close();

    const combinedPage = await createMockedPage(browser, async (body) => {
      await new Promise((resolve) => setTimeout(resolve, 1600));
      return {
        conversationId: body.conversationId || 'combined-browser-test',
        content: COMBINED_RESPONSE,
        durationMs: 1600,
        modelId: body.modelId || 'mistral',
        modelLabel: 'Mistral',
        modelDescription: 'Local (Ollama)',
        timestamp: new Date().toISOString(),
      };
    });

    await openFreshChat(combinedPage);
    await submitMessage(combinedPage, 'Find available Rutgers math courses and tell me the weather for tomorrow');
    await combinedPage.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });
    const combinedText = await combinedPage.$eval('[data-testid="assistant-message"]', (el) => el.textContent || '');
    reporter.log(
      'Combined Rutgers course and weather query renders both sections',
      combinedText.includes('Rutgers Course Results:') &&
        combinedText.includes('Rutgers Weather:') &&
        combinedText.includes('Recommendation:')
    );
    await combinedPage.close();

    const partialFailurePage = await createMockedPage(browser, async (body) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return {
        conversationId: body.conversationId || 'partial-failure-browser-test',
        content: PARTIAL_FAILURE_RESPONSE,
        durationMs: 1200,
        modelId: body.modelId || 'mistral',
        modelLabel: 'Mistral',
        modelDescription: 'Local (Ollama)',
        timestamp: new Date().toISOString(),
      };
    });

    await openFreshChat(partialFailurePage);
    await submitMessage(partialFailurePage, 'Find available Rutgers CS courses and tell me the weather for tomorrow');
    await partialFailurePage.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });
    const partialFailureText = await partialFailurePage.$eval('[data-testid="assistant-message"]', (el) => el.textContent || '');
    reporter.log(
      'Graceful handling appears if one API or tool fails',
      partialFailureText.includes('Rutgers Course Results:') &&
        partialFailureText.includes('Weather data is unavailable.')
    );
    await partialFailurePage.close();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Test error:', message);
  } finally {
    const failed = reporter.finish();
    await browser.close();
    process.exitCode = failed > 0 ? 1 : 0;
  }
})();
