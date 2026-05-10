-- Peery MVP Database Schema
-- Cloudflare D1 (SQLite)
-- Migration: 0001_initial

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  git_url TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  deep_review TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'uncategorized',
  use_cases TEXT NOT NULL DEFAULT '[]',
  when_to_use TEXT NOT NULL DEFAULT '',
  how_to_use TEXT NOT NULL DEFAULT '',
  platforms TEXT NOT NULL DEFAULT '[]',
  setup_complexity TEXT NOT NULL DEFAULT 'medium' CHECK(setup_complexity IN ('low', 'medium', 'high')),
  requires TEXT NOT NULL DEFAULT '[]',
  highlights TEXT NOT NULL DEFAULT '[]',
  score_json TEXT NOT NULL DEFAULT '{}',
  github_stars INTEGER NOT NULL DEFAULT 0,
  ranking_score REAL NOT NULL DEFAULT 0.0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS versions (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  git_sha TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT '',
  scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL CHECK(status IN ('pass', 'fail'))
);

CREATE TABLE IF NOT EXISTS scan_logs (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES versions(id),
  scanner TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS graph_edges (
  id TEXT PRIMARY KEY,
  source_skill_id TEXT NOT NULL,
  target_skill_id TEXT NOT NULL,
  edge_type TEXT NOT NULL CHECK(edge_type IN ('similar_to', 'extends', 'depends_on')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(source_skill_id, target_skill_id, edge_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skills_git_url ON skills(git_url);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_ranking ON skills(ranking_score DESC);
CREATE INDEX IF NOT EXISTS idx_versions_skill_id ON versions(skill_id);
CREATE INDEX IF NOT EXISTS idx_versions_sha ON versions(skill_id, git_sha);
CREATE INDEX IF NOT EXISTS idx_scan_logs_version ON scan_logs(version_id);
CREATE INDEX IF NOT EXISTS idx_graph_source ON graph_edges(source_skill_id);
CREATE INDEX IF NOT EXISTS idx_graph_target ON graph_edges(target_skill_id);
