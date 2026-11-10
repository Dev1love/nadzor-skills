#!/usr/bin/env bash
# Records a demo in the real Claude Code UI and renders it for slides.
# tmux gives a terminal of fixed size, asciinema writes the session,
# agg renders a GIF, ffmpeg makes an MP4.
#   record.sh <demo> <out-dir>
# Needs: tmux, asciinema, agg, ffmpeg (brew install tmux asciinema agg ffmpeg).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
DEMO="${1:?usage: record.sh <demo> <out-dir>}"
OUT="${2:?usage: record.sh <demo> <out-dir>}"
COLS=110
ROWS=40
SESSION="tech-check-rec-$DEMO"
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"
CAST="$OUT/$DEMO.cast"

# Recording flags: no permission prompts, no personal status line.
FLAGS="--permission-mode bypassPermissions --settings $ROOT/recording-settings.json"
tmux new-session -d -s "$SESSION" -x "$COLS" -y "$ROWS" \
  "cd '$ROOT/..' && TMPDIR=/tmp TECH_CHECK_CLAUDE_FLAGS='$FLAGS' asciinema rec -q --overwrite -i 1.5 --window-size ${COLS}x${ROWS} -c '$ROOT/run.sh $DEMO' '$CAST'"

screen() { tmux capture-pane -p -t "$SESSION" 2>/dev/null; }

# Each demo copy is a new folder, so Claude Code asks whether to trust it.
REPO=""
for _ in $(seq 1 90); do
  s="$(screen)" || break
  [ -n "$REPO" ] || REPO="$(grep -oE "/tmp/tech-check-$DEMO\.[A-Za-z0-9]+/repo" <<<"$s" | head -1 || true)"
  if grep -q "trust this folder" <<<"$s"; then
    tmux send-keys -t "$SESSION" Down; sleep 0.5; tmux send-keys -t "$SESSION" Enter
    break
  fi
  sleep 1
done
# Claude Code keeps the session log in ~/.claude/projects/<cwd with / and . as ->.
LOGDIR="$HOME/.claude/projects/$(sed 's|[/.]|-|g' <<<"/private$REPO")"

# The final report is a long message of the main session (not of a subagent).
report_ready() {
  python3 - "$LOGDIR" <<'PY'
import json, pathlib, sys
longest = 0
for f in pathlib.Path(sys.argv[1]).glob("*.jsonl"):
    for line in open(f, encoding="utf-8"):
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if e.get("type") == "assistant" and not e.get("isSidechain"):
            for b in e["message"].get("content", []):
                if b.get("type") == "text":
                    longest = max(longest, len(b["text"]))
sys.exit(0 if longest >= 1500 else 1)
PY
}

# Done when: the report is written, the "· done HH:MM" line shows, nothing spins,
# no subagent runs (◯ in the bottom panel) and nothing is awaited. The main session
# may print "done" while a background command or agent still runs, so the report
# check is what really ends the recording.
stable=0
deadline=$((SECONDS + 900))
while [ "$SECONDS" -lt "$deadline" ]; do
  s="$(screen)" || break
  if grep -qE "· done [0-9]" <<<"$s" && ! grep -qE "^\S+ [A-Z][a-z]+… \(" <<<"$s" \
     && ! grep -q "Waiting for" <<<"$s" && ! grep -q "◯" <<<"$s" && report_ready; then
    stable=$((stable + 1))
  else
    stable=0
  fi
  [ "$stable" -ge 2 ] && break
  sleep 5
done
[ "$stable" -ge 2 ] || echo "warning: $DEMO did not finish in 15 min, recording cut" >&2

END_TS="$(date +%s)"
tmux send-keys -t "$SESSION" "/exit" Enter
for _ in $(seq 1 20); do tmux has-session -t "$SESSION" 2>/dev/null || break; sleep 1; done
tmux kill-session -t "$SESSION" 2>/dev/null || true

# Cut everything after /exit (the last frame must be the report), drop
# machine-specific header fields (command path, env), hide the OS user name and
# turn no-break spaces into plain ones (the GIF renderer has no glyph for them).
python3 - "$CAST" "$END_TS" "$DEMO" "$(id -un)" <<'PY'
import json, sys
path, end_ts, demo, user = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
# ls -la and lsof print the file owner; keep the column width
alias = "demo".ljust(len(user))
lines = open(path, encoding="utf-8").read().splitlines()
header = json.loads(lines[0])
limit = end_ts - header["timestamp"] - 0.5
kept, t = [], 0.0
for line in lines[1:]:
    event = json.loads(line)
    t += event[0]
    if t > limit:
        break
    kept.append(line.replace("\\u00a0", " ").replace("\u00a0", " ").replace(user, alias))
header["command"] = f"demos/run.sh {demo}"
header.pop("env", None)
with open(path, "w", encoding="utf-8") as out:
    out.write(json.dumps(header, ensure_ascii=False) + "\n")
    out.write("\n".join(kept) + "\n")
PY

agg --speed 2 --idle-time-limit 1.5 --last-frame-duration 12 --font-size 16 \
  --font-family "Menlo" --theme monokai "$CAST" "$OUT/$DEMO.gif" >/dev/null 2>&1
ffmpeg -v error -y -i "$OUT/$DEMO.gif" -movflags faststart -pix_fmt yuv420p \
  -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "$OUT/$DEMO.mp4"
echo "$OUT/$DEMO.gif"
echo "$OUT/$DEMO.mp4"
