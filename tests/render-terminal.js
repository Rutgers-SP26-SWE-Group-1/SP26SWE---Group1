#!/usr/bin/env node
// Render terminal text (stdin or --input <file>) to a PNG that looks like
// a real terminal window. Used to produce evidence screenshots of
// Jasmine, Cucumber and Puppeteer runs for the Individual Iteration 1
// report without needing ImageMagick or Silicon installed on the grader's
// machine.
//
// Usage:
//   node tests/render-terminal.js --title "npm run test:jasmine:multi1" \
//        --out test-screenshots/parthaped-feature1-jasmine.png \
//        --input /tmp/jasmine1.txt

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function colourize(text) {
  const esc = escapeHtml(text);
  return esc
    .replace(/\[PASS\]/g, '<span class="pass">[PASS]</span>')
    .replace(/\[FAIL\]/g, '<span class="fail">[FAIL]</span>')
    .replace(/\b(\d+) specs?, 0 failures\b/g,
      '<span class="ok">$1 specs, 0 failures</span>')
    .replace(/\b(\d+) scenarios? \(([^)]*)\)/g,
      '<span class="ok">$1 scenarios ($2)</span>')
    .replace(/\b(\d+) passed, 0 failed\b/g,
      '<span class="ok">$1 passed, 0 failed</span>');
}

async function main() {
  const outPath = path.resolve(arg('--out', 'test-screenshots/terminal.png'));
  const title = arg('--title', 'terminal');
  const inputPath = arg('--input', null);

  let text = '';
  if (inputPath) {
    text = fs.readFileSync(inputPath, 'utf8');
  } else {
    text = await new Promise((resolve, reject) => {
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => (data += chunk));
      process.stdin.on('end', () => resolve(data));
      process.stdin.on('error', reject);
    });
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
* { box-sizing: border-box; }
body { margin: 0; padding: 24px; background: #1e1e2e; font-family: 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace; color: #cdd6f4; }
.window { max-width: 1200px; margin: 0 auto; border-radius: 10px; overflow: hidden; box-shadow: 0 12px 30px rgba(0,0,0,0.45); border: 1px solid #313244; }
.bar { background: #181825; padding: 10px 14px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #313244; }
.dot { width: 12px; height: 12px; border-radius: 50%; }
.dot.red { background: #f38ba8; } .dot.yellow { background: #f9e2af; } .dot.green { background: #a6e3a1; }
.title { color: #bac2de; font-size: 13px; margin-left: 10px; }
.body { padding: 16px 20px; white-space: pre; font-size: 14px; line-height: 1.5; }
.pass { color: #a6e3a1; font-weight: bold; }
.fail { color: #f38ba8; font-weight: bold; }
.ok   { color: #a6e3a1; font-weight: bold; }
</style></head>
<body>
  <div class="window">
    <div class="bar">
      <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
      <span class="title">${escapeHtml(title)}</span>
    </div>
    <div class="body">${colourize(text)}</div>
  </div>
</body></html>`;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const el = await page.$('.window');
    await el.screenshot({ path: outPath });
    console.log(`wrote ${outPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
