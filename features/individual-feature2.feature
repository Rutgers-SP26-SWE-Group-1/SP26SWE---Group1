Feature: Multi-Model Responses

  Scenario: User submits a question to multiple selected models
    Given the user has selected three models
    When the user enters a question and clicks the Send button
    Then the system sends the question to all selected models

  Scenario: All selected models generate responses
    Given the user has selected three models
    When the user submits a question
    Then the system generates a response from each selected model

  Scenario: Responses are labeled by model name
    Given the user has selected multiple models
    When the system displays the responses
    Then each response should show the name of the model that generated it

  Scenario: Responses appear together on the screen
    Given the user has selected multiple models
    When the user submits a question
    Then all responses should be displayed at the same time
