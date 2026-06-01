#!/usr/bin/env bash
# Download _ide_helper.php and bga-framework.d.ts from BGA Studio.
# Prompts for your BGA SFTP password (from studio.boardgamearena.com/controlpanel).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="macbas0@1.studio.boardgamearena.com"
PORT=2022
REMOTE_DIR="greetingsfromearth"

cd "$ROOT"
echo "Connecting to BGA (enter your SFTP password when prompted)..."
sftp -P "$PORT" "$HOST" <<EOF
cd $REMOTE_DIR
get _ide_helper.php
get bga-framework.d.ts
bye
EOF
echo "Downloaded to $ROOT"
