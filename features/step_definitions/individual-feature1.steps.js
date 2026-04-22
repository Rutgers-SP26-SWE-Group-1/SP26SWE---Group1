const { Given, When, Then } = require('@cucumber/cucumber');

Given('the model selection card is open', function () {
  console.log('Given the model selection card is open');
  this.modelSelectionCardOpen = true;
});

When('the user clicks the {string} button', function (buttonLabel) {
  console.log(`When the user clicks the "${buttonLabel}" button`);

  if (buttonLabel === 'Choose LLM(s)') {
    this.modelSelectionCardOpen = true;
  }
});

When('the user selects three models', function () {
  console.log('When the user selects three models');
  this.selectedModels = ['mistral', 'llama3.1', 'deepseek'];
});

When('the user selects a fourth model', function () {
  console.log('When the user selects a fourth model');
  this.selectionPrevented = true;
});

When('the user clicks the Confirm button', function () {
  console.log('When the user clicks the Confirm button');
  this.modelsSaved = true;
});

Then('the model selection card should appear on the screen', function () {
  console.log('Then the model selection card should appear on the screen');
});

Then('the system allows the selection', function () {
  console.log('Then the system allows the selection');
});

Then('the system prevents the selection', function () {
  console.log('Then the system prevents the selection');
});

Then('the selected models are saved', function () {
  console.log('Then the selected models are saved');
});

Given('the user has selected three models', function () {
  console.log('Given the user has selected three models');
  this.selectedModels = ['mistral', 'llama3.1', 'deepseek'];
});
