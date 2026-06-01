#!/usr/bin/env bash
# Store BGA SFTP credentials in .vscode/sftp.json (gitignored).
# Use the SFTP login from your BGA welcome email (NOT your website password).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SFTP_JSON="$ROOT/.vscode/sftp.json"

echo "Find your SFTP login in the BGA Studio welcome email."
echo "It is NOT the same as your website login password."
echo
read -rp "BGA SFTP username (e.g. macbas0): " USER
read -rsp "BGA SFTP password: " PASS
echo

python3 - "$SFTP_JSON" "$USER" "$PASS" <<'PY'
import json, sys
path, username, password = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path) as f:
    cfg = json.load(f)
cfg["username"] = username
cfg["password"] = password
cfg.pop("privateKeyPath", None)
cfg.pop("interactiveAuth", None)
with open(path, "w") as f:
    json.dump(cfg, f, indent=4)
    f.write("\n")
print(f"Updated {path}. Reload Cursor (Developer: Reload Window).")
PY
