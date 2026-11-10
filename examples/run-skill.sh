#!/usr/bin/env bash
# Runs one skill on a fresh copy of the demo shop in a clean Claude Code session.
#   run-skill.sh <skill> <work-dir>
# The copy gets only the skill under test (.claude/skills/<skill>) and no PLANTED.md.
# Output: <work-dir>/log.jsonl (full session), <work-dir>/report.md (final answer).
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
SKILL="${1:?usage: run-skill.sh <skill> <work-dir>}"
WORK="${2:?usage: run-skill.sh <skill> <work-dir>}"

case "$SKILL" in
  dry-kiss-yagni-srp) ARGS="ревью изменений ветки feature/3-orders относительно main" ;;
  test-auditor)      ARGS="аудит тестов в изменениях ветки feature/3-orders относительно main" ;;
  security-audit)    ARGS="аудит всего проекта перед релизом. Живого сайта нет, приложение можно поднимать только локально" ;;
  verify-claims)     ARGS="агент отчитался о готовности задач #3 и #4: отчёт в AGENT_REPORT.md, задачи в TASKS.md, ветка feature/3-orders, base main" ;;
  task-trail)        ARGS="аудит следа: ветка feature/3-orders относительно main и вся история репозитория, задачи в TASKS.md" ;;
  leak-guard)        ARGS="проверь перед выкладкой. Живого адреса нет, проверяем только репозиторий и локальный запуск" ;;
  *) echo "unknown skill: $SKILL" >&2; exit 1 ;;
esac

REPO="$WORK/repo"
"$SRC/build-demo.sh" "$REPO" >/dev/null
(cd "$REPO" && npm install --silent >/dev/null 2>&1)
mkdir -p "$REPO/.claude/skills"
cp -R "$SRC/../skills/$SKILL" "$REPO/.claude/skills/"
printf '.claude/\nnode_modules/\npackage-lock.json\n' >> "$REPO/.git/info/exclude"

cd "$REPO"
claude -p "/$SKILL $ARGS" \
  --permission-mode bypassPermissions \
  --output-format stream-json --verbose \
  > "$WORK/log.jsonl" 2> "$WORK/stderr.log" || true

python3 - "$WORK/log.jsonl" "$WORK/report.md" <<'EOF'
import json, sys
# A skill that runs its subagent in the background makes the session answer several
# times (interim note, full report, short wrap-up). The report is the longest answer.
results = []
for line in open(sys.argv[1], encoding="utf-8"):
    try:
        event = json.loads(line)
    except ValueError:
        continue
    if event.get("type") == "result":
        results.append(event)
with open(sys.argv[2], "w", encoding="utf-8") as out:
    if not results:
        out.write("(no result event: see log.jsonl / stderr.log)\n")
    else:
        report = max(results, key=lambda r: len(r.get("result") or ""))
        minutes = sum(r.get("duration_ms") or 0 for r in results) / 60000
        cost = max(r.get("total_cost_usd") or 0 for r in results)
        out.write(report.get("result") or "")
        out.write("\n\n---\n")
        out.write(f"answers: {len(results)}, main-session time: {minutes:.1f} min, cost: ${cost:.2f}\n")
EOF
echo "done: $WORK/report.md"
