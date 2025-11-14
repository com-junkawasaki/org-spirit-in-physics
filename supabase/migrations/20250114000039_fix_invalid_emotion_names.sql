-- Merkle DAG: fix_invalid_emotion_names -> cleanup_before_enum_conversion
-- ENUM型に存在しないemotion_nameをクリーンアップ

-- 1. hume_burst_emotion_scoresから無効なemotion_name_idを削除
DELETE FROM hume_burst_emotion_scores 
WHERE emotion_name_id IN (
    SELECT id FROM emotion_names 
    WHERE name::text NOT IN (SELECT unnest(enum_range(NULL::emotion_name_enum))::text)
);

-- 2. hume_face_emotion_scoresから無効なemotion_name_idを削除
DELETE FROM hume_face_emotion_scores 
WHERE emotion_name_id IN (
    SELECT id FROM emotion_names 
    WHERE name::text NOT IN (SELECT unnest(enum_range(NULL::emotion_name_enum))::text)
);

-- 3. hume_language_emotion_scoresから無効なemotion_name_idを削除
DELETE FROM hume_language_emotion_scores 
WHERE emotion_name_id IN (
    SELECT id FROM emotion_names 
    WHERE name::text NOT IN (SELECT unnest(enum_range(NULL::emotion_name_enum))::text)
);

-- 4. hume_prosody_emotion_scoresから無効なemotion_name_idを削除
DELETE FROM hume_prosody_emotion_scores 
WHERE emotion_name_id IN (
    SELECT id FROM emotion_names 
    WHERE name::text NOT IN (SELECT unnest(enum_range(NULL::emotion_name_enum))::text)
);

-- 5. timeline_emotion_entriesから無効なemotion_name_idを削除
DELETE FROM timeline_emotion_entries 
WHERE emotion_name_id IN (
    SELECT id FROM emotion_names 
    WHERE name::text NOT IN (SELECT unnest(enum_range(NULL::emotion_name_enum))::text)
);

-- 6. コメント追加
COMMENT ON TABLE hume_burst_emotion_scores IS 'Cleaned invalid emotion names before ENUM conversion';
COMMENT ON TABLE hume_face_emotion_scores IS 'Cleaned invalid emotion names before ENUM conversion';
COMMENT ON TABLE hume_language_emotion_scores IS 'Cleaned invalid emotion names before ENUM conversion';
COMMENT ON TABLE hume_prosody_emotion_scores IS 'Cleaned invalid emotion names before ENUM conversion';
COMMENT ON TABLE timeline_emotion_entries IS 'Cleaned invalid emotion names before ENUM conversion';

