import { NextRequest, NextResponse } from 'next/server'

// Mock correlation analysis data
// In a real implementation, this would call the IntegratedDataPipeline
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const participantId = params.id

    // Mock physiological-emotion correlation data
    const mockCorrelationData = {
      physiological_file: '2025-07-31(16h7m-16h31m)-naesaito.CSV',
      correlation_analysis: {
        'session_1': {
          session_id: 'session_1',
          pearson_correlations: {
            'joy': 0.45,
            'sadness': -0.32,
            'anger': 0.67,
            'fear': 0.23,
            'surprise': 0.12
          },
          spearman_correlations: {
            'joy': 0.42,
            'sadness': -0.35,
            'anger': 0.71,
            'fear': 0.19,
            'surprise': 0.15
          },
          correlation_strength: {
            'joy': 'moderate',
            'sadness': 'moderate',
            'anger': 'strong',
            'fear': 'weak',
            'surprise': 'weak'
          },
          physiological_emotion_pairs: [
            {
              physiological_indicator: 'gsr',
              emotion_type: 'anger',
              pearson_r: 0.67,
              spearman_rho: 0.71,
              strength: 'strong',
              data_points: 150
            },
            {
              physiological_indicator: 'gsr',
              emotion_type: 'joy',
              pearson_r: 0.45,
              spearman_rho: 0.42,
              strength: 'moderate',
              data_points: 150
            }
          ]
        }
      },
      time_windowed_analysis: {
        'session_1': {
          session_id: 'session_1',
          window_size_seconds: 30,
          sliding_windows: [
            {
              emotion_type: 'anger',
              window_start_ms: 0,
              window_end_ms: 30000,
              correlation: 0.65,
              sample_count: 30
            },
            {
              emotion_type: 'joy',
              window_start_ms: 5000,
              window_end_ms: 35000,
              correlation: 0.48,
              sample_count: 30
            }
          ],
          peak_correlation_periods: [
            {
              rank: 1,
              emotion_type: 'anger',
              correlation: 0.67,
              time_period: '0.0s - 30.0s',
              sample_count: 30
            }
          ]
        }
      },
      physiological_indicators: {
        total_samples: 180,
        indicators: {
          gsr: {
            mean: 2.34,
            std: 0.67,
            min: 1.2,
            max: 4.1,
            median: 2.3,
            count: 180
          }
        },
        variability: {
          gsr: {
            coefficient_of_variation: 0.29,
            range: 2.9,
            iqr: 0.8
          }
        },
        time_series_stats: {
          duration_ms: 180000,
          sampling_rate_hz: 1.0
        }
      },
      emotion_categories: {
        total_sessions: 1,
        emotion_types_analyzed: ['joy', 'sadness', 'anger', 'fear', 'surprise'],
        correlation_distribution: {
          very_strong: 1,
          strong: 0,
          moderate: 2,
          weak: 2,
          very_weak: 0
        },
        top_correlations: [
          {
            physiological_indicator: 'gsr',
            emotion_type: 'anger',
            pearson_r: 0.67,
            spearman_rho: 0.71,
            strength: 'strong',
            data_points: 150
          }
        ],
        emotion_category_summary: {
          anger: {
            pair_count: 1,
            avg_pearson: 0.67,
            avg_spearman: 0.71,
            strength_distribution: {
              very_strong: 1,
              strong: 0,
              moderate: 0,
              weak: 0,
              very_weak: 0
            }
          },
          joy: {
            pair_count: 1,
            avg_pearson: 0.45,
            avg_spearman: 0.42,
            strength_distribution: {
              very_strong: 0,
              strong: 0,
              moderate: 1,
              weak: 0,
              very_weak: 0
            }
          }
        }
      },
      significant_findings: [
        {
          type: 'strong_correlation',
          rank: 1,
          description: 'gsr と anger の相関 (r=0.670)',
          significance: 'high',
          data_points: 150
        },
        {
          type: 'correlation_pattern',
          description: '1 つの非常に強い相関関係を検出',
          significance: 'high'
        },
        {
          type: 'temporal_pattern',
          description: '時間帯 0.0s - 30.0s に最も強い相関 (r=0.67) を検出',
          significance: 'moderate'
        }
      ]
    }

    return NextResponse.json(mockCorrelationData)
  } catch (error) {
    console.error('Error fetching participant correlation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch participant correlation data' },
      { status: 500 }
    )
  }
}
