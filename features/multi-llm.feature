Feature: Multi-LLM Comparison
  As a user
  I want to select multiple LLMs simultaneously
  So that I can compare their responses side-by-side

  Scenario: Comparing three models
    Given I have selected "Gemini 1.5 Flash", "Llama 3.1", and "Llama 3.2"
    When I send the prompt "Compare computer science and electrical engineering"
    Then the system should use mixed architecture routing
    And the UI should receive exactly 3 distinct responses