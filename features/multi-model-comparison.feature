Feature: Multi-model comparison

  Scenario: User submits one prompt and receives multiple responses
    Given I am on the chat page
    When I enter "Hello" into the prompt field
    And I click the submit button
    Then I should see a response from "LLAMA 3.2"
    And I should see a response from "GEMMA 3"