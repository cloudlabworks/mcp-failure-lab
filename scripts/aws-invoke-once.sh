#!/usr/bin/env bash
# Briefly enable a private, disabled-at-rest fixture function; restore zero on exit.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p artifacts/aws
mkdir artifacts/aws-invoke.lock || { echo 'Another local invocation is in progress' >&2; exit 1; }
clw_region=us-west-2
clw_function=clw-reliability-lab
clw_opened=false
finish() {
  clw_rc=$?
  if [ "$clw_opened" = true ]; then
    if ! aws lambda put-function-concurrency --region "$clw_region" --function-name "$clw_function" --reserved-concurrent-executions 0 > artifacts/aws/concurrency-restored.json; then
      echo 'FAILED TO RESTORE ZERO CONCURRENCY: disable the function now.' >&2
      clw_rc=1
    fi
  fi
  rmdir artifacts/aws-invoke.lock
  exit "$clw_rc"
}
trap finish EXIT
trap 'exit 130' INT TERM
aws lambda get-function-configuration --region "$clw_region" --function-name "$clw_function" > artifacts/aws/config-before.json
aws lambda get-function-concurrency --region "$clw_region" --function-name "$clw_function" > artifacts/aws/concurrency-before.json
python3 - <<'PY'
import json,hashlib,base64
p=json.load(open('artifacts/aws/config-before.json'))
c=json.load(open('artifacts/aws/concurrency-before.json'))
assert c.get('ReservedConcurrentExecutions')==0, 'Expected disabled-at-rest function'
assert p['Runtime']=='nodejs24.x' and p['Architectures']==['arm64']
assert p['MemorySize']==256 and p['Timeout']==60 and p['Handler']=='lab/lambda.handler'
assert p.get('State')=='Active' and p.get('LastUpdateStatus')=='Successful'
expected=base64.b64encode(hashlib.sha256(open('artifacts/reliability-lambda.zip','rb').read()).digest()).decode()
assert p['CodeSha256']==expected,'Deployed ZIP differs from reviewed local artifact'
PY
clw_opened=true
aws lambda delete-function-concurrency --region "$clw_region" --function-name "$clw_function"
aws lambda invoke --region "$clw_region" --function-name "$clw_function" --cli-binary-format raw-in-base64-out --payload '{"action":"run-suite"}' artifacts/aws/aws-suite.json > artifacts/aws/invoke-metadata.json
python3 - <<'PY'
import json
m=json.load(open('artifacts/aws/invoke-metadata.json'))
p=json.load(open('artifacts/aws/aws-suite.json'))
assert m['StatusCode']==200 and 'FunctionError' not in m,m
assert p['pass'] and len(p['experiments'])==4,p
assert p['runtime']['platform']=='aws-lambda'
print(json.dumps({'pass':p['pass'],'fixtures':len(p['experiments']),'source':p['source_sha256'],'runtime':p['runtime']}))
PY
