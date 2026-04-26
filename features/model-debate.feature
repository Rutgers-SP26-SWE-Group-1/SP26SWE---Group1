Feature: Model Debate

  Scenario: User enables Debate Mode and sees the debate model panel
    Given the debate API responses are mocked
    And the user is on the chat page
    When the user enables Debate Mode
    Then the debate model panel should be visible

  Scenario: User selects multiple models, submits a debate question, and sees an Open Debate card
    Given the debate API responses are mocked
    And the user is on the chat page
    When the user enables Debate Mode
    And the user selects debate models "Gemini 2.5 Flash (Cloud)" and "Llama 3.1 (Cloud)"
    And the user submits the debate question "Which major is better, Computer Engineering or Computer Science?"
    Then the chat request should be sent in Debate Mode
    And the debate started card should appear
    And the Open Debate button should be visible

  Scenario: User opens the debate thread and asks a follow-up inside that thread
    Given the debate API responses are mocked
    And the user is on the chat page
    When the user enables Debate Mode
    And the user submits the debate question "Which major is better, Computer Engineering or Computer Science?"
    And the user opens the debate thread
    And the user asks the debate follow-up "What if I want to work in AI?"
    Then the debate follow-up request should be sent
    And the debate thread should show the follow-up answer
