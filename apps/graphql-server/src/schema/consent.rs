//! Consent GraphQL type
//! 
//! Merkle DAG: graphql.schema.consent
//! OWL: spirit:Consent

use async_graphql::*;
use serde_json::Value as JsonValue;

#[derive(SimpleObject, Clone, Debug)]
pub struct Consent {
    pub id: String,
    #[graphql(name = "participantId")]
    pub participant_id: String,
    pub signature: String,
    pub agreements: JsonValue,
    #[graphql(name = "agreedAt")]
    pub agreed_at: String,
    #[graphql(name = "consentVersion")]
    pub consent_version: Option<String>,
    #[graphql(name = "studyId")]
    pub study_id: Option<String>,
    #[graphql(name = "userAgent")]
    pub user_agent: Option<String>,
    #[graphql(name = "ipAddress")]
    pub ip_address: Option<String>,
    #[graphql(name = "consentText")]
    pub consent_text: Option<String>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}

impl From<JsonValue> for Consent {
    fn from(value: JsonValue) -> Self {
        Consent {
            id: value["id"]
                .as_str()
                .map(|s| s.to_string())
                .or_else(|| value["id"].as_u64().map(|v| v.to_string()))
                .unwrap_or_else(|| "".to_string()),
            participant_id: value["participant_id"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            signature: value["signature"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            agreements: value.get("agreements").cloned().unwrap_or(JsonValue::Null),
            agreed_at: value["agreed_at"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            consent_version: value["consent_version"].as_str().map(|s| s.to_string()),
            study_id: value["study_id"].as_str().map(|s| s.to_string()),
            user_agent: value["user_agent"].as_str().map(|s| s.to_string()),
            ip_address: value["ip_address"].as_str().map(|s| s.to_string()),
            consent_text: value["consent_text"].as_str().map(|s| s.to_string()),
            created_at: value["created_at"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            updated_at: value["updated_at"]
                .as_str()
                .unwrap_or("")
                .to_string(),
        }
    }
}

#[derive(InputObject)]
pub struct CreateParticipantInput {
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub handedness: Option<String>,
}

#[derive(InputObject)]
pub struct ConsentInput {
    #[graphql(name = "participantId")]
    pub participant_id: String,
    pub signature: String,
    pub agreements: JsonValue,
    #[graphql(name = "agreedAt")]
    pub agreed_at: String,
    #[graphql(name = "consentVersion")]
    pub consent_version: Option<String>,
    #[graphql(name = "studyId")]
    pub study_id: Option<String>,
    #[graphql(name = "userAgent")]
    pub user_agent: Option<String>,
    #[graphql(name = "ipAddress")]
    pub ip_address: Option<String>,
    #[graphql(name = "consentText")]
    pub consent_text: Option<String>,
    #[graphql(name = "demographicData")]
    pub demographic_data: Option<DemographicDataInput>,
}

#[derive(InputObject)]
pub struct DemographicDataInput {
    #[graphql(name = "ageGroup")]
    pub age_group: Option<i32>,
    pub gender: Option<String>,
    pub ethnicity: Option<String>,
    pub income: Option<String>,
}

