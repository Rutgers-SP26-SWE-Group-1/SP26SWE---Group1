Feature: Compare multiple LLM responses
  As a user
  I want to send one prompt to multiple LLMs
  So that I can compare different answers and still get useful output if one model fails

  Background:
    Given the user is on the chat page
    And the user switches to "3 LLMs" mode

  Scenario: One prompt returns 3 model responses
    Given the user has selected "Mistral", "Llama 3.2", and "Gemma 3"
    When the user types "Explain recursion simply" and sends the message
    Then the app should show 3 assistant responses
    And each response should display its model label

  Scenario: User can compare chosen models
    Given the user has selected "DeepSeek R1", "Qwen Coder", and "Gemma 3"
    When the user types "How would you solve this coding problem?" and sends the message
    Then the app should show responses from "DeepSeek R1", "Qwen Coder", and "Gemma 3"

  Scenario: One model fails but the others still respond
    Given the user has selected 3 models
    And one selected model is unavailable
    When the user types "Summarize dynamic programming" and sends the message
    Then the app should still show the available model responses
    And the failed model should show an error message
    And the chat should remain usable
