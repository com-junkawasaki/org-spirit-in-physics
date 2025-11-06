CREATE TABLE word_stimuli (
    id TEXT PRIMARY KEY,
    word TEXT NOT NULL,
    language VARCHAR(2) NOT NULL DEFAULT 'ja',
    pronunciation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
