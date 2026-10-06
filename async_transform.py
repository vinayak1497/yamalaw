"""One-shot async transform for YamaLaw backend (SQLite-sync -> dual-mode async).

Rules (applied in order):
 1. Protect `function row(/all(/run(` definitions.
 2. `row(<sql>).c` -> `(await row(<sql>)).c`  (COUNT aliases; PG returns int8 as string)
 3. Bare `row(`/`all(`/`run(` -> `await row(` etc. (not after `await `, `.`, or word char)
 4. Route/middleware arrows `(req, res) =>` / `(req, res, next) =>` -> async.
 5. Named sync fns using db -> async: authRequired, loadCaseAndAuthorize inner is
    covered by rule 4, canAccessCase, buildJourney, computeReadiness, evaluate,
    notify, audit, db.exec call sites get awaited via rule 3? (db.exec( -> await db.exec()
 6. Restore protected definitions.
"""
import re
from pathlib import Path

ROOT = Path('backend/src')
FILES = [
    'routes/auth.js', 'routes/cases.js', 'routes/files.js', 'routes/misc.js',
    'middleware/auth.js', 'middleware/rbac.js',
    'services/readiness.js', 'services/legalaid.js', 'services/notify.js',
    'seed.js', 'config.js',
]
TEST = Path('backend/tests/critical.test.js')

WORD = r'(?<![A-Za-z0-9_$.])'
NO_AWAIT = r'(?<!await )'


def transform(src: str, fname: str) -> str:
    # 1. protect definitions
    src = re.sub(r'function (row|all|run)\(', r'function __DEF_\1__(', src)

    # 2. COUNT alias property access: row( ... ).c  (single line only)
    src = re.sub(r'\brow\((.*?)\)\.c', r'(await row(\1)).c', src)

    # 3. bare db calls -> await (skip already-awaited)
    for fn in ('row', 'all', 'run'):
        src = re.sub(rf'(?<!await )(?<![A-Za-z0-9_$.]){fn}\(', f'await {fn}(', src)
    # db.exec( -> await db.exec(
    src = re.sub(r'(?<!await )db\.exec\(', 'await db.exec(', src)

    # 4. arrows -> async arrows (skip already-async)
    src = re.sub(r'(?<!async )(?<![A-Za-z0-9_])\((req, res(?:, next)?)\) =>', r'async (\1) =>', src)

    # 5. named functions
    src = re.sub(r'function authRequired\(req, res, next\)',
                 'async function authRequired(req, res, next)', src)
    src = re.sub(r'function canAccessCase\(user, caseId\)',
                 'async function canAccessCase(user, caseId)', src)
    src = re.sub(r'function buildJourney\(',
                 'async function buildJourney(', src)
    src = re.sub(r'function computeReadiness\(',
                 'async function computeReadiness(', src)
    src = re.sub(r'function evaluate\(',
                 'async function evaluate(', src)
    src = re.sub(r'function notify\(',
                 'async function notify(', src)
    src = re.sub(r'function audit\(',
                 'async function audit(', src)

    # 6. restore
    src = re.sub(r'function __DEF_(row|all|run)__\(', r'function \1(', src)
    return src


for f in FILES:
    p = ROOT / f if not str(f).startswith('backend') else Path(f)
    p = Path('backend/src') / f
    before = p.read_text()
    after = transform(before, f)
    if after != before:
        p.write_text(after)
        print(f'{f}: changed')
    else:
        print(f'{f}: unchanged')
