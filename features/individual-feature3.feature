Feature: Integrated Comparison View

  Scenario: User opens the integrated comparison view
    Given the user has received responses from multiple models
    When the user clicks the "Open in Integrated View" button
    Then the integrated comparison view should appear on the screen

  Scenario: Each model response appears in its own section
    Given the integrated comparison view is open
    When the system displays the responses
    Then each model response should appear in a separate section

  Scenario: Model names are displayed above each response
    Given the integrated comparison view is open
    When the responses are shown
    Then each section should display the corresponding model name

  Scenario: User closes the integrated comparison view
    Given the integrated comparison view is open
    When the user clicks the Close or X button
    Then the integrated comparison view should close

  Scenario: All responses remain visible in the comparison view
    Given the integrated comparison view is open
    When the responses are displayed
    Then all model responses should remain visible on the screen
