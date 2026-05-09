#!/bin/bash
# Deploy the Sanity Studio to https://madboulyjr-studio.sanity.studio
#
# First run: triggers `sanity login` (browser opens, sign in with the
#            account that owns project f4pxr4lu, login is saved globally
#            in ~/.config/sanity/config.json).
# Future runs: just deploys, no login prompt.
#
# Why this script: the SANITY_WRITE_TOKEN in .env.local is robot-scoped
# (write content only) and cannot deploy a Studio. Studio deploy needs
# user-scoped auth (from interactive login) OR an Administrator-scoped
# robot token. The login flow handles both.

set -e
cd "$(dirname "$0")/.."

echo ""
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║  MAD Studio — Sanity Studio Deploy                ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo ""

# Check if logged in already (config has user.token)
if ! grep -q '"authToken"' ~/.config/sanity/config.json 2>/dev/null; then
  echo "  Not logged in. Opening browser to authenticate…"
  echo ""
  ./node_modules/.bin/sanity login
  echo ""
fi

echo "  Step 1/2: Deploying schema manifest…"
echo "  (Required for Dashboard discovery + Content Agent)"
echo ""
./node_modules/.bin/sanity schema deploy

echo ""
echo "  Step 2/2: Building + deploying Studio app (this takes ~30s)…"
echo ""
./node_modules/.bin/sanity deploy
echo ""
echo "  ✓ Studio live at: https://madboulyjr-studio.sanity.studio"
echo "  ✓ Dashboard:      https://www.sanity.io/manage/project/f4pxr4lu/studios"
echo ""
