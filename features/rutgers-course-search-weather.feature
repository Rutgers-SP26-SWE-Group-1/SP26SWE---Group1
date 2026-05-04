Feature: Rutgers Course Search and Weather

  Scenario: User can search Rutgers course availability
    Given the user is on the chat page
    And the Rutgers course search response is mocked
    When the user submits a Rutgers course query
    Then the loading state should appear
    And the response should show Rutgers Course Results:
    And the response should show Course:
    And the response should show Section:
    And the response should show Time:
    And the response should show Instructor:
    And the response should show Status:

  Scenario: User can get Rutgers weather and clothing suggestions
    Given the user is on the chat page
    And the Rutgers weather response is mocked
    When the user submits a Rutgers weather query
    Then the loading state should appear
    And the response should show Rutgers Weather:
    And the response should show Location:
    And the response should show Temperature:
    And the response should show Conditions:
    And the response should show Suggested clothing:

  Scenario: User can request both Rutgers courses and weather in one prompt
    Given the user is on the chat page
    And the Rutgers course and weather responses are mocked
    When the user submits a combined Rutgers course and weather query
    Then the loading state should appear
    And the response should show Rutgers Course Results:
    And the response should show Rutgers Weather:
    And the response should show Recommendation:
    And both tool results should be rendered in the same response
