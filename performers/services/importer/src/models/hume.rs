use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Common emotion fields for all HumeAI CSV types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HumeEmotionScores {
    pub admiration: Option<f64>,
    pub adoration: Option<f64>,
    #[serde(rename = "aesthetic_appreciation")]
    pub aesthetic_appreciation: Option<f64>,
    pub amusement: Option<f64>,
    pub anger: Option<f64>,
    pub anxiety: Option<f64>,
    pub awe: Option<f64>,
    pub awkwardness: Option<f64>,
    pub boredom: Option<f64>,
    pub calmness: Option<f64>,
    pub concentration: Option<f64>,
    pub contemplation: Option<f64>,
    pub confusion: Option<f64>,
    pub contempt: Option<f64>,
    pub contentment: Option<f64>,
    pub craving: Option<f64>,
    pub determination: Option<f64>,
    pub disappointment: Option<f64>,
    pub disgust: Option<f64>,
    pub distress: Option<f64>,
    pub doubt: Option<f64>,
    pub ecstasy: Option<f64>,
    pub embarrassment: Option<f64>,
    #[serde(rename = "empathic_pain")]
    pub empathic_pain: Option<f64>,
    pub entrancement: Option<f64>,
    pub envy: Option<f64>,
    pub excitement: Option<f64>,
    pub fear: Option<f64>,
    pub guilt: Option<f64>,
    pub horror: Option<f64>,
    pub interest: Option<f64>,
    pub joy: Option<f64>,
    pub love: Option<f64>,
    pub nostalgia: Option<f64>,
    pub pain: Option<f64>,
    pub pride: Option<f64>,
    pub realization: Option<f64>,
    pub relief: Option<f64>,
    pub romance: Option<f64>,
    pub sadness: Option<f64>,
    pub satisfaction: Option<f64>,
    pub desire: Option<f64>,
    pub shame: Option<f64>,
    #[serde(rename = "surprise_negative")]
    pub surprise_negative: Option<f64>,
    #[serde(rename = "surprise_positive")]
    pub surprise_positive: Option<f64>,
    pub sympathy: Option<f64>,
    pub tiredness: Option<f64>,
    pub triumph: Option<f64>,
}

impl HumeEmotionScores {
    /// Convert to a HashMap for easier processing
    pub fn to_map(&self) -> HashMap<String, f64> {
        let mut map = HashMap::new();
        
        macro_rules! insert_if_some {
            ($field:ident, $name:expr) => {
                if let Some(val) = self.$field {
                    map.insert($name.to_string(), val);
                }
            };
        }
        
        insert_if_some!(admiration, "admiration");
        insert_if_some!(adoration, "adoration");
        insert_if_some!(aesthetic_appreciation, "aesthetic_appreciation");
        insert_if_some!(amusement, "amusement");
        insert_if_some!(anger, "anger");
        insert_if_some!(anxiety, "anxiety");
        insert_if_some!(awe, "awe");
        insert_if_some!(awkwardness, "awkwardness");
        insert_if_some!(boredom, "boredom");
        insert_if_some!(calmness, "calmness");
        insert_if_some!(concentration, "concentration");
        insert_if_some!(contemplation, "contemplation");
        insert_if_some!(confusion, "confusion");
        insert_if_some!(contempt, "contempt");
        insert_if_some!(contentment, "contentment");
        insert_if_some!(craving, "craving");
        insert_if_some!(determination, "determination");
        insert_if_some!(disappointment, "disappointment");
        insert_if_some!(disgust, "disgust");
        insert_if_some!(distress, "distress");
        insert_if_some!(doubt, "doubt");
        insert_if_some!(ecstasy, "ecstasy");
        insert_if_some!(embarrassment, "embarrassment");
        insert_if_some!(empathic_pain, "empathic_pain");
        insert_if_some!(entrancement, "entrancement");
        insert_if_some!(envy, "envy");
        insert_if_some!(excitement, "excitement");
        insert_if_some!(fear, "fear");
        insert_if_some!(guilt, "guilt");
        insert_if_some!(horror, "horror");
        insert_if_some!(interest, "interest");
        insert_if_some!(joy, "joy");
        insert_if_some!(love, "love");
        insert_if_some!(nostalgia, "nostalgia");
        insert_if_some!(pain, "pain");
        insert_if_some!(pride, "pride");
        insert_if_some!(realization, "realization");
        insert_if_some!(relief, "relief");
        insert_if_some!(romance, "romance");
        insert_if_some!(sadness, "sadness");
        insert_if_some!(satisfaction, "satisfaction");
        insert_if_some!(desire, "desire");
        insert_if_some!(shame, "shame");
        insert_if_some!(surprise_negative, "surprise_negative");
        insert_if_some!(surprise_positive, "surprise_positive");
        insert_if_some!(sympathy, "sympathy");
        insert_if_some!(tiredness, "tiredness");
        insert_if_some!(triumph, "triumph");
        
        map
    }
}

// Face CSV structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HumeFaceData {
    pub id: String,
    pub frame: Option<u32>,
    pub time: f64, // seconds
    pub probability: Option<f64>,
    // Face detection bounding box
    pub face_x0: Option<f64>,
    pub face_y0: Option<f64>,
    pub face_width: Option<f64>,
    pub face_height: Option<f64>,
    // Emotion scores (using the common structure)
    #[serde(flatten)]
    pub emotions: HumeEmotionScores,
    // Action Units (AU) - many fields, we'll use a flexible approach
    // For now, we'll parse these dynamically from CSV
}

// Prosody CSV structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HumeProsodyData {
    pub id: String,
    pub text: Option<String>,
    #[serde(rename = "BeginTime")]
    pub begin_time: f64, // seconds
    #[serde(rename = "EndTime")]
    pub end_time: f64, // seconds
    pub confidence: Option<f64>,
    #[serde(rename = "SpeakerConfidence")]
    pub speaker_confidence: Option<f64>,
    // Emotion scores
    #[serde(flatten)]
    pub emotions: HumeEmotionScores,
}

// Language CSV structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HumeLanguageData {
    pub id: String,
    pub text: Option<String>,
    #[serde(rename = "BeginPosition")]
    pub begin_position: Option<u32>,
    #[serde(rename = "EndPosition")]
    pub end_position: Option<u32>,
    #[serde(rename = "BeginTime")]
    pub begin_time: f64, // seconds
    #[serde(rename = "EndTime")]
    pub end_time: f64, // seconds
    pub confidence: Option<f64>,
    #[serde(rename = "SpeakerConfidence")]
    pub speaker_confidence: Option<f64>,
    // Emotion scores
    #[serde(flatten)]
    pub emotions: HumeEmotionScores,
}

// Burst CSV structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HumeBurstData {
    pub id: String,
    #[serde(rename = "BeginTime")]
    pub begin_time: f64, // seconds
    #[serde(rename = "EndTime")]
    pub end_time: f64, // seconds
    // Emotion scores
    #[serde(flatten)]
    pub emotions: HumeEmotionScores,
}

