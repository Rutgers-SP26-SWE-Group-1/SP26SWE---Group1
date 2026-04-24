Feature: Claude AI Chat

  Scenario: User selects Claude Sonnet 4.6 and receives a response
    Given the user is on the chat page
    When the user selects "Claude Sonnet 4.6" from the model dropdown
    And the user types "What is Rutgers?" and sends the message
    Then the AI should display a response within 30 seconds
    And the chat input field should be empty
