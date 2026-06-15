#!/usr/bin/env bash
# Assemble the deployable `florence-platform` monorepo from the five app dirs in
# florence-work, plus render.yaml / DEPLOY_PLATFORM.md / smoke_check.sh. Copies
# each app's WORKING TREE (so in-progress edits are included) while honoring its
# .gitignore (so node_modules / dist / runtime data / .env are excluded). Then
# initializes a fresh git history and prints the push commands.
#
#   bash scripts/assemble-monorepo.sh [TARGET_DIR]
#   (default TARGET_DIR = ../florence-platform, i.e. ~/florence-platform)
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-$(cd "$SRC/.." && pwd)/florence-platform}"
APPS=(florence-core florence-academy florence-pathway-agent florence-ats-connect labor-economics-agent)

echo "source : $SRC"
echo "target : $TARGET"

if [ -e "$TARGET" ] && [ -n "$(ls -A "$TARGET" 2>/dev/null || true)" ]; then
  echo "✗ target exists and is non-empty: $TARGET"
  echo "  remove it or pass a different path: bash scripts/assemble-monorepo.sh /path/to/new-repo"
  exit 1
fi
mkdir -p "$TARGET"

copy_app() {
  local app="$1" s="$SRC/$1" d="$TARGET/$1"
  [ -d "$s" ] || { echo "  - $app: MISSING, skipped"; return; }
  mkdir -p "$d"
  if [ -d "$s/.git" ]; then
    # Git repo: copy tracked + new-untracked files (respects .gitignore), from the
    # WORKING TREE (includes uncommitted edits) — NOT `git archive`, which is HEAD-only.
    ( cd "$s" && git ls-files --cached --others --exclude-standard -z ) \
      | rsync -a --from0 --files-from=- "$s/" "$d/"
  else
    rsync -a \
      --exclude node_modules --exclude dist --exclude data --exclude data_seed \
      --exclude '.env' --exclude '.env.*' --exclude '*.log' --exclude .DS_Store --exclude .git \
      "$s/" "$d/"
  fi
  echo "  ✓ $app  ($(find "$d" -type f | wc -l | tr -d ' ') files)"
}

echo "copying apps:"
for app in "${APPS[@]}"; do copy_app "$app"; done

echo "copying platform files:"
for f in render.yaml DEPLOY_PLATFORM.md docker-compose.yml Caddyfile .env.testserver.example DEPLOY_TESTSERVER.md; do
  [ -f "$SRC/$f" ] && cp "$SRC/$f" "$TARGET/$f" && echo "  ✓ $f"
done
mkdir -p "$TARGET/scripts"
cp "$SRC/scripts/smoke_check.sh" "$TARGET/scripts/smoke_check.sh" && echo "  ✓ scripts/smoke_check.sh"

cat > "$TARGET/.gitignore" <<'EOF'
# Defense-in-depth (each app also has its own .gitignore)
node_modules/
dist/
data/
*.log
.DS_Store
.env
.env.*
!.env.example
EOF

cat > "$TARGET/README.md" <<'EOF'
# FlorenceRN Platform

One SSO login across Academy, Pathway, ATS Connect, and the Workforce Economist,
unified by **florence-core** (RS256 identity service). Deploy with the root
`render.yaml` (Render Blueprint) behind Cloudflare — see **DEPLOY_PLATFORM.md**.

Apps: `florence-core` · `florence-academy` · `florence-pathway-agent` ·
`florence-ats-connect` · `labor-economics-agent`.

Verify a deploy (or local lvh.me): `bash scripts/smoke_check.sh <core_url> <email> <password>`.
EOF
echo "  ✓ .gitignore + README.md"

cd "$TARGET"
git init -q -b main
git add -A
git -c user.email="setup@florenceeducation.com" -c user.name="FlorenceRN Setup" \
  commit -q -m "FlorenceRN platform: unified SSO (core + 4 apps) + Render blueprint"
echo
echo "✓ monorepo assembled + committed at: $TARGET"
echo "  $(git rev-list --count HEAD) commit · $(git ls-files | wc -l | tr -d ' ') files tracked"
echo
echo "Next — create the GitHub repo and push:"
echo "  # Option A (GitHub CLI):"
echo "  cd \"$TARGET\" && gh repo create florence-platform --private --source=. --remote=origin --push"
echo
echo "  # Option B (manual): create an empty 'florence-platform' repo on github.com, then:"
echo "  cd \"$TARGET\""
echo "  git remote add origin git@github.com:<your-org>/florence-platform.git"
echo "  git push -u origin main"
echo
echo "Then in Render: New → Blueprint → pick this repo → Apply (see DEPLOY_PLATFORM.md)."
