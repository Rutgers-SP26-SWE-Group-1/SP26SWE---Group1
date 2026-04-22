Feature: Model Selection

  Scenario: User opens the model selection card
    Given the user is on the chat page
    When the user clicks the "Choose LLM(s)" button
    Then the model selection card should appear on the screen

  Scenario: User selects up to three models
    Given the model selection card is open
    When the user selects three models
    Then the system allows the selection

  Scenario: User attempts to select more than three models
    Given the model selection card is open
    When the user selects a fourth model
    Then the system prevents the selection

  Scenario: User confirms selected models
    Given the user has selected three models
    When the user clicks the Confirm button
    Then the selected models are saved
