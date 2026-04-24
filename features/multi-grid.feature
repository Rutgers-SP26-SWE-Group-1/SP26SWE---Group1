@multi @multi3
Feature: Side-by-side comparison grid (Feature 3, parthaped)
  As a user
  I want every model's answer rendered in its own card on one screen
  So that I can compare responses without flipping between tabs

  Background:
    Given the user is on the multi-LLM compare page

  Scenario: The grid renders one column per model on smaller selections
    Given the user has 2 local models selected
    When the user submits the prompt "Reply with OK."
    Then the response grid should contain 2 model cards
    And every model card should show a model label

  Scenario: The grid stays visible after the answer arrives
    Given the user has 2 local models selected
    When the user submits the prompt "Reply with OK."
    Then the response grid should remain visible after responses arrive

  Scenario: Clearing the transcript empties the grid
    Given the user has 2 local models selected
    When the user submits the prompt "Reply with OK."
    And the user clicks the clear-transcript button
    Then the response grid should no longer be visible
