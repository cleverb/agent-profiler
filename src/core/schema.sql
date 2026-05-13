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
  git_branch TEXT,
  interaction_kind TEXT,
  correlation_id TEXT,
  tool_canonical_name TEXT,
  mcp_server TEXT,
  mcp_tool TEXT,
  payload_byte_length INTEGER,
  prompt_fingerprint TEXT
);

CREATE TABLE IF NOT EXISTS interaction_spans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_key TEXT NOT NULL,
  source TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  turn_id TEXT,
  tool_canonical_name TEXT,
  mcp_server TEXT,
  mcp_tool TEXT,
  pre_event_id INTEGER,
  post_event_id INTEGER,
  failure_event_id INTEGER,
  arg_token_estimate INTEGER DEFAULT 0,
  result_token_estimate INTEGER DEFAULT 0,
  workspace_path TEXT,
  git_repo_root TEXT,
  git_repo_name TEXT,
  git_branch TEXT,
  started_at TEXT,
  completed_at TEXT,
  UNIQUE(session_key, source, correlation_id)
);

CREATE INDEX IF NOT EXISTS idx_events_session
ON events(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_events_source
ON events(source, created_at);
