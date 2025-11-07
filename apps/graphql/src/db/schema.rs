// @generated automatically by Diesel CLI.

diesel::table! {
    participant_analysis_results (id) {
        id -> Uuid,
        participant_id -> Uuid,
        stimulus_word -> Text,
        response_word -> Nullable<Text>,
        p_value -> Nullable<Double>,
        word2vec_component -> Nullable<Double>,
        reaction_time_component -> Nullable<Double>,
        skin_potential_component -> Nullable<Double>,
        emotion_component -> Nullable<Double>,
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
    participant_experiment_sessions (id) {
        id -> Uuid,
        participant_id -> Uuid,
        session_type -> Text,
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
        skin_potential -> Nullable<Double>,
        emotion -> Nullable<Text>,
        emotion_confidence -> Nullable<Double>,
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
    word_stimuli (id) {
        id -> Int4,
        word -> Text,
        created_at -> Nullable<Timestamptz>,
        updated_at -> Nullable<Timestamptz>,
    }
}

diesel::joinable!(participant_analysis_results -> participants (participant_id));
diesel::joinable!(participant_consents -> participants (participant_id));
diesel::joinable!(participant_experiment_sessions -> participants (participant_id));
diesel::joinable!(participant_response_data -> participants (participant_id));
diesel::joinable!(participant_response_data -> word_stimuli (word_stimulus_id));

diesel::allow_tables_to_appear_in_same_query!(
    participant_analysis_results,
    participant_consents,
    participant_experiment_sessions,
    participant_response_data,
    participants,
    word_stimuli,
);
