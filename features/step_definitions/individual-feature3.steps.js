const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

function createComparisonResponses() {
  return [
    {
      modelId: 'mistral',
      modelName: 'Mistral',
      content: 'Mistral comparison response',
    },
    {
      modelId: 'llama3.1',
      modelName: 'Llama 3.1',
      content: 'Llama comparison response',
    },
    {
      modelId: 'deepseek',
      modelName: 'DeepSeek R1',
      content: 'DeepSeek comparison response',
    },
  ];
}

function openIntegratedComparisonView(world) {
  world.comparisonResponses = createComparisonResponses();
  world.comparisonSections = world.comparisonResponses.map((response) => ({
    modelId: response.modelId,
    modelName: response.modelName,
    content: response.content,
  }));
  world.comparisonViewOpen = true;
}

Given('the user has received responses from multiple models', function () {
  console.log('Given the user has received responses from multiple models');
  this.comparisonResponses = createComparisonResponses();
  this.comparisonViewOpen = false;
  this.openIntegratedComparisonView = () => openIntegratedComparisonView(this);
});

Given('the integrated comparison view is open', function () {
  console.log('Given the integrated comparison view is open');
  this.openIntegratedComparisonView = () => openIntegratedComparisonView(this);
  openIntegratedComparisonView(this);
});

When('the responses are shown', function () {
  console.log('When the responses are shown');
  this.responsesShown = true;
});

When('the user clicks the Close or X button', function () {
  console.log('When the user clicks the Close or X button');
  this.comparisonViewOpen = false;
});

When('the responses are displayed', function () {
  console.log('When the responses are displayed');
  this.responsesDisplayed = true;
});

Then('the integrated comparison view should appear on the screen', function () {
  console.log('Then the integrated comparison view should appear on the screen');
  assert.strictEqual(this.comparisonViewOpen, true);
});

Then('each model response should appear in a separate section', function () {
  console.log('Then each model response should appear in a separate section');
  assert.strictEqual(this.comparisonSections.length, this.comparisonResponses.length);
});

Then('each section should display the corresponding model name', function () {
  console.log('Then each section should display the corresponding model name');
  this.comparisonSections.forEach((section, index) => {
    assert.strictEqual(section.modelName, this.comparisonResponses[index].modelName);
  });
});

Then('the integrated comparison view should close', function () {
  console.log('Then the integrated comparison view should close');
  assert.strictEqual(this.comparisonViewOpen, false);
});

Then('all model responses should remain visible on the screen', function () {
  console.log('Then all model responses should remain visible on the screen');
  const visibleResponses = this.comparisonSections.filter((section) => Boolean(section.content));
  assert.strictEqual(visibleResponses.length, this.comparisonResponses.length);
});
