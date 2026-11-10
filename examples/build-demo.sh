#!/usr/bin/env bash
# Builds the demo shop with a realistic git history into <target-dir>:
#   main               clean skeleton, a secret committed and then "removed"
#   feature/3-orders   the agent's work on tasks #3 and #4 (checked out at the end)
# Skills under test must run on the built copy, not inside this repo:
# examples/PLANTED.md lists the planted problems and must stay out of their reach.
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
APP="$SRC/demo-app"
HIST="$SRC/demo-history"
TARGET="${1:?usage: build-demo.sh <target-dir>}"

if [ -e "$TARGET" ] && [ -n "$(ls -A "$TARGET" 2>/dev/null)" ]; then
  echo "target is not empty: $TARGET" >&2
  exit 1
fi
mkdir -p "$TARGET"
TARGET="$(cd "$TARGET" && pwd)"

g() { git -C "$TARGET" -c commit.gpgsign=false -c core.hooksPath=/dev/null "$@"; }

# put <src-root> <path...>: copy files keeping relative paths
put() {
  local root="$1"; shift
  for path in "$@"; do
    mkdir -p "$TARGET/$(dirname "$path")"
    cp "$root/$path" "$TARGET/$path"
  done
}

commit() {
  local who="$1" date="$2" msg="$3"
  local name email
  if [ "$who" = dev ]; then name="Dev"; email="dev@shop.example"; else name="AI Agent"; email="agent@shop.example"; fi
  g add -A
  GIT_AUTHOR_NAME="$name" GIT_AUTHOR_EMAIL="$email" GIT_AUTHOR_DATE="$date" \
  GIT_COMMITTER_NAME="$name" GIT_COMMITTER_EMAIL="$email" GIT_COMMITTER_DATE="$date" \
    g commit -q -m "$msg"
}

g init -q -b main

# --- main ---------------------------------------------------------------
put "$APP" package.json package-lock.json .env.example
put "$HIST/base" src/db.js src/auth.js src/server.js test/auth.test.js
commit dev "2026-10-01T10:00:00+03:00" "#1: каркас магазина: каталог, регистрация, вход"

cat > "$TARGET/.env" <<'EOF'
PORT=3000
PAYGATE_SECRET_KEY=pg_live_7Hq2kT9xLm4Rv8Wz1Bn6Yc3Fd5Gs0Jp
PAYGATE_WEBHOOK_SECRET=whk_9aF3kL7mQ2xR8vT4nB6yC1dG5hJ0pW
ADMIN_EMAIL=admin@shop.example
ADMIN_PASSWORD=Adm1n-Shop-2026!
EOF
commit dev "2026-10-02T12:30:00+03:00" "настройки платёжки"

rm "$TARGET/.env"
put "$APP" .gitignore
commit dev "2026-10-03T09:15:00+03:00" "#2: убрал .env из репозитория"

put "$APP" TASKS.md
commit dev "2026-10-05T11:00:00+03:00" "задачи в TASKS.md"

# --- feature/3-orders (the agent) --------------------------------------
g checkout -q -b feature/3-orders

put "$APP" src/db.js src/services/pricing.js src/services/orderService.js src/routes/admin.js src/lib/format.js
put "$HIST/f1" src/routes/orders.js
commit agent "2026-10-06T14:00:00+03:00" "#3: заказы, расчёт суммы, промокоды"

put "$APP" src/notifications/index.js
commit agent "2026-10-06T15:20:00+03:00" "add notifications"

put "$APP" src/routes/webhooks.js src/lib/paygate.js public/index.html public/app.js
commit agent "2026-10-07T10:40:00+03:00" "#3: оплата через PayGate"

put "$APP" test/pricing.test.js test/promo.test.js
commit agent "2026-10-07T13:05:00+03:00" "fix tests"

put "$APP" src/routes/users.js src/server.js src/auth.js test/auth.test.js
commit agent "2026-10-07T16:30:00+03:00" "#3: профиль и обработка ошибок"

put "$APP" src/routes/orders.js test/orders.test.js AGENT_REPORT.md
commit agent "2026-10-08T11:10:00+03:00" "#4: промокод не применяется сверх max_uses"

# --- self-check: the branch head must match demo-app exactly ------------
if ! diff -r -x .git -x node_modules -x '*.db' "$APP" "$TARGET" >/dev/null; then
  echo "built tree differs from demo-app:" >&2
  diff -rq -x .git -x node_modules -x '*.db' "$APP" "$TARGET" >&2 || true
  exit 1
fi

echo "built: $TARGET (branch feature/3-orders, base main)"
