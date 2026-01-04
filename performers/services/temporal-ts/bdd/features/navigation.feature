Feature: Participant Navigation
  As a researcher
  I want to navigate from the participant list to the analysis page
  So that I can view the visualization results for a specific participant

  Scenario: Navigate to participant analysis
    Given I am on the researcher dashboard
    And I see a list of participants
    When I click on a participant ID "144b325f-5966-4d59-a629-f2ca421388cc"
    Then I should be navigated to the analysis page for "144b325f-5966-4d59-a629-f2ca421388cc"
    And I should see the timeline visualization

