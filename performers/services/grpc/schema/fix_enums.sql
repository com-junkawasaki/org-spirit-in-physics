-- Define missing enum types and update columns

-- 1. session_event_type_enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_event_type_enum') THEN
        CREATE TYPE session_event_type_enum AS ENUM (
            'participant_initialized',
            'preflight_started',
            'preflight_devices_acquired',
            'recording_started',
            'recording_stopped_and_saved',
            'session_started',
            'word_displayed',
            'response_window_opened',
            'speech_detected',
            'response_window_closed',
            'session_data_saved',
            'session_1_completed',
            'session_1_video_saved',
            'session_2_completed',
            'test_completed',
            'test_reset',
            'media_recorder_setup_failed'
        );
    END IF;
END $$;

-- 2. emotion_name_enum (already in hume_schema.sql, but ensuring completeness)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'emotion_name_enum') THEN
        CREATE TYPE emotion_name_enum AS ENUM (
            'joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'calm', 'focus', 'excitement', 'confusion',
            'Admiration', 'Adoration', 'Aesthetic Appreciation', 'Amusement', 'Anxiety', 
            'Awe', 'Awkwardness', 'Boredom', 'Calmness', 'Concentration', 
            'Contemplation', 'Contempt', 'Contentment', 'Craving', 'Desire', 
            'Determination', 'Disappointment', 'Distress', 'Doubt', 
            'Ecstasy', 'Elation', 'Embarrassment', 'Empathic Pain', 'Entrancement', 
            'Envy', 'Excited', 'Guilt', 'Horror', 'Interest', 'Love', 'Nostalgia', 
            'Pain', 'Pride', 'Realization', 'Relief', 'Romance', 'Satisfaction', 'Shame', 
            'Surprise (negative)', 'Surprise (positive)', 'Sympathy', 'Tiredness', 'Triumph'
        );
    END IF;
END $$;

-- Update columns to use ENUMs (requires casting)
ALTER TABLE session_events 
ALTER COLUMN event_type TYPE session_event_type_enum USING event_type::session_event_type_enum;

ALTER TABLE timeline_emotion_entries 
ALTER COLUMN emotion_name TYPE emotion_name_enum USING emotion_name::emotion_name_enum;

