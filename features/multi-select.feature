@multi @multi1
Feature: Multi-LLM dropdown selection (Feature 1, parthaped)
  As a user on the multi-LLM page
  I want to pick a small set of locally installed Ollama models from a dropdown
  So that I can decide which models will answer my next prompt

  Background:
    Given the user is on the multi-LLM compare page

  Scenario: The chip-style dropdown opens on click
    When the user clicks the local-models dropdown toggle
    Then the local-models dropdown panel should be visible
    And the dropdown counter should show 3 of 4 selected by default

  Scenario: The user can add a fourth distinct local model
    Given the local-models dropdown panel is open
    When the user toggles the "qwen2_5-3b" model
    Then the dropdown counter should show 4 of 4 selected

  Scenario: The dropdown refuses to add a fifth local model
    Given the local-models dropdown panel is open
    And the user has selected 4 local models
    When the user attempts to toggle a fifth local model
    Then the dropdown counter should still show 4 of 4 selected

  Scenario: The dropdown refuses to drop below the one-model floor
    Given the local-models dropdown panel is open
    When the user reduces the selection to a single local model
    Then the dropdown counter should show 1 of 4 selected
    And the only remaining local model should not be deselectable
