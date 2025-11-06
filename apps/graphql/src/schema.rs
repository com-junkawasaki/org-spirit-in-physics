// @generated automatically by Diesel CLI.

table! {
    participants (id) {
        id -> Uuid,
        age -> Nullable<Int4>,
        gender -> Nullable<Text>,
        handedness -> Nullable<Text>,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

table! {
    participant_consents (id) {
        id -> Uuid,
        participant_id -> Uuid,
        signature -> Text,
        agreements -> Text,
        agreed_at -> Timestamptz,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

table! {
    participant_experiment_sessions (id) {
        id -> Uuid,
        participant_id -> Uuid,
        session_id -> Uuid,
        session_type -> Text,
        start_time -> Timestamptz,
        end_time -> Nullable<Timestamptz>,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

table! {
    word_stimuli (id) {
        id -> Text,
        word -> Text,
        language -> Varchar,
        pronunciation -> Text,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

table! {
    participant_response_data (id) {
        id -> Uuid,
        participant_id -> Uuid,
        experiment_id -> Uuid,
        word_stimulus_id -> Text,
        stimulus_word -> Text,
        response_word -> Text,
        reaction_time_ms -> Int4,
        session -> Text,
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

table! {
    participant_analysis_results (id) {
        id -> Uuid,
        participant_id -> Uuid,
        experiment_id -> Uuid,
        word_stimulus_id -> Text,
        stimulus_word -> Text,
        response_word -> Text,
        reaction_time_ms -> Nullable<Int4>,
        spirit_probability -> Double,
        word2vec_component -> Nullable<Double>,
        reaction_time_component -> Nullable<Double>,
        skin_potential_component -> Nullable<Double>,
        emotion_component -> Nullable<Double>,
        emotion_data -> Text,
        physiological_data -> Text,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

joinable!(participant_consents -> participants (participant_id));
joinable!(participant_experiment_sessions -> participants (participant_id));
joinable!(participant_response_data -> participants (participant_id));
joinable!(participant_response_data -> word_stimuli (word_stimulus_id));
joinable!(participant_analysis_results -> participants (participant_id));
joinable!(participant_analysis_results -> word_stimuli (word_stimulus_id));

allow_tables_to_appear_in_same_query!(
    participants,
    participant_consents,
    participant_experiment_sessions,
    word_stimuli,
    participant_response_data,
    participant_analysis_results,
);

// @generated automatically by Diesel CLI.

