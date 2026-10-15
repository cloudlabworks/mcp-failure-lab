#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
git diff --quiet
git diff --cached --quiet
mkdir -p artifacts/hf-space
cp lab/web/index.html lab/web/app.js lab/web/style.css lab/web/sample.json LICENSE artifacts/hf-space/
cp lab/evidence/google-suite.json lab/evidence/aws-suite.json artifacts/hf-space/
clw_revision=$(git rev-parse HEAD)
sed "s/SOURCE_COMMIT/$clw_revision/" deploy/huggingface/README.md > artifacts/hf-space/README.md
git archive --format=tar.gz --prefix=agent-reliability-lab/ -o artifacts/hf-space/source.tar.gz HEAD Dockerfile .dockerignore .gitignore LICENSE README.md package.json package-lock.json server.mjs runner.mjs test lab deploy scripts
python3 - <<'PY'
from pathlib import Path
import hashlib,json
root=Path('artifacts/hf-space')
names=['index.html','app.js','style.css','sample.json','google-suite.json','aws-suite.json','LICENSE','README.md','source.tar.gz']
manifest={name:hashlib.sha256((root/name).read_bytes()).hexdigest() for name in names}
(root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Packaged static Space: 10 allowlisted files')
PY
