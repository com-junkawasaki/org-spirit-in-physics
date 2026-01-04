Feature: Participant Specific Analysis
  As a researcher
  I want to view the analysis page for a specific participant
  So that I can verify the visualization for their data

  Scenario: View analysis for participant e41a9cd2-d803-49a8-9020-0260e55cd03e
    Given I am on the researcher dashboard with test mode enabled
    When I navigate directly to the analysis page for "e41a9cd2-d803-49a8-9020-0260e55cd03e"
    Then I should see the participant ID "e41a9cd2-d803-49a8-9020-0260e55cd03e" in the header
    And I should see the timeline visualization container

