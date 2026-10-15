#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
image="${1:-mcp-failure-lab:cross-cloud-20261014}"
mkdir -p artifacts/lambda
# Export an allowlisted application tree, not the image's environment or filesystem.
docker run --rm --network none --read-only --entrypoint tar "$image" -C /app -cf - \
  package.json package-lock.json server.mjs runner.mjs node_modules lab | tar -xf - -C artifacts/lambda
python3 - <<'PY'
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path('artifacts/lambda')
with ZipFile('artifacts/reliability-lambda.zip','w',ZIP_DEFLATED) as out:
    for p in sorted(root.rglob('*')):
        if p.is_file(): out.write(p,p.relative_to(root))
print('artifacts/reliability-lambda.zip')
PY
