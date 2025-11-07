//! Aggregator Module
//!
//! 時系列集計・統計分析モジュール。

use anyhow::Result;
use crate::kg::terminus::TerminusClient;
use crate::emotion::hume_dimensions::EmotionDimensions;

/// Aggregation result
///
/// 集計結果。
#[derive(Debug, Clone)]
pub struct AggregationResult {
    pub average_valence: f32,
    pub average_arousal: f32,
    pub average_engagement: f32,
    pub variance_valence: f32,
    pub variance_arousal: f32,
    pub variance_engagement: f32,
    pub time_range: (chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>),
    pub sample_count: usize,
}

/// Aggregator
///
/// 時系列集計・統計分析を行う。
pub struct Aggregator {
    kg_client: TerminusClient,
}

impl Aggregator {
    /// Create new aggregator
    pub fn new(kg_client: TerminusClient) -> Self {
        Self { kg_client }
    }

    /// Aggregate emotion observations for a person
    ///
    /// 人物の感情観測を集計する。
    pub async fn aggregate_person_emotions(
        &self,
        person_uri: &str,
        start_time: Option<chrono::DateTime<chrono::Utc>>,
        end_time: Option<chrono::DateTime<chrono::Utc>>,
    ) -> Result<AggregationResult> {
        // Query emotion observations for the person
        let query = format!(
            r#"
            PREFIX ex: <https://spirit-in-physics.gftd.ai/ontology#>
            SELECT ?analysis ?dimensions ?timestamp WHERE {{
                ?analysis rdf:type ex:EmotionAnalysis ;
                    ex:analyzedFor <{}> ;
                    ex:emotionDimensions ?dimensions ;
                    ex:analyzedAt ?timestamp .
                {}
                {}
            }}
            ORDER BY ?timestamp
            "#,
            person_uri,
            if let Some(start) = start_time {
                format!("FILTER(?timestamp >= \"{}\"^^xsd:dateTime)", start.to_rfc3339())
            } else {
                String::new()
            },
            if let Some(end) = end_time {
                format!("FILTER(?timestamp <= \"{}\"^^xsd:dateTime)", end.to_rfc3339())
            } else {
                String::new()
            }
        );

        // TODO: Execute SPARQL query and parse results
        // For now, return placeholder
        Ok(AggregationResult {
            average_valence: 0.0,
            average_arousal: 0.5,
            average_engagement: 0.5,
            variance_valence: 0.0,
            variance_arousal: 0.0,
            variance_engagement: 0.0,
            time_range: (
                chrono::Utc::now() - chrono::Duration::hours(1),
                chrono::Utc::now(),
            ),
            sample_count: 0,
        })
    }

    /// Calculate statistics from emotion dimensions
    ///
    /// 感情次元から統計を計算する。
    fn calculate_statistics(emotions: &[EmotionDimensions]) -> AggregationResult {
        if emotions.is_empty() {
            return AggregationResult {
                average_valence: 0.0,
                average_arousal: 0.5,
                average_engagement: 0.5,
                variance_valence: 0.0,
                variance_arousal: 0.0,
                variance_engagement: 0.0,
                time_range: (chrono::Utc::now(), chrono::Utc::now()),
                sample_count: 0,
            };
        }

        let n = emotions.len() as f32;
        
        let avg_valence = emotions.iter().map(|e| e.valence).sum::<f32>() / n;
        let avg_arousal = emotions.iter().map(|e| e.arousal).sum::<f32>() / n;
        let avg_engagement = emotions.iter().map(|e| e.engagement).sum::<f32>() / n;

        let var_valence = emotions.iter()
            .map(|e| (e.valence - avg_valence).powi(2))
            .sum::<f32>() / n;
        let var_arousal = emotions.iter()
            .map(|e| (e.arousal - avg_arousal).powi(2))
            .sum::<f32>() / n;
        let var_engagement = emotions.iter()
            .map(|e| (e.engagement - avg_engagement).powi(2))
            .sum::<f32>() / n;

        AggregationResult {
            average_valence: avg_valence,
            average_arousal: avg_arousal,
            average_engagement: avg_engagement,
            variance_valence: var_valence,
            variance_arousal: var_arousal,
            variance_engagement: var_engagement,
            time_range: (chrono::Utc::now() - chrono::Duration::hours(1), chrono::Utc::now()),
            sample_count: emotions.len(),
        }
    }
}

