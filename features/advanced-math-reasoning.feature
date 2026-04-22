Feature: Advanced Math Reasoning

  Scenario: User can enable and disable Advanced Math Reasoning
    Given the user is on the chat page
    When the user enables Step-by-Step Mode
    Then the Step-by-Step button should be highlighted red
    When the user disables Step-by-Step Mode
    Then the Step-by-Step button should be greyed out
    And Advanced Math Reasoning should not be in use

  Scenario: Step-by-Step Mode gives a structured DeepSeek math explanation
    Given the step-by-step math response is mocked
    And the user is on the chat page
    When the user enables Step-by-Step Mode
    And the user submits the math question "Solve 2x + 4 = 10"
    Then the Step-by-Step thinking state should appear
    And the structured math steps should appear
    And the final answer should be displayed
    And the Advanced Math Reasoning response should use DeepSeek R1

  Scenario: Standard chat behavior remains available when Advanced Math Reasoning is off
    Given the standard chat response is mocked
    And the user is on the chat page
    When the user selects the model "Qwen Coder"
    And the user submits the normal question "What clubs should I join at Rutgers?"
    Then the standard chat response should appear
    And the response should not use the step-by-step math format
    And the selected model should remain "Qwen Coder"
