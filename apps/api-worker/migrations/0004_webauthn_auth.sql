-- Authenticated users (researchers and registered participants).
-- Anonymous experiment participants still live in `participants` and are
-- decoupled from `users`.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'participant',
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- WebAuthn / FIDO2 credentials. One user can register multiple authenticators.
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id TEXT PRIMARY KEY,                 -- base64url-encoded credential ID
  user_id TEXT NOT NULL,
  public_key BLOB NOT NULL,            -- COSE-encoded public key bytes
  counter INTEGER NOT NULL DEFAULT 0,  -- signature counter for replay protection
  transports TEXT,                     -- JSON array of transport hints
  device_type TEXT,                    -- 'singleDevice' | 'multiDevice'
  backed_up INTEGER NOT NULL DEFAULT 0,
  nickname TEXT,
  created_at_ms INTEGER NOT NULL,
  last_used_at_ms INTEGER
);

CREATE INDEX IF NOT EXISTS webauthn_credentials_user_idx
  ON webauthn_credentials(user_id);

-- Outstanding WebAuthn ceremony challenges (registration + authentication).
-- TTL-style cleanup happens on read.
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id TEXT PRIMARY KEY,                 -- challenge string (base64url)
  user_id TEXT,                        -- nullable for usernameless login
  ceremony TEXT NOT NULL,              -- 'registration' | 'authentication'
  expires_at_ms INTEGER NOT NULL,
  created_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS webauthn_challenges_expiry_idx
  ON webauthn_challenges(expires_at_ms);

-- Server-side auth sessions. Named `auth_sessions` to avoid collision with
-- experiment `sessions` table.
CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,                 -- random session ID (base64url)
  user_id TEXT NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  created_at_ms INTEGER NOT NULL,
  last_seen_at_ms INTEGER NOT NULL,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at_ms);
