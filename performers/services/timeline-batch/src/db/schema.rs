// @generated automatically by Diesel CLI.

pub mod sql_types {
    #[derive(diesel::query_builder::QueryId, diesel::sql_types::SqlType)]
    #[diesel(postgres_type(name = "session_type"))]
    pub struct SessionType;
}

diesel::table! {
    emotion_data (id) {
        id -> Uuid,
        participant_response_data_id -> Uuid,
        emotion_name -> Text,
        score -> Float8,
        file_type -> Nullable<Text>,
        timestamp -> Timestamptz,
        created_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    participant_analysis_results (id) {
        id -> Uuid,
        participant_id -> Uuid,
        stimulus_word -> Text,
        response_word -> Nullable<Text>,
        p_value -> Nullable<Float8>,
        word2vec_component -> Nullable<Float8>,
        reaction_time_component -> Nullable<Float8>,
        skin_potential_component -> Nullable<Float8>,
        emotion_component -> Nullable<Float8>,
        emotion_data -> Nullable<Text>,
        physiological_data -> Nullable<Text>,
        created_at -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    participant_consents (id) {
        id -> Uuid,
        participant_id -> Uuid,
        signature -> Text,
        agreements -> Text,
        agreed_at -> Timestamptz,
        created_at -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    use diesel::sql_types::*;
    use super::sql_types::SessionType;

    participant_experiment_sessions (id) {
        id -> Uuid,
        participant_id -> Uuid,
        session_type -> SessionType,
        start_time -> Nullable<Timestamptz>,
        end_time -> Nullable<Timestamptz>,
        created_at -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    participant_response_data (id) {
        id -> Uuid,
        participant_id -> Uuid,
        experiment_id -> Nullable<Uuid>,
        word_stimulus_id -> Nullable<Int4>,
        stimulus_word -> Text,
        response_word -> Nullable<Text>,
        reaction_time_ms -> Nullable<Int4>,
        session -> Nullable<Text>,
        timestamp -> Timestamptz,
        audio_file_path -> Nullable<Text>,
        video_file_path -> Nullable<Text>,
        skin_potential -> Nullable<Float8>,
        emotion -> Nullable<Text>,
        emotion_confidence -> Nullable<Float8>,
        created_at -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    participant_session_events (id) {
        id -> Uuid,
        participant_id -> Uuid,
        session_id -> Uuid,
        event_type -> Text,
        timestamp -> Timestamptz,
        payload -> Nullable<Jsonb>,
        created_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    participant_timeline_batch_jobs (id) {
        id -> Uuid,
        participant_id -> Uuid,
        status -> Text,
        progress -> Nullable<Int4>,
        started_at -> Nullable<Timestamptz>,
        completed_at -> Nullable<Timestamptz>,
        error_message -> Nullable<Text>,
        metadata -> Nullable<Jsonb>,
        created_at -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    participant_timeline_cache (participant_id) {
        participant_id -> Uuid,
        timeline_data -> Jsonb,
        metadata -> Jsonb,
        data_version -> Int4,
        last_response_timestamp -> Nullable<Timestamptz>,
        computed_at -> Timestamptz,
        created_at -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    participants (id) {
        id -> Uuid,
        age -> Nullable<Int4>,
        gender -> Nullable<Text>,
        handedness -> Nullable<Text>,
        created_at -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    physiological_data (id) {
        id -> Uuid,
        participant_response_data_id -> Uuid,
        average -> Nullable<Float8>,
        max_value -> Nullable<Float8>,
        min_value -> Nullable<Float8>,
        timestamp -> Timestamptz,
        created_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    visualization_results (id) {
        id -> Uuid,
        participant_id -> Uuid,
        visualization_type -> Text,
        method -> Nullable<Text>,
        embedding_method -> Nullable<Text>,
        dimensions -> Nullable<Int4>,
        result_data -> Jsonb,
        metadata -> Nullable<Jsonb>,
        created_at -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    word_stimuli (id) {
        id -> Int4,
        word -> Text,
        created_at -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
    }
}

diesel::joinable!(emotion_data -> participant_response_data (participant_response_data_id));
diesel::joinable!(participant_analysis_results -> participants (participant_id));
diesel::joinable!(participant_consents -> participants (participant_id));
diesel::joinable!(participant_experiment_sessions -> participants (participant_id));
diesel::joinable!(participant_response_data -> participants (participant_id));
diesel::joinable!(participant_response_data -> word_stimuli (word_stimulus_id));
diesel::joinable!(participant_session_events -> participant_experiment_sessions (session_id));
diesel::joinable!(participant_session_events -> participants (participant_id));
diesel::joinable!(participant_timeline_batch_jobs -> participants (participant_id));
diesel::joinable!(participant_timeline_cache -> participants (participant_id));
diesel::joinable!(physiological_data -> participant_response_data (participant_response_data_id));
diesel::joinable!(visualization_results -> participants (participant_id));

diesel::allow_tables_to_appear_in_same_query!(
    emotion_data,participant_analysis_results,participant_consents,participant_experiment_sessions,participant_response_data,participant_session_events,participant_timeline_batch_jobs,participant_timeline_cache,participants,physiological_data,visualization_results,word_stimuli,);
