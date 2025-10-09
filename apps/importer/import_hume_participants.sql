-- Generated SQL for importing Hume AI participants and sessions

\c postgres

INSERT INTO participants (id, age, gender, handedness, created_at, updated_at)
VALUES ('778122e1-5cca-4a2c-8c2b-12cb3cfe8f56', NULL, 'prefer-not-to-say', NULL, '2025-10-09T13:51:23.707804', '2025-10-09T13:51:23.707809')
ON CONFLICT (id) DO NOTHING;

INSERT INTO participants (id, age, gender, handedness, created_at, updated_at)
VALUES ('c5c16907-6638-4791-b93a-f07674a7891f', NULL, 'prefer-not-to-say', NULL, '2025-10-09T13:51:23.707811', '2025-10-09T13:51:23.707812')
ON CONFLICT (id) DO NOTHING;

INSERT INTO participants (id, age, gender, handedness, created_at, updated_at)
VALUES ('918b6ff0-2850-4c00-aa91-1551a7b72b15', NULL, 'prefer-not-to-say', NULL, '2025-10-09T13:51:23.707813', '2025-10-09T13:51:23.707813')
ON CONFLICT (id) DO NOTHING;

INSERT INTO participants (id, age, gender, handedness, created_at, updated_at)
VALUES ('97e70cbc-ae86-432b-aec7-34568d1b0fb9', NULL, 'prefer-not-to-say', NULL, '2025-10-09T13:51:23.707814', '2025-10-09T13:51:23.707815')
ON CONFLICT (id) DO NOTHING;

INSERT INTO participants (id, age, gender, handedness, created_at, updated_at)
VALUES ('368f173d-5b26-4c35-8d9c-70a0a440f6c7', NULL, 'prefer-not-to-say', NULL, '2025-10-09T13:51:23.707816', '2025-10-09T13:51:23.707817')
ON CONFLICT (id) DO NOTHING;

INSERT INTO participants (id, age, gender, handedness, created_at, updated_at)
VALUES ('fc44459b-585f-43ab-ad52-f0ef9934a5db', NULL, 'prefer-not-to-say', NULL, '2025-10-09T13:51:23.707818', '2025-10-09T13:51:23.707818')
ON CONFLICT (id) DO NOTHING;

INSERT INTO participants (id, age, gender, handedness, created_at, updated_at)
VALUES ('b0b6b46c-ac68-45b6-bc24-d875fac48e3b', NULL, 'prefer-not-to-say', NULL, '2025-10-09T13:51:23.707819', '2025-10-09T13:51:23.707820')
ON CONFLICT (id) DO NOTHING;

INSERT INTO participants (id, age, gender, handedness, created_at, updated_at)
VALUES ('c0dc77de-bb55-4b42-8bfc-ba2c288fa22f', NULL, 'prefer-not-to-say', NULL, '2025-10-09T13:51:23.707821', '2025-10-09T13:51:23.707822')
ON CONFLICT (id) DO NOTHING;

INSERT INTO participants (id, age, gender, handedness, created_at, updated_at)
VALUES ('3b27f4ea-8358-4c2e-832b-5200032e6c54', NULL, 'prefer-not-to-say', NULL, '2025-10-09T13:51:23.707822', '2025-10-09T13:51:23.707823')
ON CONFLICT (id) DO NOTHING;

INSERT INTO participant_experiment_sessions (
    id, participant_id, session_id, session_type, start_time, created_at, updated_at
) VALUES (
    '2fd4b28e-a703-4347-85bc-97ad1895afc7',
    '778122e1-5cca-4a2c-8c2b-12cb3cfe8f56',
    '2fd4b28e-a703-4347-85bc-97ad1895afc7',
    'session-1',
    '2025-10-09T13:51:23.707855',
    '2025-10-09T13:51:23.707856',
    '2025-10-09T13:51:23.707857'
) ON CONFLICT (participant_id, session_type) DO NOTHING;

INSERT INTO participant_experiment_sessions (
    id, participant_id, session_id, session_type, start_time, created_at, updated_at
) VALUES (
    'beb06a07-70d0-4f22-a0de-dbe76c2e5080',
    '778122e1-5cca-4a2c-8c2b-12cb3cfe8f56',
    'beb06a07-70d0-4f22-a0de-dbe76c2e5080',
    'session-2',
    '2025-10-09T13:51:23.707863',
    '2025-10-09T13:51:23.707864',
    '2025-10-09T13:51:23.707864'
) ON CONFLICT (participant_id, session_type) DO NOTHING;

INSERT INTO participant_experiment_sessions (
    id, participant_id, session_id, session_type, start_time, created_at, updated_at
) VALUES (
    '1af6631b-ab25-4b89-a55e-454f70411dfb',
    'c5c16907-6638-4791-b93a-f07674a7891f',
    '1af6631b-ab25-4b89-a55e-454f70411dfb',
    'session-1',
    '2025-10-09T13:51:23.707891',
    '2025-10-09T13:51:23.707892',
    '2025-10-09T13:51:23.707893'
) ON CONFLICT (participant_id, session_type) DO NOTHING;

INSERT INTO participant_experiment_sessions (
    id, participant_id, session_id, session_type, start_time, created_at, updated_at
) VALUES (
    'fec81f7f-d5ce-442a-a0d0-a792588a71ae',
    'c5c16907-6638-4791-b93a-f07674a7891f',
    'fec81f7f-d5ce-442a-a0d0-a792588a71ae',
    'session-2',
    '2025-10-09T13:51:23.707896',
    '2025-10-09T13:51:23.707897',
    '2025-10-09T13:51:23.707897'
) ON CONFLICT (participant_id, session_type) DO NOTHING;

INSERT INTO participant_experiment_sessions (
    id, participant_id, session_id, session_type, start_time, created_at, updated_at
) VALUES (
    '4488d9c5-6273-4547-9a8e-d757d490099f',
    '918b6ff0-2850-4c00-aa91-1551a7b72b15',
    '4488d9c5-6273-4547-9a8e-d757d490099f',
    'session-1',
    '2025-10-09T13:51:23.707917',
    '2025-10-09T13:51:23.707918',
    '2025-10-09T13:51:23.707919'
) ON CONFLICT (participant_id, session_type) DO NOTHING;

INSERT INTO participant_experiment_sessions (
    id, participant_id, session_id, session_type, start_time, created_at, updated_at
) VALUES (
    'e70e1137-a336-4926-8158-470dddf835cb',
    '918b6ff0-2850-4c00-aa91-1551a7b72b15',
    'e70e1137-a336-4926-8158-470dddf835cb',
    'session-2',
    '2025-10-09T13:51:23.707942',
    '2025-10-09T13:51:23.707943',
    '2025-10-09T13:51:23.707944'
) ON CONFLICT (participant_id, session_type) DO NOTHING;

INSERT INTO participant_experiment_sessions (
    id, participant_id, session_id, session_type, start_time, created_at, updated_at
) VALUES (
    'c859c9ef-f584-462e-a3fd-e9688e7e991d',
    '97e70cbc-ae86-432b-aec7-34568d1b0fb9',
    'c859c9ef-f584-462e-a3fd-e9688e7e991d',
    'session-1',
    '2025-10-09T13:51:23.707964',
    '2025-10-09T13:51:23.707965',
    '2025-10-09T13:51:23.707966'
) ON CONFLICT (participant_id, session_type) DO NOTHING;

INSERT INTO participant_experiment_sessions (
    id, participant_id, session_id, session_type, start_time, created_at, updated_at
) VALUES (
    '2f6b229a-2fcb-411e-9c39-961657ebb541',
    '97e70cbc-ae86-432b-aec7-34568d1b0fb9',
    '2f6b229a-2fcb-411e-9c39-961657ebb541',
    'session-2',
    '2025-10-09T13:51:23.707969',
    '2025-10-09T13:51:23.707970',
    '2025-10-09T13:51:23.707971'
) ON CONFLICT (participant_id, session_type) DO NOTHING;

INSERT INTO participant_experiment_sessions (
    id, participant_id, session_id, session_type, start_time, created_at, updated_at
) VALUES (
    '6d2c7fa5-3d11-4bba-8354-652c50f80982',
    '368f173d-5b26-4c35-8d9c-70a0a440f6c7',
    '6d2c7fa5-3d11-4bba-8354-652c50f80982',
    'session-1',
    '2025-10-09T13:51:23.707990',
    '2025-10-09T13:51:23.707991',
    '2025-10-09T13:51:23.707992'
) ON CONFLICT (participant_id, session_type) DO NOTHING;

INSERT INTO participant_experiment_sessions (
    id, participant_id, session_id, session_type, start_time, created_at, updated_at
) VALUES (
    'cabba3da-59d0-47c9-bf70-d9d31a2edd13',
    '368f173d-5b26-4c35-8d9c-70a0a440f6c7',
    'cabba3da-59d0-47c9-bf70-d9d31a2edd13',
    'session-2',
    '2025-10-09T13:51:23.707995',
    '2025-10-09T13:51:23.707995',
    '2025-10-09T13:51:23.707996'
) ON CONFLICT (participant_id, session_type) DO NOTHING;

INSERT INTO participant_experiment_sessions (
    id, participant_id, session_id, session_type, start_time, created_at, updated_at
) VALUES (
    '038aa061-ab6e-44b3-8132-6956587ffe58',
    'fc44459b-585f-43ab-ad52-f0ef9934a5db',
    '038aa061-ab6e-44b3-8132-6956587ffe58',
    'session-1',
    '2025-10-09T13:51:23.708080',
    '2025-10-09T13:51:23.708083',
    '2025-10-09T13:51:23.708084'
) ON CONFLICT (participant_id, session_type) DO NOTHING;

INSERT INTO participant_experiment_sessions (
    id, participant_id, session_id, session_type, start_time, created_at, updated_at
) VALUES (
    '46f7a268-97ef-42ad-80f4-9c0d3122c280',
    'fc44459b-585f-43ab-ad52-f0ef9934a5db',
    '46f7a268-97ef-42ad-80f4-9c0d3122c280',
    'session-2',
    '2025-10-09T13:51:23.708089',
    '2025-10-09T13:51:23.708090',
    '2025-10-09T13:51:23.708091'
) ON CONFLICT (participant_id, session_type) DO NOTHING;

INSERT INTO participant_experiment_sessions (
    id, participant_id, session_id, session_type, start_time, created_at, updated_at
) VALUES (
    'e50196f5-6a08-42ec-87ef-e6ce257730da',
    'b0b6b46c-ac68-45b6-bc24-d875fac48e3b',
    'e50196f5-6a08-42ec-87ef-e6ce257730da',
    'session-1',
    '2025-10-09T13:51:23.708154',
    '2025-10-09T13:51:23.708162',
    '2025-10-09T13:51:23.708164'
) ON CONFLICT (participant_id, session_type) DO NOTHING;

INSERT INTO participant_experiment_sessions (
    id, participant_id, session_id, session_type, start_time, created_at, updated_at
) VALUES (
    'b82b4374-ebc3-4138-9fcd-61713d1dc55d',
    'b0b6b46c-ac68-45b6-bc24-d875fac48e3b',
    'b82b4374-ebc3-4138-9fcd-61713d1dc55d',
    'session-2',
    '2025-10-09T13:51:23.708173',
    '2025-10-09T13:51:23.708175',
    '2025-10-09T13:51:23.708176'
) ON CONFLICT (participant_id, session_type) DO NOTHING;

INSERT INTO participant_experiment_sessions (
    id, participant_id, session_id, session_type, start_time, created_at, updated_at
) VALUES (
    'f5afcc26-9c5e-4ff0-9840-32c55b817d8b',
    'c0dc77de-bb55-4b42-8bfc-ba2c288fa22f',
    'f5afcc26-9c5e-4ff0-9840-32c55b817d8b',
    'session-1',
    '2025-10-09T13:51:23.708256',
    '2025-10-09T13:51:23.708258',
    '2025-10-09T13:51:23.708258'
) ON CONFLICT (participant_id, session_type) DO NOTHING;

INSERT INTO participant_experiment_sessions (
    id, participant_id, session_id, session_type, start_time, created_at, updated_at
) VALUES (
    'c29f7e5e-2420-404f-a57d-67d4bae6f998',
    'c0dc77de-bb55-4b42-8bfc-ba2c288fa22f',
    'c29f7e5e-2420-404f-a57d-67d4bae6f998',
    'session-2',
    '2025-10-09T13:51:23.708262',
    '2025-10-09T13:51:23.708262',
    '2025-10-09T13:51:23.708263'
) ON CONFLICT (participant_id, session_type) DO NOTHING;

INSERT INTO participant_experiment_sessions (
    id, participant_id, session_id, session_type, start_time, created_at, updated_at
) VALUES (
    'bd888254-f458-4ea8-a774-80992eca7f58',
    '3b27f4ea-8358-4c2e-832b-5200032e6c54',
    'bd888254-f458-4ea8-a774-80992eca7f58',
    'session-1',
    '2025-10-09T13:51:23.708289',
    '2025-10-09T13:51:23.708290',
    '2025-10-09T13:51:23.708291'
) ON CONFLICT (participant_id, session_type) DO NOTHING;

INSERT INTO participant_experiment_sessions (
    id, participant_id, session_id, session_type, start_time, created_at, updated_at
) VALUES (
    '4445835d-3520-467f-a1c8-f3e9a44f692e',
    '3b27f4ea-8358-4c2e-832b-5200032e6c54',
    '4445835d-3520-467f-a1c8-f3e9a44f692e',
    'session-2',
    '2025-10-09T13:51:23.708294',
    '2025-10-09T13:51:23.708295',
    '2025-10-09T13:51:23.708296'
) ON CONFLICT (participant_id, session_type) DO NOTHING;

-- Total statements: 27
