// @generated automatically by Diesel CLI.

pub mod sql_types {
    #[derive(diesel::query_builder::QueryId, diesel::sql_types::SqlType)]
    #[diesel(postgres_type(name = "gender_type"))]
    pub struct GenderType;

    #[derive(diesel::query_builder::QueryId, diesel::sql_types::SqlType)]
    #[diesel(postgres_type(name = "session_type"))]
    pub struct SessionType;
}

diesel::table! {
    analysis_cache (id) {
        id -> Uuid,
        job_id -> Uuid,
        cache_key -> Text,
        cache_value -> Nullable<Jsonb>,
        expires_at -> Nullable<Timestamptz>,
        created_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    analysis_job_dependencies (id) {
        id -> Uuid,
        job_id -> Uuid,
        depends_on_job_id -> Uuid,
        created_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    analysis_jobs (id) {
        id -> Uuid,
        run_id -> Uuid,
        response_id -> Uuid,
        job_type -> Text,
        status -> Text,
        priority -> Nullable<Int4>,
        started_at -> Nullable<Timestamptz>,
        completed_at -> Nullable<Timestamptz>,
        error_message -> Nullable<Text>,
        retry_count -> Nullable<Int4>,
        max_retries -> Nullable<Int4>,
        metadata -> Nullable<Jsonb>,
        created_at -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    analysis_results (id) {
        id -> Int8,
        run_id -> Uuid,
        response_id -> Uuid,
        p_value -> Nullable<Float8>,
        word2vec_component -> Nullable<Float8>,
        reaction_time_component -> Nullable<Float8>,
        skin_potential_component -> Nullable<Float8>,
        emotion_component -> Nullable<Float8>,
        raw_inputs -> Nullable<Jsonb>,
        created_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    analysis_runs (id) {
        id -> Uuid,
        run_at -> Nullable<Timestamptz>,
        model_version -> Text,
        parameters -> Nullable<Jsonb>,
        notes -> Nullable<Text>,
        created_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    participant_analysis_results (id) {
        id -> Uuid,
        participant_id -> Uuid,
        experiment_id -> Uuid,
        word_stimulus_id -> Int4,
        stimulus_word -> Text,
        response_word -> Text,
        reaction_time_ms -> Nullable<Int4>,
        spirit_probability -> Numeric,
        word2vec_component -> Nullable<Numeric>,
        reaction_time_component -> Nullable<Numeric>,
        skin_potential_component -> Nullable<Numeric>,
        emotion_component -> Nullable<Numeric>,
        emotion_data -> Nullable<Jsonb>,
        physiological_data -> Nullable<Jsonb>,
        created_at -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    participant_consents (id) {
        id -> Uuid,
        participant_id -> Uuid,
        signature -> Text,
        agreements -> Jsonb,
        agreed_at -> Timestamptz,
        created_at -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
        consent_version -> Nullable<Text>,
        study_id -> Nullable<Text>,
        user_agent -> Nullable<Text>,
        ip_address -> Nullable<Text>,
        consent_text -> Nullable<Text>,
    }
}

diesel::table! {
    use diesel::sql_types::*;
    use super::sql_types::SessionType;

    participant_experiment_sessions (id) {
        id -> Uuid,
        participant_id -> Uuid,
        session_id -> Uuid,
        session_type -> SessionType,
        start_time -> Timestamptz,
        end_time -> Nullable<Timestamptz>,
        created_at -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    participant_hume_analysis_jobs (id) {
        id -> Uuid,
        participant_experiment_session_id -> Uuid,
        source_media_path -> Nullable<Text>,
        hume_job_id -> Nullable<Uuid>,
        status -> Nullable<Text>,
        created_at -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    participant_hume_burst_predictions (id) {
        id -> Uuid,
        job_id -> Uuid,
        begin_time -> Numeric,
        end_time -> Numeric,
        emotions -> Nullable<Jsonb>,
        expressions -> Nullable<Jsonb>,
        created_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    participant_hume_language_predictions (id) {
        id -> Uuid,
        job_id -> Uuid,
        text -> Nullable<Text>,
        begin_time -> Numeric,
        end_time -> Numeric,
        confidence -> Nullable<Numeric>,
        speaker_confidence -> Nullable<Numeric>,
        emotions -> Nullable<Jsonb>,
        toxicity -> Nullable<Jsonb>,
        created_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    participant_hume_prosody_predictions (id) {
        id -> Uuid,
        job_id -> Uuid,
        begin_time -> Numeric,
        end_time -> Numeric,
        confidence -> Nullable<Numeric>,
        features -> Nullable<Jsonb>,
        emotions -> Nullable<Jsonb>,
        created_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    use diesel::sql_types::*;
    use super::sql_types::SessionType;

    participant_response_data (id) {
        id -> Uuid,
        participant_id -> Uuid,
        experiment_id -> Uuid,
        word_stimulus_id -> Int4,
        stimulus_word -> Text,
        response_word -> Text,
        reaction_time_ms -> Int4,
        session -> SessionType,
        timestamp -> Timestamptz,
        audio_file_path -> Nullable<Text>,
        video_file_path -> Nullable<Text>,
        skin_potential -> Nullable<Numeric>,
        emotion -> Nullable<Text>,
        emotion_confidence -> Nullable<Numeric>,
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
        updated_at -> Nullable<Timestamptz>,
    }
}

diesel::table! {
    use diesel::sql_types::*;
    use super::sql_types::GenderType;

    participants (id) {
        id -> Uuid,
        age -> Nullable<Int4>,
        gender -> Nullable<GenderType>,
        handedness -> Nullable<Text>,
        created_at -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
        name -> Nullable<Text>,
        ethnicity -> Nullable<Text>,
        income -> Nullable<Text>,
        consent_version -> Nullable<Text>,
        study_id -> Nullable<Text>,
    }
}

diesel::table! {
    response_emotion_timeseries (id) {
        id -> Int8,
        response_id -> Uuid,
        timestamp_offset_ms -> Int4,
        source -> Nullable<Text>,
        emotion_data -> Jsonb,
    }
}

diesel::table! {
    response_skin_potential_timeseries (id) {
        id -> Int8,
        response_id -> Uuid,
        timestamp_offset_ms -> Int4,
        value -> Numeric,
    }
}

diesel::table! {
    word_stimuli (id) {
        id -> Int4,
        word -> Text,
        created_at -> Nullable<Timestamptz>,
    }
}

diesel::joinable!(analysis_cache -> analysis_jobs (job_id));
diesel::joinable!(analysis_jobs -> analysis_runs (run_id));
diesel::joinable!(analysis_jobs -> participant_response_data (response_id));
diesel::joinable!(analysis_results -> analysis_runs (run_id));
diesel::joinable!(analysis_results -> participant_response_data (response_id));
diesel::joinable!(participant_analysis_results -> participants (participant_id));
diesel::joinable!(participant_analysis_results -> word_stimuli (word_stimulus_id));
diesel::joinable!(participant_consents -> participants (participant_id));
diesel::joinable!(participant_experiment_sessions -> participants (participant_id));
diesel::joinable!(participant_hume_analysis_jobs -> participant_experiment_sessions (participant_experiment_session_id));
diesel::joinable!(participant_hume_burst_predictions -> participant_hume_analysis_jobs (job_id));
diesel::joinable!(participant_hume_language_predictions -> participant_hume_analysis_jobs (job_id));
diesel::joinable!(participant_hume_prosody_predictions -> participant_hume_analysis_jobs (job_id));
diesel::joinable!(participant_response_data -> participants (participant_id));
diesel::joinable!(participant_response_data -> word_stimuli (word_stimulus_id));
diesel::joinable!(participant_session_events -> participant_experiment_sessions (session_id));
diesel::joinable!(participant_session_events -> participants (participant_id));
diesel::joinable!(response_emotion_timeseries -> participant_response_data (response_id));
diesel::joinable!(response_skin_potential_timeseries -> participant_response_data (response_id));

diesel::allow_tables_to_appear_in_same_query!(
    analysis_cache,analysis_job_dependencies,analysis_jobs,analysis_results,analysis_runs,participant_analysis_results,participant_consents,participant_experiment_sessions,participant_hume_analysis_jobs,participant_hume_burst_predictions,participant_hume_language_predictions,participant_hume_prosody_predictions,participant_response_data,participant_session_events,participants,response_emotion_timeseries,response_skin_potential_timeseries,word_stimuli,);
