#!/usr/bin/env bash
# Builds a fresh copy of a demo, installs only its skill and starts Claude Code on it.
#   run.sh <demo>              interactive session (for the stage)
#   run.sh <demo> --headless   claude -p, prints the report (for rehearsal)
# The demo name equals the skill name; the request is in demos/<demo>/prompt.txt.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
DEMO="${1:?usage: run.sh <demo> [--headless]}"
MODE="${2:-}"
PROMPT="/$DEMO $(cat "$ROOT/$DEMO/prompt.txt")"

REPO="$(mktemp -d "${TMPDIR:-/tmp}/nadzor-$DEMO.XXXX")/repo"
"$ROOT/build.sh" "$DEMO" "$REPO" >/dev/null
mkdir -p "$REPO/.claude/skills"
cp -R "$ROOT/../skills/$DEMO" "$REPO/.claude/skills/"
printf '.claude/\n' >> "$REPO/.git/info/exclude"
echo "demo repo: $REPO" >&2
cd "$REPO"

if [ "$MODE" = "--headless" ]; then
  claude -p "$PROMPT" --permission-mode bypassPermissions --output-format stream-json --verbose \
    | python3 -c '
import json, sys
results = [e for e in map(json.loads, sys.stdin) if e.get("type") == "result"]
if results:
    report = max(results, key=lambda r: len(r.get("result") or ""))
    cost = max(r.get("total_cost_usd") or 0 for r in results)
    print(report.get("result", ""))
    print(f"\n---\ncost: ${cost:.2f}")
'
else
  exec claude "$PROMPT"
fi
