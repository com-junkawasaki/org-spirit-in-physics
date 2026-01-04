Feature: Timeline Analysis Visualization
  As a researcher
  I want to see integrated timeline data and AI-computed analysis
  So that I can identify patterns and gaps in participant responses

  Scenario: View integrated timeline and analysis
    Given I am on the analysis page for participant "ad96101f-a7a8-4d71-8d82-c0478975c40b"
    When the timeline data is loaded
    Then I should see the "Timeline Stream" chart
    And I should see the KPI cards for reaction metrics
    And I should see potential "Gap" highlights on the timeline
    When I switch to the "3D Space" tab
    Then I should see the 3D Force Graph
    And I should see the "Space Insight" panel with analysis results

