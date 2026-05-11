CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  source TEXT NOT NULL,
  source_event TEXT NOT NULL,
  repo_path TEXT,
  session_id TEXT,
  turn_id TEXT,
  model TEXT,
  role TEXT NOT NULL,
  estimated_input_tokens INTEGER DEFAULT 0,
  estimated_output_tokens INTEGER DEFAULT 0,
  estimated_total_tokens INTEGER DEFAULT 0,
  payload_hash TEXT NOT NULL,
  raw_payload TEXT NOT NULL,
  workspace_path TEXT,
  git_repo_root TEXT,
  git_repo_name TEXT,
  git_branch TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_session
ON events(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_events_source
ON events(source, created_at);
