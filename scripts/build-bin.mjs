#!/usr/bin/env node
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, '..');
const binPath = resolve(projectDir, 'bin', 'metis');

const content = `#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENTRY_POINT="$PROJECT_DIR/dist/cli.js"

if [[ ! -f "$ENTRY_POINT" ]]; then
  echo "Error: Compiled entry point not found at $ENTRY_POINT" >&2
  echo "Run: npm run build" >&2
  exit 1
fi

exec node "$ENTRY_POINT" "$@"
`;

mkdirSync(dirname(binPath), { recursive: true });
writeFileSync(binPath, content, 'utf-8');
chmodSync(binPath, 0o755);
