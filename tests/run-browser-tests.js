/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require('child_process');
const path = require('path');

const TESTS = [
  'browser-smoke-test.js',
  'chat-interaction-test.js',
  'ui-smoke-test.js',
  'iteration2-puppeteer-test.js',
  'compare-llms-puppeteer-test.js',
];

for (const test of TESTS) {
  const result = spawnSync(process.execPath, [path.join(__dirname, test)], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
