Feature: Workspace Organization
  Scenario: Pinning a Conversation
    Given I have a conversation titled "New Chat"
    When I pin the conversation
    Then the conversation should be marked as pinned