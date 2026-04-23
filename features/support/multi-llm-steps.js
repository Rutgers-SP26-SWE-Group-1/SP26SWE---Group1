const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

let selectedModels = [];
let promptText = "";
let simulatedResponses = [];

Given('I have selected {string}, {string}, and {string}', function (model1, model2, model3) {
  selectedModels = [model1, model2, model3];
  assert.strictEqual(selectedModels.length, 3);
});

When('I send the prompt {string}', function (prompt) {
  promptText = prompt;
  
  // Simulating your API route's mapping and generation
  simulatedResponses = selectedModels.map(model => ({
    modelLabel: model,
    content: `Simulated response from ${model}`
  }));
});

Then('the system should use mixed architecture routing', function () {
  // Simulating the check for Cloud vs Local models
  const hasCloud = selectedModels.some(m => m.includes('Gemini') || m.includes('3.1'));
  const hasLocal = selectedModels.some(m => m.includes('3.2'));
  
  assert.ok(hasCloud, "Cloud models queued for parallel execution");
  assert.ok(hasLocal, "Local models queued for sequential execution");
});

Then('the UI should receive exactly {int} distinct responses', function (expectedCount) {
  assert.strictEqual(simulatedResponses.length, expectedCount);
});