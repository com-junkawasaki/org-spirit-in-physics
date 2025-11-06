// @generated automatically by Diesel CLI.
// Updated to match Supabase schema

diesel::table! {
    participants (id) {
        id -> Uuid,
        age -> Nullable<Int4>,
        gender -> Nullable<Text>, // gender_type enum as text
        handedness -> Nullable<Text>,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

diesel::table! {
    participant_consents (id) {
        id -> Uuid,
        participant_id -> Uuid,
        signature -> Text,
        agreements -> Jsonb,
        agreed_at -> Timestamptz,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

diesel::table! {
    participant_experiment_sessions (id) {
        id -> Uuid,
        participant_id -> Uuid,
        session_id -> Uuid,
        session_type -> Text, // session_type enum as text
        start_time -> Timestamptz,
        end_time -> Nullable<Timestamptz>,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

diesel::table! {
    participant_response_data (id) {
        id -> Uuid,
        participant_id -> Uuid,
        experiment_id -> Uuid,
        word_stimulus_id -> Int4,
        stimulus_word -> Text,
        response_word -> Text,
        reaction_time_ms -> Int4,
        session -> Text, // session_type enum as text
        timestamp -> Timestamptz,
        audio_file_path -> Nullable<Text>,
        video_file_path -> Nullable<Text>,
        skin_potential -> Nullable<Double>,
        emotion -> Nullable<Text>,
        emotion_confidence -> Nullable<Double>,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
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
        spirit_probability -> Double,
        word2vec_component -> Nullable<Double>,
        reaction_time_component -> Nullable<Double>,
        skin_potential_component -> Nullable<Double>,
        emotion_component -> Nullable<Double>,
        emotion_data -> Jsonb,
        physiological_data -> Jsonb,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

diesel::table! {
    word_stimuli (id) {
        id -> Int4,
        word -> Text,
        created_at -> Timestamptz,
    }
}

// Keep existing tables for backward compatibility
diesel::table! {
    experiments (id) {
        id -> Uuid,
        participant_id -> Uuid,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

diesel::table! {
    windows (id) {
        id -> Uuid,
        experiment_id -> Uuid,
        word -> Varchar,
        start -> Timestamptz,
        end -> Timestamptz,
        reaction_time_ms -> Nullable<Int4>,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

diesel::table! {
    emotion_aggregations (id) {
        id -> Uuid,
        window_id -> Uuid,
        source -> Varchar,
        emotion -> Varchar,
        score -> Double,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

diesel::table! {
    physiological_aggregations (id) {
        id -> Uuid,
        window_id -> Uuid,
        channels -> Jsonb,
        avg -> Nullable<Double>,
        quality -> Nullable<Double>,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

diesel::table! {
    kernel_fusion_runs (id) {
        id -> Uuid,
        participant_id -> Uuid,
        weights -> Jsonb,
        normalization -> Nullable<Varchar>,
        dimensions -> Int4,
        timestamp -> Timestamptz,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

diesel::table! {
    embedding_results (id) {
        id -> Uuid,
        kernel_fusion_run_id -> Uuid,
        method -> Varchar,
        dimensions -> Int4,
        points -> Jsonb,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

diesel::table! {
    word_responses (id) {
        id -> Uuid,
        window_id -> Uuid,
        stimulus_word -> Text,
        response_word -> Text,
        reaction_time_ms -> Int4,
        is_delayed -> Nullable<Bool>,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

// Custom types are handled as Text in Diesel

joinable!(participant_consents -> participants (participant_id));
joinable!(participant_experiment_sessions -> participants (participant_id));
joinable!(participant_response_data -> participants (participant_id));
joinable!(participant_response_data -> word_stimuli (word_stimulus_id));
joinable!(participant_analysis_results -> participants (participant_id));
joinable!(participant_analysis_results -> word_stimuli (word_stimulus_id));
joinable!(experiments -> participants (participant_id));
joinable!(windows -> experiments (experiment_id));
joinable!(emotion_aggregations -> windows (window_id));
joinable!(physiological_aggregations -> windows (window_id));
joinable!(kernel_fusion_runs -> participants (participant_id));
joinable!(embedding_results -> kernel_fusion_runs (kernel_fusion_run_id));
joinable!(word_responses -> windows (window_id));

allow_tables_to_appear_in_same_query!(
    participants,
    participant_consents,
    participant_experiment_sessions,
    participant_response_data,
    participant_analysis_results,
    word_stimuli,
    experiments,
    windows,
    emotion_aggregations,
    physiological_aggregations,
    kernel_fusion_runs,
    embedding_results,
    word_responses,
);
