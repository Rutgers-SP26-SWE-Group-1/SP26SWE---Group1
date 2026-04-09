const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = (process.env.PUPPETEER_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const HEADLESS = process.env.PUPPETEER_HEADLESS === '1' || process.env.CI === 'true';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-screenshots');

function launch() {
  return puppeteer.launch({
    headless: HEADLESS ? 'new' : false,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function settled(page) {
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 15000 }).catch(() => {});
  await sleep(800);
}

async function shot(page, name) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await settled(page);
  return page.screenshot({ path: path.join(SCREENSHOT_DIR, name), fullPage: true });
}

function loadOllamaBaseUrl() {
  if (process.env.OLLAMA_BASE_URL) return process.env.OLLAMA_BASE_URL.trim().replace(/\/$/, '');
  try {
    const txt = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
    const m = txt.match(/^\s*OLLAMA_BASE_URL=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '').replace(/\/$/, '');
  } catch {}
  return 'http://127.0.0.1:11434';
}

module.exports = { BASE_URL, launch, sleep, settled, shot, loadOllamaBaseUrl };
