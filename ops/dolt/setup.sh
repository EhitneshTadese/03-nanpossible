#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$ROOT_DIR/repo"

mkdir -p "$REPO_DIR"

if [ ! -d "$REPO_DIR/.dolt" ]; then
  (
    cd "$REPO_DIR"
    dolt init --name "WIAL Migration Bot" --email "migration@wial.org"
  )
fi

(
  cd "$REPO_DIR"
  dolt sql < "$ROOT_DIR/schema.sql"
  dolt table import -u source_pages "$ROOT_DIR/generated/source_pages.csv"
  dolt table import -u source_assets "$ROOT_DIR/generated/source_assets.csv"
  dolt table import -u migration_runs "$ROOT_DIR/generated/migration_runs.csv"
  dolt table import -u seed_snapshots "$ROOT_DIR/generated/seed_snapshots.csv"
  dolt table import -u ui_navigation_snapshots "$ROOT_DIR/generated/ui_navigation_snapshots.csv"
  dolt add -A
  dolt commit -m "Bootstrap WIAL migration ledger" >/dev/null 2>&1 || true
)
