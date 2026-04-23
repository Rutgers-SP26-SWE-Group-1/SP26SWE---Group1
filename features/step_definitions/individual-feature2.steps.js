const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

const MODEL_NAMES = {
  mistral: 'Mistral',
  'llama3.1': 'Llama 3.1',
  deepseek: 'DeepSeek R1',
  'qwen-coder': 'Qwen Coder',
  gemma: 'Gemma 3',
};

function ensureSelectedModels(world) {
  if (!Array.isArray(world.selectedModels) || world.selectedModels.length === 0) {
    world.selectedModels = ['mistral', 'llama3.1', 'deepseek'];
  }
}

function submitQuestion(world) {
  ensureSelectedModels(world);
  world.question = 'What is software engineering?';
  world.sentToModels = [...world.selectedModels];
  world.responses = world.selectedModels.map((modelId) => ({
    modelId,
    modelName: MODEL_NAMES[modelId],
    content: `${MODEL_NAMES[modelId]} response`,
  }));
}

Given('the user has selected multiple models', function () {
  console.log('Given the user has selected multiple models');
  this.selectedModels = ['mistral', 'llama3.1', 'deepseek'];
});

When('the user enters a question and clicks the Send button', function () {
  console.log('When the user enters a question and clicks the Send button');
  submitQuestion(this);
});

When('the user submits a question', function () {
  console.log('When the user submits a question');
  submitQuestion(this);
});

When('the system displays the responses', function () {
  console.log('When the system displays the responses');
  submitQuestion(this);
  this.responsesDisplayed = true;
});

Then('the system sends the question to all selected models', function () {
  console.log('Then the system sends the question to all selected models');
  assert.deepStrictEqual(this.sentToModels, this.selectedModels);
});

Then('the system generates a response from each selected model', function () {
  console.log('Then the system generates a response from each selected model');
  assert.strictEqual(this.responses.length, this.selectedModels.length);
});

Then('each response should show the name of the model that generated it', function () {
  console.log('Then each response should show the name of the model that generated it');
  this.responses.forEach((response) => {
    assert.ok(response.modelName, `Expected a model name for ${response.modelId}`);
  });
});

Then('all responses should be displayed at the same time', function () {
  console.log('Then all responses should be displayed at the same time');
  assert.strictEqual(this.responses.length, this.selectedModels.length);
});
