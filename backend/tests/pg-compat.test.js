'use strict';
/* PG-compat unit tests — verify the SQLite->Postgres SQL translation without a live DB. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { toPg } = require('../src/db');

test('placeholders translate ? -> $n in order', () => {
  assert.equal(toPg('SELECT * FROM users WHERE email=? AND role=?'), 'SELECT * FROM users WHERE email=$1 AND role=$2');
});

test('datetime defaults translate', () => {
  assert.equal(toPg("created_at TEXT DEFAULT (datetime('now'))"), 'created_at TEXT DEFAULT (now()::text)');
  assert.equal(toPg("SET updated_at=datetime('now') WHERE id=?"), 'SET updated_at=now()::text WHERE id=$1');
});

test('COALESCE upserts and COUNT aliases survive translation', () => {
  assert.equal(
    toPg('UPDATE cases SET stage=COALESCE(?,stage) WHERE id=?'),
    'UPDATE cases SET stage=COALESCE($1,stage) WHERE id=$2'
  );
  assert.equal(toPg('SELECT COUNT(*) c FROM users'), 'SELECT COUNT(*) c FROM users');
});
