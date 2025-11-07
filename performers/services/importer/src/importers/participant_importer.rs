use diesel::prelude::*;
use uuid::Uuid;
use anyhow::{Result, Context};
use serde_json::{json, Value as JsonValue};

use crate::db::{DbConnection, schema::participants};
use crate::models::ConsentData;

/// Get or create participant by ID
pub fn get_or_create_participant(
    conn: &mut DbConnection,
    participant_id: &str,
) -> Result<Uuid> {
    let uuid_id = Uuid::parse_str(participant_id)
        .with_context(|| format!("Invalid participant ID format: {}", participant_id))?;

    // Try to find existing participant
    let existing: Option<Uuid> = participants::table
        .select(participants::id)
        .filter(participants::id.eq(uuid_id))
        .first::<Uuid>(conn)
        .optional()
        .context("Failed to query participants")?;

    if let Some(id) = existing {
        return Ok(id);
    }

    // Create new participant
    diesel::insert_into(participants::table)
        .values(participants::id.eq(uuid_id))
        .execute(conn)
        .context("Failed to insert participant")?;

    Ok(uuid_id)
}

/// Import consent data
pub fn import_consent(
    conn: &mut DbConnection,
    participant_id: Uuid,
    consent: &ConsentData,
) -> Result<Uuid> {
    use crate::db::schema::participant_consents;

    let agreed_at = consent.agreed_at_datetime()
        .context("Failed to parse agreed_at datetime")?;

    let agreements_json: JsonValue = json!({
        "understand": consent.agreements.understand,
        "voluntary": consent.agreements.voluntary,
        "withdraw": consent.agreements.withdraw,
        "recording": consent.agreements.recording,
    });

    let consent_id = Uuid::new_v4();

    diesel::insert_into(participant_consents::table)
        .values((
            participant_consents::id.eq(consent_id),
            participant_consents::participant_id.eq(participant_id),
            participant_consents::signature.eq(&consent.signature),
            participant_consents::agreements.eq(agreements_json),
            participant_consents::agreed_at.eq(agreed_at),
        ))
        .execute(conn)
        .context("Failed to insert consent")?;

    Ok(consent_id)
}

