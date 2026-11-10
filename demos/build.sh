#!/usr/bin/env bash
# Builds a demo repo with its git history from demos/<demo>/steps/*:
# every step folder is laid over the tree and committed. Step metadata lives in
# <step>/.commit (branch, who, date, message); <step>/.delete lists files to remove.
#   build.sh <demo> <target-dir>
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
DEMO="${1:?usage: build.sh <demo> <target-dir>}"
TARGET="${2:?usage: build.sh <demo> <target-dir>}"
STEPS="$ROOT/$DEMO/steps"
[ -d "$STEPS" ] || { echo "unknown demo: $DEMO" >&2; exit 1; }
if [ -e "$TARGET" ] && [ -n "$(ls -A "$TARGET" 2>/dev/null)" ]; then
  echo "target is not empty: $TARGET" >&2; exit 1
fi
mkdir -p "$TARGET"

g() { git -C "$TARGET" -c commit.gpgsign=false -c core.hooksPath=/dev/null "$@"; }
meta() { sed -n "s/^$1=//p" "$2"; }

g init -q -b main
for step in "$STEPS"/*/; do
  m="$step.commit"
  branch="$(meta branch "$m")"; who="$(meta who "$m")"; date="$(meta date "$m")"; msg="$(meta message "$m")"
  if [ "$(g branch --show-current)" != "$branch" ]; then
    if g show-ref -q --verify "refs/heads/$branch"; then g checkout -q "$branch"; else g checkout -q -b "$branch"; fi
  fi
  (cd "$step" && find . -type f ! -name .commit ! -name .delete) | while read -r f; do
    mkdir -p "$TARGET/$(dirname "$f")"; cp "$step/$f" "$TARGET/$f"
  done
  if [ -f "$step.delete" ]; then
    while read -r f; do [ -n "$f" ] && g rm -q --cached --ignore-unmatch "$f" && unlink "$TARGET/$f"; done < "$step.delete"
  fi
  if [ "$who" = agent ]; then name="AI Agent"; email="agent@demo.example"; else name="Dev"; email="dev@demo.example"; fi
  g add -A
  GIT_AUTHOR_NAME="$name" GIT_AUTHOR_EMAIL="$email" GIT_AUTHOR_DATE="$date" \
  GIT_COMMITTER_NAME="$name" GIT_COMMITTER_EMAIL="$email" GIT_COMMITTER_DATE="$date" \
    g commit -q -m "$msg"
done
echo "$TARGET"
