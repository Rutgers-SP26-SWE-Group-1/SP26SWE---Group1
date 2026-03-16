Feature: Landing page navigation

  Scenario: User can open the landing page
    Given the website is running
    When the user visits the landing page
    Then the landing page should load

  Scenario: User can open the signup page
    Given the website is running
    When the user visits the signup page
    Then the signup page should load