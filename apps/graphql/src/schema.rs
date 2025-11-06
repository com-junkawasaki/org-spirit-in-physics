// @generated automatically by Diesel CLI.

diesel::table! {
    word_stimuli (id) {
        id -> Text,
        word -> Text,
        language -> Varchar,
        pronunciation -> Text,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

