//! Storage Module
//!
//! TerminusDBへのRDF書き込みモジュール。

use anyhow::Result;
use crate::kg::terminus::TerminusClient;
use crate::pipeline::analyzer::AnalysisResult;
use crate::pipeline::collector::CollectedData;
use uuid::Uuid;

/// Storage
///
/// TerminusDBへのRDF書き込みを行う。
pub struct Storage {
    kg_client: TerminusClient,
}

impl Storage {
    /// Create new storage
    pub fn new(kg_client: TerminusClient) -> Self {
        Self { kg_client }
    }

    /// Store analysis results as RDF
    ///
    /// 分析結果をRDFとして保存する。
    pub async fn store_analysis(
        &self,
        person_uri: &str,
        media_capture_uri: &str,
        analysis_result: &AnalysisResult,
    ) -> Result<String> {
        let analysis_id = Uuid::new_v4();
        let analysis_uri = format!("https://spirit-in-physics.gftd.ai/emotion-analysis/{}", analysis_id);

        // Generate RDF triples
        let triples = format!(
            r#"
            <{}> rdf:type ex:EmotionAnalysis ;
                ex:analyzedAt "{}"^^xsd:dateTime ;
                ex:analyzedFrom <{}> ;
                ex:analyzedFor <{}> ;
                ex:emotionDimensions "{}" .
            "#,
            analysis_uri,
            analysis_result.timestamp.to_rfc3339(),
            media_capture_uri,
            person_uri,
            analysis_result.emotion_dimensions.to_json()
        );

        // TODO: Insert triples into TerminusDB
        // For now, just return the URI
        Ok(analysis_uri)
    }

    /// Store media capture as RDF
    ///
    /// メディアキャプチャをRDFとして保存する。
    pub async fn store_media_capture(
        &self,
        collected_data: &CollectedData,
    ) -> Result<String> {
        let capture_id = Uuid::new_v4();
        let capture_uri = format!("https://spirit-in-physics.gftd.ai/media-capture/{}", capture_id);

        let source_str = match collected_data.source {
            crate::pipeline::collector::DataSource::Screen => "screen",
            crate::pipeline::collector::DataSource::Camera => "camera",
            crate::pipeline::collector::DataSource::Microphone => "microphone",
            crate::pipeline::collector::DataSource::File => "file",
        };

        let capture_type = if collected_data.image_data.is_some() {
            if collected_data.audio_data.is_some() {
                "camera"
            } else {
                "screen"
            }
        } else {
            "audio"
        };

        // Generate RDF triples
        let triples = format!(
            r#"
            <{}> rdf:type ex:MediaCapture ;
                ex:captureType "{}" ;
                ex:source "{}" ;
                ex:capturedAt "{}"^^xsd:dateTime .
            "#,
            capture_uri,
            capture_type,
            source_str,
            collected_data.timestamp.to_rfc3339()
        );

        // TODO: Insert triples into TerminusDB
        // For now, just return the URI
        Ok(capture_uri)
    }

    /// Store face detection as RDF
    ///
    /// 顔検出結果をRDFとして保存する。
    pub async fn store_face_detection(
        &self,
        media_capture_uri: &str,
        face_detection: &crate::emotion::face_detector::FaceDetection,
    ) -> Result<String> {
        let detection_id = Uuid::new_v4();
        let detection_uri = format!("https://spirit-in-physics.gftd.ai/face-detection/{}", detection_id);

        // Generate RDF triples
        let triples = format!(
            r#"
            <{}> rdf:type ex:FaceDetection ;
                ex:detectedAt "{}"^^xsd:dateTime ;
                ex:detectedIn <{}> ;
                ex:boundingBox "{}" ;
                ex:confidence {} .
            "#,
            detection_uri,
            chrono::Utc::now().to_rfc3339(),
            media_capture_uri,
            face_detection.bounding_box.to_json(),
            face_detection.confidence
        );

        // TODO: Insert triples into TerminusDB
        // For now, just return the URI
        Ok(detection_uri)
    }
}

