'use strict';
/* Generates supabase/migrations/<ts>_yamalaw_schema.sql from the single
   source of truth (backend/src/db.js SCHEMA), translated for Postgres.
   Run: node scripts/gen-migration.js
   The backend ALSO applies this DDL idempotently at boot, so the migration
   file is documentation + `supabase db push` support, never a sole dependency. */
const fs = require('fs');
const path = require('path');
const { toPg, SCHEMA } = require('../src/db');

const pg = toPg(SCHEMA).trim();
const header = `-- YamaLaw initial schema (generated from backend/src/db.js — do not hand-edit).
-- Regenerate with: node scripts/gen-migration.js
-- Safe to apply multiple times (all statements use IF NOT EXISTS).

`;
const dir = path.join(__dirname, '..', '..', 'supabase', 'migrations');
fs.mkdirSync(dir, { recursive: true });
// single stable filename (content is idempotent, no version chain needed for v1)
const out = path.join(dir, '20261006000000_yamalaw_schema.sql');
fs.writeFileSync(out, header + pg + '\n');
console.log('wrote', out);
