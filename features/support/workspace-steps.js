const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

let conversation = {};

Given('I have a conversation titled {string}', function (title) {
  conversation = { title: title, isPinned: false };
});

When('I pin the conversation', function () {
  conversation.isPinned = true;
});

Then('the conversation should be marked as pinned', function () {
  assert.strictEqual(conversation.isPinned, true);
});