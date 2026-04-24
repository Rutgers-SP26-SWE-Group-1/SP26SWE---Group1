const { setDefaultTimeout } = require('@cucumber/cucumber');

// Intentionally named "zz-*" so it is the last support file loaded.
// The team's `timeout.js` caps steps at 30s which is fine for the existing
// search/navigation features but too tight for the parthaped multi-LLM
// scenarios, which talk to a real local Ollama daemon and therefore can
// spend 30-120s inside a single step while five models are generating
// their answers in parallel. Raising the default here keeps the team's
// shorter timeout as the baseline and only extends it for the runs that
// need it.
setDefaultTimeout(180 * 1000);
