-- Generated SQL for importing session data

\c postgres

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('da822fe0-3546-410e-a9b0-b5f3a7588453', '25111604-c7db-4bfd-8662-e55060e332d6', 'da822fe0-3546-410e-a9b0-b5f3a7588453', 'session-1', '2025-07-31T15:39:05.524000', '2025-07-31T15:49:06.031000', '2025-07-31T15:39:05.524000', '2025-07-31T15:49:06.031000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('ea5a807c-865f-45b0-9efc-4ebb36367de2', '25111604-c7db-4bfd-8662-e55060e332d6', 'ea5a807c-865f-45b0-9efc-4ebb36367de2', 'session-2', '2025-07-31T15:49:31.580000', NULL, '2025-07-31T15:49:31.580000', '2025-07-31T15:49:31.580000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('0487f0c0-2fc3-4fe5-9498-7503b172c5ac', 'a4e1b8f4-e267-41a7-acfc-07fe1b7c06fb', '0487f0c0-2fc3-4fe5-9498-7503b172c5ac', 'session-1', '2025-07-31T16:36:03.037000', '2025-07-31T16:46:03.509000', '2025-07-31T16:36:03.037000', '2025-07-31T16:46:03.509000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('77fd76f8-acc7-401b-a5cf-5c825dcc4ab9', 'a4e1b8f4-e267-41a7-acfc-07fe1b7c06fb', '77fd76f8-acc7-401b-a5cf-5c825dcc4ab9', 'session-2', '2025-07-31T16:46:09.492000', NULL, '2025-07-31T16:46:09.492000', '2025-07-31T16:46:09.492000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('207ac815-feeb-46e3-91e4-2fe91c365a72', '4512513e-9132-4556-9858-bac08f28037f', '207ac815-feeb-46e3-91e4-2fe91c365a72', 'session-1', '2025-08-01T09:09:20.556000', NULL, '2025-08-01T09:09:20.556000', '2025-08-01T09:09:20.556000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('65f76d07-3c5c-49ec-914f-d96dcc490c8d', '5346d514-e501-457a-aff1-55c92074a6f2', '65f76d07-3c5c-49ec-914f-d96dcc490c8d', 'session-1', '2025-07-31T14:36:46.609000', '2025-07-31T14:46:47.097000', '2025-07-31T14:36:46.609000', '2025-07-31T14:46:47.097000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('1e1778c2-d14e-4a9f-8dbb-e1268b9be2e7', '5346d514-e501-457a-aff1-55c92074a6f2', '1e1778c2-d14e-4a9f-8dbb-e1268b9be2e7', 'session-2', '2025-07-31T14:47:02.146000', NULL, '2025-07-31T14:47:02.146000', '2025-07-31T14:47:02.146000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('ffb82794-31db-4239-9b49-f48598a19fc5', '5ac869a3-b8db-49c3-9362-3e149a5415e9', 'ffb82794-31db-4239-9b49-f48598a19fc5', 'session-1', '2025-08-01T11:10:13.203000', '2025-08-01T11:20:13.700000', '2025-08-01T11:10:13.203000', '2025-08-01T11:20:13.700000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('d64e3633-59a8-47e8-928f-c6294a77b812', '5ac869a3-b8db-49c3-9362-3e149a5415e9', 'd64e3633-59a8-47e8-928f-c6294a77b812', 'session-2', '2025-08-01T11:20:29.372000', NULL, '2025-08-01T11:20:29.372000', '2025-08-01T11:20:29.372000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('3cfdd7a4-43e0-4c76-be7e-a4521006ec22', '7dda0261-a6f4-4208-bd61-4244380d277f', '3cfdd7a4-43e0-4c76-be7e-a4521006ec22', 'session-1', '2025-08-01T09:36:13.691000', '2025-08-01T09:46:14.112000', '2025-08-01T09:36:13.691000', '2025-08-01T09:46:14.112000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('8cc6460e-878e-444c-abc7-2ec05b5090b1', '7dda0261-a6f4-4208-bd61-4244380d277f', '8cc6460e-878e-444c-abc7-2ec05b5090b1', 'session-2', '2025-08-01T09:46:25.082000', NULL, '2025-08-01T09:46:25.082000', '2025-08-01T09:46:25.082000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('f685aa4c-e22b-47ce-be1d-b795bf08cbe1', 'ad96101f-a7a8-4d71-8d82-c0478975c40b', 'f685aa4c-e22b-47ce-be1d-b795bf08cbe1', 'session-1', '2025-07-31T14:01:57.783000', '2025-07-31T14:11:58.251000', '2025-07-31T14:01:57.783000', '2025-07-31T14:11:58.251000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('f603ad64-dd1f-45cf-a09d-1c3ef2e1caf8', 'ad96101f-a7a8-4d71-8d82-c0478975c40b', 'f603ad64-dd1f-45cf-a09d-1c3ef2e1caf8', 'session-2', '2025-07-31T14:12:09.914000', NULL, '2025-07-31T14:12:09.914000', '2025-07-31T14:12:09.914000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('74e68ea8-24af-49f4-81c3-27b51d2770df', '2a0d7a69-f953-4c29-87a5-8a8e4e8bd413', '74e68ea8-24af-49f4-81c3-27b51d2770df', 'session-1', '2025-07-31T16:10:14.144000', '2025-07-31T16:20:14.652000', '2025-07-31T16:10:14.144000', '2025-07-31T16:20:14.652000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('24824872-7333-40dc-9286-04b389ededf2', '2a0d7a69-f953-4c29-87a5-8a8e4e8bd413', '24824872-7333-40dc-9286-04b389ededf2', 'session-2', '2025-07-31T16:20:23.798000', NULL, '2025-07-31T16:20:23.798000', '2025-07-31T16:20:23.798000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('49747812-ea0d-434c-8c62-e06d4e848458', 'e41a9cd2-d803-49a8-9020-0260e55cd03e', '49747812-ea0d-434c-8c62-e06d4e848458', 'session-1', '2025-07-31T15:04:30.141000', '2025-07-31T15:14:30.629000', '2025-07-31T15:04:30.141000', '2025-07-31T15:14:30.629000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('553a2c35-521f-4a04-abf6-d07d13388f06', 'e41a9cd2-d803-49a8-9020-0260e55cd03e', '553a2c35-521f-4a04-abf6-d07d13388f06', 'session-2', '2025-07-31T15:15:00.412000', NULL, '2025-07-31T15:15:00.412000', '2025-07-31T15:15:00.412000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('e00e24e8-38da-4ddb-bc90-84e86dee4324', '15592cdb-86cf-4baf-86f5-66184169ee39', 'e00e24e8-38da-4ddb-bc90-84e86dee4324', 'session-1', '2025-08-01T10:38:49.055000', '2025-08-01T10:48:49.502000', '2025-08-01T10:38:49.055000', '2025-08-01T10:48:49.502000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('96cbdaea-e023-48b2-95b0-3e0a57b5b434', '15592cdb-86cf-4baf-86f5-66184169ee39', '96cbdaea-e023-48b2-95b0-3e0a57b5b434', 'session-2', '2025-08-01T10:48:59.893000', NULL, '2025-08-01T10:48:59.893000', '2025-08-01T10:48:59.893000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('b61d83f4-faf4-44f2-9c3d-2ca69eb41d6c', '144b325f-5966-4d59-a629-f2ca421388cc', 'b61d83f4-faf4-44f2-9c3d-2ca69eb41d6c', 'session-1', '2025-08-01T10:04:57.963000', '2025-08-01T10:14:58.523000', '2025-08-01T10:04:57.963000', '2025-08-01T10:14:58.523000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

INSERT INTO participant_experiment_sessions (id, participant_id, session_id, session_type, start_time, end_time, created_at, updated_at)
VALUES ('5a6f3aef-9ffd-4d68-8a1d-037dc258e431', '144b325f-5966-4d59-a629-f2ca421388cc', '5a6f3aef-9ffd-4d68-8a1d-037dc258e431', 'session-2', '2025-08-01T10:15:14.200000', NULL, '2025-08-01T10:15:14.200000', '2025-08-01T10:15:14.200000')
ON CONFLICT (participant_id, session_type) DO UPDATE SET
    end_time = EXCLUDED.end_time,
    updated_at = EXCLUDED.updated_at;

-- Total session statements: 21
