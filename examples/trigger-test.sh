#!/usr/bin/env bash
# Checks that skills fire on plain phrases, not only on /skill-name.
#   trigger-test.sh <work-dir>
# All six skills are installed into one copy of the demo shop; every phrase runs in a
# fresh session limited to a few turns, and we record which skill the session invoked.
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
WORK="${1:?usage: trigger-test.sh <work-dir>}"
REPO="$WORK/repo"

"$SRC/build-demo.sh" "$REPO" >/dev/null
mkdir -p "$REPO/.claude/skills"
cp -R "$SRC/../skills/"* "$REPO/.claude/skills/"
printf '.claude/\n' >> "$REPO/.git/info/exclude"

PHRASES=(
  "verify-claims|агент говорит, что задачи #3 и #4 готовы. Правда ли он всё сделал?"
  "dry-kiss-yagni|посмотри изменения ветки: нет ли переусложнения и бизнес-логики в роутах"
  "test-auditor|тесты в этой ветке вообще что-то ловят?"
  "security-audit|проверь безопасность проекта перед релизом"
  "leak-guard|можно выкладывать? нет ли утечек ключей"
  "task-trail|почему в pricing.js доставка всегда 300? откуда это взялось"
)

cd "$REPO"
printf '| ожидали | фраза | сработал |\n|---|---|---|\n' > "$WORK/triggers.md"
for entry in "${PHRASES[@]}"; do
  expected="${entry%%|*}"
  phrase="${entry#*|}"
  log="$WORK/$expected.jsonl"
  claude -p "$phrase" --max-turns 3 --permission-mode bypassPermissions \
    --output-format stream-json --verbose > "$log" 2>/dev/null || true
  fired=$(python3 - "$log" <<'EOF'
import json, sys
names = []
for line in open(sys.argv[1], encoding="utf-8"):
    try:
        event = json.loads(line)
    except ValueError:
        continue
    if event.get("type") != "assistant":
        continue
    for block in event["message"].get("content", []):
        if block.get("type") == "tool_use" and block.get("name") == "Skill":
            names.append(block["input"].get("skill", "?"))
print(", ".join(names) or "(ни один)")
EOF
)
  printf '| %s | %s | %s |\n' "$expected" "$phrase" "$fired" >> "$WORK/triggers.md"
done
cat "$WORK/triggers.md"
