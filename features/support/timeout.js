const { setDefaultTimeout } = require('@cucumber/cucumber');

// Set timeout to 30 seconds to allow browser launch and slow network loads
setDefaultTimeout(30 * 1000);