-- Generated SQL for importing response data
-- Execute this file against your Supabase database

\c postgres

INSERT INTO word_stimuli (id, word, created_at)
VALUES (893056, '年月', '2025-10-09T13:50:19.405890')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_stimuli (id, word, created_at)
VALUES (562721, '嬉しい', '2025-10-09T13:50:19.405896')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_stimuli (id, word, created_at)
VALUES (209127, '空腹', '2025-10-09T13:50:19.405898')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_stimuli (id, word, created_at)
VALUES (522413, '針', '2025-10-09T13:50:19.405899')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_stimuli (id, word, created_at)
VALUES (254606, '頭', '2025-10-09T13:50:19.405900')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_stimuli (id, word, created_at)
VALUES (763469, '金持ち', '2025-10-09T13:50:19.405901')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_stimuli (id, word, created_at)
VALUES (769520, '旅行', '2025-10-09T13:50:19.405902')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_stimuli (id, word, created_at)
VALUES (480567, 'キス', '2025-10-09T13:50:19.405903')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_stimuli (id, word, created_at)
VALUES (743418, '荒い', '2025-10-09T13:50:19.405904')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_stimuli (id, word, created_at)
VALUES (865626, '嘘', '2025-10-09T13:50:19.405905')
ON CONFLICT (id) DO NOTHING;

INSERT INTO word_stimuli (id, word, created_at)
VALUES (339581, '選ぶ', '2025-10-09T13:50:19.405906')
ON CONFLICT (id) DO NOTHING;

INSERT INTO participant_response_data (
    id, participant_id, experiment_id, word_stimulus_id,
    stimulus_word, response_word, reaction_time_ms, session, timestamp,
    skin_potential, created_at, updated_at
) VALUES (
    '5bf14494-5a03-4bd1-9b31-2ed3e888db5f',
    '25111604-c7db-4bfd-8662-e55060e332d6',
    (SELECT id FROM participant_experiment_sessions
     WHERE participant_id = '25111604-c7db-4bfd-8662-e55060e332d6' AND session_type = 'session-1'
     LIMIT 1),
    480567,
    'キス',
    '冷たい',
    100,
    'session-1',
    '2025-10-09T13:50:19.405920',
    1.0,
    '2025-10-09T13:50:19.405923',
    '2025-10-09T13:50:19.405924'
) ON CONFLICT DO NOTHING;

INSERT INTO participant_response_data (
    id, participant_id, experiment_id, word_stimulus_id,
    stimulus_word, response_word, reaction_time_ms, session, timestamp,
    skin_potential, created_at, updated_at
) VALUES (
    '05e590bb-89d5-4492-8795-7f26a4e14aa5',
    'a4e1b8f4-e267-41a7-acfc-07fe1b7c06fb',
    (SELECT id FROM participant_experiment_sessions
     WHERE participant_id = 'a4e1b8f4-e267-41a7-acfc-07fe1b7c06fb' AND session_type = 'session-1'
     LIMIT 1),
    865626,
    '嘘',
    '緑',
    100,
    'session-1',
    '2025-10-09T13:50:19.405931',
    1.0,
    '2025-10-09T13:50:19.405932',
    '2025-10-09T13:50:19.405933'
) ON CONFLICT DO NOTHING;

INSERT INTO participant_response_data (
    id, participant_id, experiment_id, word_stimulus_id,
    stimulus_word, response_word, reaction_time_ms, session, timestamp,
    skin_potential, created_at, updated_at
) VALUES (
    '575d1d1b-f630-43f4-8f1b-c168fb0c92b9',
    '4512513e-9132-4556-9858-bac08f28037f',
    (SELECT id FROM participant_experiment_sessions
     WHERE participant_id = '4512513e-9132-4556-9858-bac08f28037f' AND session_type = 'session-1'
     LIMIT 1),
    209127,
    '空腹',
    '礼儀',
    100,
    'session-1',
    '2025-10-09T13:50:19.405938',
    1.0,
    '2025-10-09T13:50:19.405939',
    '2025-10-09T13:50:19.405940'
) ON CONFLICT DO NOTHING;

INSERT INTO participant_response_data (
    id, participant_id, experiment_id, word_stimulus_id,
    stimulus_word, response_word, reaction_time_ms, session, timestamp,
    skin_potential, created_at, updated_at
) VALUES (
    'a43622ac-26e6-4a0c-aef7-0d7aa99161aa',
    '5346d514-e501-457a-aff1-55c92074a6f2',
    (SELECT id FROM participant_experiment_sessions
     WHERE participant_id = '5346d514-e501-457a-aff1-55c92074a6f2' AND session_type = 'session-1'
     LIMIT 1),
    743418,
    '荒い',
    '船',
    100,
    'session-1',
    '2025-10-09T13:50:19.405943',
    1.0,
    '2025-10-09T13:50:19.405944',
    '2025-10-09T13:50:19.405945'
) ON CONFLICT DO NOTHING;

INSERT INTO participant_response_data (
    id, participant_id, experiment_id, word_stimulus_id,
    stimulus_word, response_word, reaction_time_ms, session, timestamp,
    skin_potential, created_at, updated_at
) VALUES (
    '33d5277e-be8a-4ce8-95be-6ae4fd2244d9',
    '5ac869a3-b8db-49c3-9362-3e149a5415e9',
    (SELECT id FROM participant_experiment_sessions
     WHERE participant_id = '5ac869a3-b8db-49c3-9362-3e149a5415e9' AND session_type = 'session-1'
     LIMIT 1),
    522413,
    '針',
    '鉛筆',
    100,
    'session-1',
    '2025-10-09T13:50:19.405950',
    1.0,
    '2025-10-09T13:50:19.405952',
    '2025-10-09T13:50:19.405952'
) ON CONFLICT DO NOTHING;

INSERT INTO participant_response_data (
    id, participant_id, experiment_id, word_stimulus_id,
    stimulus_word, response_word, reaction_time_ms, session, timestamp,
    skin_potential, created_at, updated_at
) VALUES (
    'c5224318-46be-4bc2-b0cf-5370dd329669',
    '7dda0261-a6f4-4208-bd61-4244380d277f',
    (SELECT id FROM participant_experiment_sessions
     WHERE participant_id = '7dda0261-a6f4-4208-bd61-4244380d277f' AND session_type = 'session-1'
     LIMIT 1),
    562721,
    '嬉しい',
    '海',
    100,
    'session-1',
    '2025-10-09T13:50:19.405956',
    1.0,
    '2025-10-09T13:50:19.405957',
    '2025-10-09T13:50:19.405957'
) ON CONFLICT DO NOTHING;

INSERT INTO participant_response_data (
    id, participant_id, experiment_id, word_stimulus_id,
    stimulus_word, response_word, reaction_time_ms, session, timestamp,
    skin_potential, created_at, updated_at
) VALUES (
    'a4dfc648-a4a7-40ea-b6b6-0234b0eb962c',
    'ad96101f-a7a8-4d71-8d82-c0478975c40b',
    (SELECT id FROM participant_experiment_sessions
     WHERE participant_id = 'ad96101f-a7a8-4d71-8d82-c0478975c40b' AND session_type = 'session-1'
     LIMIT 1),
    254606,
    '頭',
    '狭い',
    100,
    'session-1',
    '2025-10-09T13:50:19.405961',
    1.0,
    '2025-10-09T13:50:19.405962',
    '2025-10-09T13:50:19.405962'
) ON CONFLICT DO NOTHING;

INSERT INTO participant_response_data (
    id, participant_id, experiment_id, word_stimulus_id,
    stimulus_word, response_word, reaction_time_ms, session, timestamp,
    skin_potential, created_at, updated_at
) VALUES (
    '5210fae1-c45c-402f-bf60-62911a38b38e',
    '2a0d7a69-f953-4c29-87a5-8a8e4e8bd413',
    (SELECT id FROM participant_experiment_sessions
     WHERE participant_id = '2a0d7a69-f953-4c29-87a5-8a8e4e8bd413' AND session_type = 'session-1'
     LIMIT 1),
    763469,
    '金持ち',
    'インク',
    100,
    'session-1',
    '2025-10-09T13:50:19.405966',
    1.0,
    '2025-10-09T13:50:19.405967',
    '2025-10-09T13:50:19.405967'
) ON CONFLICT DO NOTHING;

INSERT INTO participant_response_data (
    id, participant_id, experiment_id, word_stimulus_id,
    stimulus_word, response_word, reaction_time_ms, session, timestamp,
    skin_potential, created_at, updated_at
) VALUES (
    '2aa1d061-f747-49cf-977d-1b2feb06fc68',
    'e41a9cd2-d803-49a8-9020-0260e55cd03e',
    (SELECT id FROM participant_experiment_sessions
     WHERE participant_id = 'e41a9cd2-d803-49a8-9020-0260e55cd03e' AND session_type = 'session-1'
     LIMIT 1),
    339581,
    '選ぶ',
    '踊る',
    100,
    'session-1',
    '2025-10-09T13:50:19.405971',
    1.0,
    '2025-10-09T13:50:19.405971',
    '2025-10-09T13:50:19.405972'
) ON CONFLICT DO NOTHING;

INSERT INTO participant_response_data (
    id, participant_id, experiment_id, word_stimulus_id,
    stimulus_word, response_word, reaction_time_ms, session, timestamp,
    skin_potential, created_at, updated_at
) VALUES (
    'b257c29a-2ce8-4195-befd-fd6cceb8774b',
    '15592cdb-86cf-4baf-86f5-66184169ee39',
    (SELECT id FROM participant_experiment_sessions
     WHERE participant_id = '15592cdb-86cf-4baf-86f5-66184169ee39' AND session_type = 'session-1'
     LIMIT 1),
    769520,
    '旅行',
    '長い',
    100,
    'session-1',
    '2025-10-09T13:50:19.405975',
    1.0,
    '2025-10-09T13:50:19.405976',
    '2025-10-09T13:50:19.405977'
) ON CONFLICT DO NOTHING;

INSERT INTO participant_response_data (
    id, participant_id, experiment_id, word_stimulus_id,
    stimulus_word, response_word, reaction_time_ms, session, timestamp,
    skin_potential, created_at, updated_at
) VALUES (
    'd9f04bd1-6a09-4ee4-8abd-9429ea43d895',
    '144b325f-5966-4d59-a629-f2ca421388cc',
    (SELECT id FROM participant_experiment_sessions
     WHERE participant_id = '144b325f-5966-4d59-a629-f2ca421388cc' AND session_type = 'session-1'
     LIMIT 1),
    893056,
    '年月',
    '蛙',
    100,
    'session-1',
    '2025-10-09T13:50:19.405980',
    1.0,
    '2025-10-09T13:50:19.405981',
    '2025-10-09T13:50:19.405982'
) ON CONFLICT DO NOTHING;

-- Total responses to import: 11
