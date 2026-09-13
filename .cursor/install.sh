#!/usr/bin/env bash
# Idempotent bootstrap for the Remate monorepo development environment.
# Runs after the repository is checked out. Safe to run repeatedly.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

echo "==> Installing workspace dependencies (npm workspaces)"
npm install

# Bun powers the web/shared test scripts ("bun test"). It is not part of the
# base image, so install it here if it is missing. Installs to ~/.bun and
# appends itself to ~/.bashrc for interactive shells.
if ! command -v bun >/dev/null 2>&1 && [ ! -x "$HOME/.bun/bin/bun" ]; then
  echo "==> Installing bun (test runner for web/shared workspaces)"
  curl -fsSL https://bun.sh/install | bash
fi

# Seed per-app local env files from the tracked examples when absent. These are
# gitignored, so a fresh checkout has none. Defaults point at the public
# Hedera/Arc testnets and the committed contract addresses, which is enough to
# run and browse the apps. Secrets (operator keys) stay empty by design.
seed_env() {
  local example="$1" target="$2"
  if [ -f "$example" ] && [ ! -f "$target" ]; then
    cp "$example" "$target"
    echo "==> Seeded $target from $(basename "$example")"
  fi
}

seed_env "apps/web/.env.example" "apps/web/.env.local"
seed_env "apps/landing/.env.example" "apps/landing/.env.local"

echo "==> Install complete"
