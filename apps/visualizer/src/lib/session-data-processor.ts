// Simplified version for the visualizer app
// In a real implementation, this would integrate with the full SessionDataProcessor

export class SessionDataProcessor {
  static async getTimelineData(participantId: string) {
    // Mock implementation - in reality this would call the analyzer API
    return {
      session_info: {
        participant_id: participantId,
        total_events: 1004,
        duration_ms: 1414400,
        word_count: 199,
        avg_response_time_ms: 2500
      },
      event_analysis: {
        event_types: {
          word_displayed: 199,
          speech_detected: 150,
          response_window_opened: 199,
          participant_initialized: 1
        },
        word_frequency: {
          'インク': 2, 'ノート': 2, '家': 2, '嬉しい': 2, '花嫁': 2
        },
        time_distribution: {
          '0-1min': 0,
          '1-5min': 15,
          '5-10min': 50,
          '10-20min': 99,
          '20min+': 35
        }
      }
    }
  }
}
