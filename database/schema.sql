PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE CHECK(name IN ('admin','consultor'))
) STRICT;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, role_id INTEGER NOT NULL REFERENCES roles(id),
  created_at TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL, expires_at INTEGER NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS communes (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE
) STRICT;
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, color TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS points (
  id TEXT PRIMARY KEY, name TEXT NOT NULL CHECK(length(name) BETWEEN 3 AND 100),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  commune_id INTEGER NOT NULL REFERENCES communes(id),
  latitude REAL NOT NULL CHECK(latitude BETWEEN -90 AND 90),
  longitude REAL NOT NULL CHECK(longitude BETWEEN -180 AND 180),
  description TEXT NOT NULL CHECK(length(description)<=1200),
  status TEXT NOT NULL CHECK(status IN ('publicado','borrador','retirado')),
  version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
  updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS contacts (
  point_id TEXT PRIMARY KEY REFERENCES points(id) ON DELETE CASCADE,
  name_cipher TEXT NOT NULL, email_cipher TEXT NOT NULL, phone_cipher TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY, point_id TEXT NOT NULL REFERENCES points(id),
  point_version INTEGER NOT NULL, generated_at TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY, user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL, entity_id TEXT, created_at TEXT NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS idx_points_filters ON points(status,category_id,commune_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
INSERT OR IGNORE INTO roles VALUES (1,'admin'),(2,'consultor');
INSERT OR IGNORE INTO communes VALUES (1,'Comuna piloto');
INSERT OR IGNORE INTO categories VALUES
 (1,'Equipamiento','#2F6F62'),(2,'Espacio público','#7D8942'),(3,'Infraestructura','#B47149');
