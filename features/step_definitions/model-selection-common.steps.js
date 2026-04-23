const { Given } = require('@cucumber/cucumber');

Given('the user has selected three models', function () {
  console.log('Given the user has selected three models');
  this.selectedModels = ['mistral', 'llama3.1', 'deepseek'];
});
