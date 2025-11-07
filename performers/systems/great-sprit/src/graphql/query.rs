//! GraphQL query resolvers

use async_graphql::*;
use crate::gpu::device::GpuDevice;
use crate::kg::terminus::TerminusClient;
use crate::pipeline::aggregator::Aggregator;

/// Query root
#[derive(Default)]
pub struct Query;

#[Object]
impl Query {
    /// Health check
    async fn health(&self) -> &str {
        "ok"
    }

    /// Get GPU device info
    async fn gpu_info(&self, ctx: &Context<'_>) -> Result<String> {
        let _device = ctx.data::<GpuDevice>()?;
        Ok("GPU device available".to_string())
    }

    /// Get system metrics
    async fn metrics(&self, _ctx: &Context<'_>) -> Result<SystemMetrics> {
        Ok(SystemMetrics {
            num_samples: 0,
            step_time_ms: 0.0,
        })
    }

    /// Get emotion aggregation for a person
    async fn person_emotion_aggregation(
        &self,
        ctx: &Context<'_>,
        person_uri: String,
        start_time: Option<String>,
        end_time: Option<String>,
    ) -> Result<EmotionAggregation> {
        let kg_client = ctx.data::<TerminusClient>()?;
        let aggregator = crate::pipeline::aggregator::Aggregator::new(kg_client.clone());

        let start = start_time
            .as_ref()
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&chrono::Utc));
        let end = end_time
            .as_ref()
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&chrono::Utc));

        let result = aggregator
            .aggregate_person_emotions(&person_uri, start, end)
            .await?;

        Ok(EmotionAggregation {
            average_valence: result.average_valence,
            average_arousal: result.average_arousal,
            average_engagement: result.average_engagement,
            variance_valence: result.variance_valence,
            variance_arousal: result.variance_arousal,
            variance_engagement: result.variance_engagement,
            time_range_start: result.time_range.0.to_rfc3339(),
            time_range_end: result.time_range.1.to_rfc3339(),
            sample_count: result.sample_count,
        })
    }

    /// Get RDF triples for visualization
    async fn rdf_triples(
        &self,
        ctx: &Context<'_>,
        subject_uri: Option<String>,
        limit: Option<usize>,
    ) -> Result<Vec<RdfTriple>> {
        let kg_client = ctx.data::<TerminusClient>()?;
        
        let query = if let Some(subj) = subject_uri {
            format!(
                r#"
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                SELECT ?s ?p ?o WHERE {{
                    <{}> ?p ?o .
                    BIND(<{}> AS ?s)
                }}
                LIMIT {}
                "#,
                subj,
                subj,
                limit.unwrap_or(1000)
            )
        } else {
            format!(
                r#"
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                SELECT ?s ?p ?o WHERE {{
                    ?s ?p ?o .
                }}
                LIMIT {}
                "#,
                limit.unwrap_or(1000)
            )
        };

        let result = kg_client.query_sparql(&query).await?;
        
        // Parse SPARQL JSON result format
        let triples = parse_sparql_results(&result)?;
        
        Ok(triples)
    }

    /// Get emotion observations for visualization
    async fn emotion_observations(
        &self,
        ctx: &Context<'_>,
        person_uri: Option<String>,
        limit: Option<usize>,
    ) -> Result<Vec<EmotionObservation>> {
        let kg_client = ctx.data::<TerminusClient>()?;
        
        let query = if let Some(person) = person_uri {
            format!(
                r#"
                PREFIX ex: <https://example.org/ontology#>
                PREFIX prov: <http://www.w3.org/ns/prov#>
                SELECT ?observation ?person ?valence ?arousal ?engagement ?timestamp WHERE {{
                    ?observation ex:person <{}> ;
                                ex:valence ?valence ;
                                ex:arousal ?arousal ;
                                ex:engagement ?engagement ;
                                prov:generatedAtTime ?timestamp .
                    BIND(<{}> AS ?person)
                }}
                ORDER BY DESC(?timestamp)
                LIMIT {}
                "#,
                person,
                person,
                limit.unwrap_or(100)
            )
        } else {
            format!(
                r#"
                PREFIX ex: <https://example.org/ontology#>
                PREFIX prov: <http://www.w3.org/ns/prov#>
                SELECT ?observation ?person ?valence ?arousal ?engagement ?timestamp WHERE {{
                    ?observation ex:person ?person ;
                                ex:valence ?valence ;
                                ex:arousal ?arousal ;
                                ex:engagement ?engagement ;
                                prov:generatedAtTime ?timestamp .
                }}
                ORDER BY DESC(?timestamp)
                LIMIT {}
                "#,
                limit.unwrap_or(100)
            )
        };

        let result = kg_client.query_sparql(&query).await?;
        
        // Parse SPARQL results
        let observations = parse_emotion_observations(&result)?;
        
        Ok(observations)
    }
}

/// System metrics
#[derive(SimpleObject)]
pub struct SystemMetrics {
    pub num_samples: usize,
    pub step_time_ms: f32,
}

/// Emotion aggregation result
#[derive(SimpleObject)]
pub struct EmotionAggregation {
    pub average_valence: f32,
    pub average_arousal: f32,
    pub average_engagement: f32,
    pub variance_valence: f32,
    pub variance_arousal: f32,
    pub variance_engagement: f32,
    pub time_range_start: String,
    pub time_range_end: String,
    pub sample_count: usize,
}

/// RDF triple for visualization
#[derive(SimpleObject)]
pub struct RdfTriple {
    pub subject: String,
    pub predicate: String,
    pub object: String,
}

/// Emotion observation for visualization
#[derive(SimpleObject)]
pub struct EmotionObservation {
    pub observation_uri: String,
    pub person_uri: String,
    pub valence: f32,
    pub arousal: f32,
    pub engagement: f32,
    pub timestamp: String,
}

/// Parse SPARQL JSON results into RDF triples
fn parse_sparql_results(json: &serde_json::Value) -> Result<Vec<RdfTriple>> {
    let mut triples = Vec::new();
    
    // TerminusDB SPARQL result format: {"bindings": [{"s": {"value": "..."}, "p": {...}, "o": {...}}]}
    if let Some(bindings) = json.get("bindings").and_then(|b| b.as_array()) {
        for binding in bindings {
            if let (Some(s), Some(p), Some(o)) = (
                binding.get("s").and_then(|v| v.get("value")).and_then(|v| v.as_str()),
                binding.get("p").and_then(|v| v.get("value")).and_then(|v| v.as_str()),
                binding.get("o").and_then(|v| v.get("value")).and_then(|v| v.as_str()),
            ) {
                triples.push(RdfTriple {
                    subject: s.to_string(),
                    predicate: p.to_string(),
                    object: o.to_string(),
                });
            }
        }
    }
    
    Ok(triples)
}

/// Parse SPARQL JSON results into emotion observations
fn parse_emotion_observations(json: &serde_json::Value) -> Result<Vec<EmotionObservation>> {
    let mut observations = Vec::new();
    
    if let Some(bindings) = json.get("bindings").and_then(|b| b.as_array()) {
        for binding in bindings {
            let observation_uri = binding
                .get("observation")
                .and_then(|v| v.get("value"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            
            let person_uri = binding
                .get("person")
                .and_then(|v| v.get("value"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            
            let valence = binding
                .get("valence")
                .and_then(|v| v.get("value"))
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse::<f32>().ok())
                .unwrap_or(0.0);
            
            let arousal = binding
                .get("arousal")
                .and_then(|v| v.get("value"))
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse::<f32>().ok())
                .unwrap_or(0.0);
            
            let engagement = binding
                .get("engagement")
                .and_then(|v| v.get("value"))
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse::<f32>().ok())
                .unwrap_or(0.0);
            
            let timestamp = binding
                .get("timestamp")
                .and_then(|v| v.get("value"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            
            observations.push(EmotionObservation {
                observation_uri,
                person_uri,
                valence,
                arousal,
                engagement,
                timestamp,
            });
        }
    }
    
    Ok(observations)
}

