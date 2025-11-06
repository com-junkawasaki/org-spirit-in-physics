-- Your SQL goes here
CREATE TABLE word_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    window_id UUID NOT NULL REFERENCES windows(id) ON DELETE CASCADE,
    stimulus_word VARCHAR NOT NULL,
    response_word VARCHAR NOT NULL,
    reaction_time_ms INTEGER NOT NULL,
    is_delayed BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
