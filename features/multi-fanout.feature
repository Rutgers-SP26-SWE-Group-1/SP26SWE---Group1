@multi @multi2
Feature: Parallel fan-out to selected local models (Feature 2, parthaped)
  As a user
  I want my single prompt to be sent to every model I selected at once
  So that I get one answer per model in a single round trip

  Background:
    Given the user is on the multi-LLM compare page

  Scenario: One prompt produces one card per selected model
    Given the user has 3 local models selected
    When the user submits the prompt "Give me a one-line definition of recursion."
    Then the response grid should contain 3 model cards
    And every visible model card should show a model label

  Scenario: Each card is labelled with the local model that produced it
    Given the user has 2 local models selected
    When the user submits the prompt "Reply with the single word OK."
    Then the response grid should contain 2 model cards
    And the response cards should be labelled with their respective local models

  Scenario: A failure in one model does not block the others
    Given the user has 3 local models selected including an invalid one
    When the user submits the prompt "Reply with OK."
    Then at least 2 model cards should display content
    And at least 1 model card should display an error
