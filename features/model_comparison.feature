Feature: Side-by-Side Model Comparison

  Scenario: User can enable compare mode
    Given the user is on the chat page
    When the user clicks the compare toggle button
    Then two model selector dropdowns should be visible
    And the compare button should show active state

  Scenario: User can disable compare mode
    Given the user is on the chat page
    And compare mode is enabled
    When the user clicks the compare toggle button
    Then only one model selector dropdown should be visible

  Scenario: Compare mode shows two responses side by side
    Given the user is on the chat page
    And compare mode is enabled
    When the user types "What is Rutgers?" and sends the message
    Then two response columns should appear
    And each column should have a model label header
