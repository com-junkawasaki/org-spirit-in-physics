use diesel::prelude::*;
use uuid::Uuid;
use anyhow::{Result, Context};
use serde_json::{json, Value as JsonValue};

use crate::db::DbConnection;
use crate::models::ConsentData;

/// Get or create participant by ID
pub fn get_or_create_participant(
    conn: &mut DbConnection,
    participant_id: &str,
) -> Result<Uuid> {
    let uuid_id = Uuid::parse_str(participant_id)
        .with_context(|| format!("Invalid participant ID format: {}", participant_id))?;

    // Try to find existing participant using raw SQL with explicit schema
    use diesel::sql_query;
    use diesel::sql_types::Uuid as SqlUuid;
    use diesel::QueryableByName;
    use diesel::RunQueryDsl;
    
    #[derive(QueryableByName)]
    struct ParticipantId {
        #[diesel(sql_type = SqlUuid, column_name = "id")]
        id: Uuid,
    }
    
    // Use raw SQL with explicit schema name to avoid schema resolution issues
    let existing: Option<Uuid> = sql_query("SELECT id FROM public.participants WHERE id = $1")
        .bind::<SqlUuid, _>(uuid_id)
        .load::<ParticipantId>(conn)
        .ok()
        .and_then(|rows| rows.first().map(|r| r.id));

    if let Some(id) = existing {
        return Ok(id);
    }

    // Create new participant using raw SQL
    sql_query("INSERT INTO public.participants (id) VALUES ($1)")
        .bind::<SqlUuid, _>(uuid_id)
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

    // Convert agreements to JSON string (agreements column is Text, not Jsonb)
    let agreements_json_str = serde_json::to_string(&json!({
        "understand": consent.agreements.understand,
        "voluntary": consent.agreements.voluntary,
        "withdraw": consent.agreements.withdraw,
        "recording": consent.agreements.recording,
    })).context("Failed to serialize agreements")?;

    let consent_id = Uuid::new_v4();

    diesel::insert_into(participant_consents::table)
        .values((
            participant_consents::id.eq(consent_id),
            participant_consents::participant_id.eq(participant_id),
            participant_consents::signature.eq(&consent.signature),
            participant_consents::agreements.eq(agreements_json_str),
            participant_consents::agreed_at.eq(agreed_at),
        ))
        .execute(conn)
        .context("Failed to insert consent")?;

    Ok(consent_id)
}

