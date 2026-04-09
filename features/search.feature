Feature: Chat Search
  As a student
  I want to search my previous conversations
  So that I can quickly find answers I received earlier

  Scenario: Filtering chats by title
    Given I have previous chats titled "Calculus Homework" and "Physics Notes"
    And I am on the Chat Hub page
    When I click the magnifying glass icon
    And I type "Calculus" into the search bar
    Then I should see "Calculus Homework" in the history list
    And I should not see "Physics Notes"