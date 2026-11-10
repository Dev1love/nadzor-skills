#!/usr/bin/env bash
# The checks a robot runs on every pull request before it can be merged.
#   red (exit 1):    a secret in the PR's commits, or failing tests
#   yellow (warning): skipped tests, or no test command found
# Runs the same locally and in CI:
#   ci/gate.sh [base-ref]      base defaults to origin/main
set -uo pipefail

BASE="${1:-origin/main}"
red=0

warn() {
  if [ -n "${GITHUB_ACTIONS:-}" ]; then echo "::warning::$1"; else echo "YELLOW: $1"; fi
}
fail() {
  if [ -n "${GITHUB_ACTIONS:-}" ]; then echo "::error::$1"; else echo "RED: $1"; fi
  red=1
}

echo "== Secrets in commits $BASE..HEAD"
# Only the PR's own commits: an old leak is fixed by rotating the key, not by blocking every PR.
if gitleaks git --log-opts="$BASE..HEAD" --redact --no-banner .; then
  echo "no secrets found"
else
  fail "a secret was committed in this PR: rotate it, removing it from the file is not enough"
fi

echo "== Tests"
if [ -f package.json ] && grep -q '"test"' package.json; then
  out="$(npm test 2>&1)"; code=$?
elif [ -f pyproject.toml ] || [ -f pytest.ini ] || [ -f setup.cfg ]; then
  out="$(python -m pytest -q 2>&1)"; code=$?
elif [ -f Makefile ] && grep -q '^test:' Makefile; then
  out="$(make test 2>&1)"; code=$?
else
  out=""; code=0
  warn "no test command found (package.json, pytest or make test)"
fi
printf '%s\n' "$out" | tail -25

if [ "$code" -ne 0 ]; then
  fail "tests fail"
fi
# node --test: "# skipped 1"; jest/vitest/pytest: "1 skipped"
skipped="$(printf '%s\n' "$out" | grep -Eio '# skipped [0-9]+|[0-9]+ skipped' | grep -Eo '[0-9]+' | head -1)"
if [ -n "$skipped" ] && [ "$skipped" -gt 0 ]; then
  warn "$skipped test(s) skipped: «tests pass» may hide a switched-off test"
fi

if [ "$red" -eq 1 ]; then
  echo "== Gate: RED, merge is blocked"
  exit 1
fi
echo "== Gate: GREEN"
