CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  source TEXT NOT NULL,
  source_event TEXT NOT NULL,
  repo_path TEXT,
  session_id TEXT,
  turn_id TEXT,
  conversation_id TEXT,
  generation_id TEXT,
  ingested_by_version TEXT,
  normalization_version INTEGER,
  model TEXT,
  role TEXT NOT NULL,
  estimated_input_tokens INTEGER DEFAULT 0,
  estimated_output_tokens INTEGER DEFAULT 0,
  estimated_total_tokens INTEGER DEFAULT 0,
  payload_hash TEXT NOT NULL,
  raw_payload TEXT NOT NULL,
  workspace_path TEXT,
  workspace_home_rel_path TEXT,
  workspace_display_path TEXT,
  git_repo_root TEXT,
  git_repo_root_home_rel_path TEXT,
  git_repo_root_display_path TEXT,
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
  conversation_id TEXT,
  generation_id TEXT,
  tool_canonical_name TEXT,
  mcp_server TEXT,
  mcp_tool TEXT,
  pre_event_id INTEGER,
  post_event_id INTEGER,
  failure_event_id INTEGER,
  arg_token_estimate INTEGER DEFAULT 0,
  result_token_estimate INTEGER DEFAULT 0,
  workspace_path TEXT,
  workspace_home_rel_path TEXT,
  workspace_display_path TEXT,
  git_repo_root TEXT,
  git_repo_root_home_rel_path TEXT,
  git_repo_root_display_path TEXT,
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

CREATE TABLE IF NOT EXISTS schema_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS data_fix_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_key TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  actor_kind TEXT NOT NULL,
  specialization TEXT NOT NULL,
  display_label TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_profile_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_profile_id INTEGER NOT NULL,
  config_fingerprint TEXT NOT NULL,
  config_json TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  raw_evidence_event_id INTEGER,
  UNIQUE(agent_profile_id, config_fingerprint),
  FOREIGN KEY (agent_profile_id) REFERENCES agent_profiles(id)
);

CREATE TABLE IF NOT EXISTS execution_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_profile_id INTEGER NOT NULL,
  observation_id INTEGER NOT NULL,
  source TEXT NOT NULL,
  session_id TEXT,
  conversation_id TEXT,
  turn_id TEXT,
  parent_instance_id INTEGER,
  delegation_correlation_id TEXT,
  transcript_path TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  FOREIGN KEY (agent_profile_id) REFERENCES agent_profiles(id),
  FOREIGN KEY (observation_id) REFERENCES agent_profile_observations(id),
  FOREIGN KEY (parent_instance_id) REFERENCES execution_instances(id)
);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_source
ON agent_profiles(source, last_seen_at);

CREATE INDEX IF NOT EXISTS idx_agent_observations_profile
ON agent_profile_observations(agent_profile_id, last_seen_at);

CREATE INDEX IF NOT EXISTS idx_execution_instances_correlation
ON execution_instances(source, delegation_correlation_id, ended_at);

CREATE INDEX IF NOT EXISTS idx_execution_instances_session
ON execution_instances(session_id, started_at);
