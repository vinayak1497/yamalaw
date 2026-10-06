-- YamaLaw initial schema (generated from backend/src/db.js — do not hand-edit).
-- Regenerate with: node scripts/gen-migration.js
-- Safe to apply multiple times (all statements use IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('CITIZEN','LAWYER','JUDGE','POLICE','ADMIN')),
  phone TEXT DEFAULT '',
  language TEXT DEFAULT 'en',
  created_at TEXT NOT NULL DEFAULT (now()::text),
  is_demo INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS citizen_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state TEXT DEFAULT '', district TEXT DEFAULT '', annual_income INTEGER DEFAULT 0,
  category TEXT DEFAULT '', gender TEXT DEFAULT '', address TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS lawyer_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bar_id TEXT DEFAULT '', specialization TEXT DEFAULT '', experience_years INTEGER DEFAULT 0,
  languages TEXT DEFAULT 'en,hi', available INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS judge_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  court_name TEXT DEFAULT '', designation TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS police_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  station_name TEXT DEFAULT '', badge_id TEXT DEFAULT '', jurisdiction TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS legal_categories (
  id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name_en TEXT NOT NULL,
  name_hi TEXT DEFAULT '', name_mr TEXT DEFAULT '',
  description TEXT DEFAULT '', authority TEXT DEFAULT '', is_demo INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS journey_templates (
  id TEXT PRIMARY KEY, category_id TEXT NOT NULL REFERENCES legal_categories(id),
  version INTEGER NOT NULL DEFAULT 1, title TEXT NOT NULL, is_demo INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS journey_template_stages (
  id TEXT PRIMARY KEY, template_id TEXT NOT NULL REFERENCES journey_templates(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, title TEXT NOT NULL, explanation TEXT DEFAULT '',
  actor TEXT DEFAULT 'CITIZEN', deadline_days INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS journey_template_tasks (
  id TEXT PRIMARY KEY, stage_id TEXT NOT NULL REFERENCES journey_template_stages(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, title TEXT NOT NULL, kind TEXT DEFAULT 'action',
  required INTEGER DEFAULT 1, document_key TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS legal_issues (
  id TEXT PRIMARY KEY, citizen_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL, description TEXT NOT NULL, category_id TEXT REFERENCES legal_categories(id),
  status TEXT DEFAULT 'OPEN', jurisdiction TEXT DEFAULT '', created_at TEXT DEFAULT (now()::text),
  is_demo INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_issues_citizen ON legal_issues(citizen_id);

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY, case_number TEXT NOT NULL UNIQUE,
  issue_id TEXT REFERENCES legal_issues(id), citizen_id TEXT NOT NULL REFERENCES users(id),
  lawyer_id TEXT REFERENCES users(id), judge_id TEXT REFERENCES users(id),
  title TEXT NOT NULL, category_id TEXT REFERENCES legal_categories(id),
  stage TEXT DEFAULT 'INTAKE', status TEXT DEFAULT 'OPEN',
  jurisdiction TEXT DEFAULT '', facts TEXT DEFAULT '',
  created_at TEXT DEFAULT (now()::text), updated_at TEXT DEFAULT (now()::text),
  is_demo INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cases_citizen ON cases(citizen_id);
CREATE INDEX IF NOT EXISTS idx_cases_lawyer ON cases(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);

CREATE TABLE IF NOT EXISTS case_parties (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  name TEXT NOT NULL, kind TEXT DEFAULT 'OPPOSITE', contact TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS legal_journeys (
  id TEXT PRIMARY KEY, case_id TEXT REFERENCES cases(id) ON DELETE CASCADE,
  issue_id TEXT REFERENCES legal_issues(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES journey_templates(id),
  current_stage_position INTEGER DEFAULT 0, status TEXT DEFAULT 'ACTIVE',
  created_at TEXT DEFAULT (now()::text)
);
CREATE TABLE IF NOT EXISTS journey_stages (
  id TEXT PRIMARY KEY, journey_id TEXT NOT NULL REFERENCES legal_journeys(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, title TEXT NOT NULL, explanation TEXT DEFAULT '',
  actor TEXT DEFAULT 'CITIZEN', deadline_days INTEGER DEFAULT 0,
  status TEXT DEFAULT 'PENDING', completed_at TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS journey_tasks (
  id TEXT PRIMARY KEY, stage_id TEXT NOT NULL REFERENCES journey_stages(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, title TEXT NOT NULL, kind TEXT DEFAULT 'action',
  required INTEGER DEFAULT 1, document_key TEXT DEFAULT '',
  status TEXT DEFAULT 'PENDING', completed_at TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS journey_requirements (
  id TEXT PRIMARY KEY, journey_id TEXT NOT NULL REFERENCES legal_journeys(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, label TEXT NOT NULL, document_key TEXT DEFAULT '',
  status TEXT DEFAULT 'MISSING'
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY, case_id TEXT REFERENCES cases(id) ON DELETE CASCADE,
  issue_id TEXT REFERENCES legal_issues(id) ON DELETE SET NULL,
  uploader_id TEXT NOT NULL REFERENCES users(id),
  filename TEXT NOT NULL, stored_path TEXT NOT NULL, mime TEXT NOT NULL,
  size_bytes INTEGER DEFAULT 0, sha256 TEXT NOT NULL,
  title TEXT DEFAULT '', document_key TEXT DEFAULT '',
  page_count INTEGER DEFAULT 0, detected_language TEXT DEFAULT '',
  created_at TEXT DEFAULT (now()::text), is_demo INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_docs_case ON documents(case_id);
CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL, stored_path TEXT NOT NULL, sha256 TEXT NOT NULL,
  created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY, evidence_code TEXT NOT NULL UNIQUE,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  uploader_id TEXT NOT NULL REFERENCES users(id),
  filename TEXT NOT NULL, stored_path TEXT NOT NULL, mime TEXT NOT NULL,
  size_bytes INTEGER DEFAULT 0, sha256 TEXT NOT NULL,
  evidence_type TEXT DEFAULT 'DOCUMENT', description TEXT DEFAULT '',
  status TEXT DEFAULT 'STORED', verified_at TEXT DEFAULT '',
  created_at TEXT DEFAULT (now()::text), is_demo INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id);
CREATE TABLE IF NOT EXISTS evidence_access_log (
  id TEXT PRIMARY KEY, evidence_id TEXT NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL,
  detail TEXT DEFAULT '', created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS case_tasks (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT DEFAULT '', assignee_id TEXT REFERENCES users(id),
  due_date TEXT DEFAULT '', priority TEXT DEFAULT 'MEDIUM',
  status TEXT DEFAULT 'PENDING', related_stage_id TEXT DEFAULT '',
  created_at TEXT DEFAULT (now()::text)
);
CREATE INDEX IF NOT EXISTS idx_tasks_case ON case_tasks(case_id);

CREATE TABLE IF NOT EXISTS hearings (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL, scheduled_at TEXT NOT NULL, venue TEXT DEFAULT '',
  mode TEXT DEFAULT 'PHYSICAL', status TEXT DEFAULT 'SCHEDULED',
  notes TEXT DEFAULT '', meeting_url TEXT DEFAULT '', is_demo INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (now()::text)
);
CREATE TABLE IF NOT EXISTS hearing_participants (
  id TEXT PRIMARY KEY, hearing_id TEXT NOT NULL REFERENCES hearings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id), role_label TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS case_notes (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL,
  visibility TEXT DEFAULT 'TEAM', created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL,
  created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS firs (
  id TEXT PRIMARY KEY, fir_number TEXT NOT NULL UNIQUE,
  case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
  complainant_id TEXT NOT NULL REFERENCES users(id),
  station_name TEXT DEFAULT '', incident_date TEXT DEFAULT '',
  place TEXT DEFAULT '', description TEXT NOT NULL,
  sections TEXT DEFAULT '', status TEXT DEFAULT 'FILED',
  created_at TEXT DEFAULT (now()::text), is_demo INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS legal_aid_providers (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT DEFAULT 'DLSA',
  state TEXT DEFAULT '', district TEXT DEFAULT '', contact TEXT DEFAULT '',
  address TEXT DEFAULT '', languages TEXT DEFAULT 'en,hi',
  focus_areas TEXT DEFAULT '', is_demo INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS legal_aid_rules (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '',
  max_income INTEGER DEFAULT 0, categories TEXT DEFAULT '',
  states TEXT DEFAULT '', is_demo INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS legal_aid_applications (
  id TEXT PRIMARY KEY, citizen_id TEXT NOT NULL REFERENCES users(id),
  provider_id TEXT REFERENCES legal_aid_providers(id),
  case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'DRAFT', reason TEXT DEFAULT '',
  created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS research_documents (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, court TEXT DEFAULT '',
  doc_date TEXT DEFAULT '', citation TEXT DEFAULT '',
  summary TEXT DEFAULT '', content TEXT DEFAULT '',
  tags TEXT DEFAULT '', source TEXT DEFAULT 'YamaLaw Legal Library (demo)',
  is_demo INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS research_bookmarks (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES research_documents(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (now()::text)
);
CREATE TABLE IF NOT EXISTS research_notes (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id TEXT REFERENCES research_documents(id) ON DELETE SET NULL,
  case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
  body TEXT NOT NULL, created_at TEXT DEFAULT (now()::text)
);
CREATE TABLE IF NOT EXISTS case_research_links (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES research_documents(id) ON DELETE CASCADE,
  linked_by TEXT NOT NULL REFERENCES users(id), created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, title TEXT NOT NULL, body TEXT DEFAULT '',
  case_id TEXT DEFAULT '', read_at TEXT DEFAULT '',
  created_at TEXT DEFAULT (now()::text)
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY, case_id TEXT DEFAULT '', issue_id TEXT DEFAULT '',
  actor_id TEXT DEFAULT '', event_type TEXT NOT NULL, detail TEXT DEFAULT '',
  created_at TEXT DEFAULT (now()::text)
);
CREATE INDEX IF NOT EXISTS idx_audit_case ON audit_events(case_id);
