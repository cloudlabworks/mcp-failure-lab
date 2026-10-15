#!/usr/bin/env python3
"""No AWS calls: exercise re-disable behavior after success and failures."""
import hashlib, json, os, pathlib, shutil, subprocess, tempfile
SCRIPT = pathlib.Path(__file__).with_name('aws-invoke-once.sh')
FAKE = r'''#!/usr/bin/env python3
import base64, hashlib, json, os, sys
from pathlib import Path
args=sys.argv[1:]; operation=args[1]; mode=os.environ['CLW_TEST_MODE']
with open('calls.jsonl','a') as f:f.write(json.dumps(args)+'\n')
if operation=='get-function-configuration':
 print(json.dumps({'Runtime':'nodejs24.x','Architectures':['arm64'],'MemorySize':256,'Timeout':60,'Handler':'lab/lambda.handler','State':'Active','LastUpdateStatus':'Successful','CodeSha256':base64.b64encode(hashlib.sha256(Path('artifacts/reliability-lambda.zip').read_bytes()).digest()).decode()}))
elif operation=='get-function-concurrency': print(json.dumps({'ReservedConcurrentExecutions':1 if mode=='wrong-state' else 0}))
elif operation=='invoke':
 if mode=='cli-error':sys.exit(42)
 Path(args[-1]).write_text(json.dumps({'pass':True,'experiments':[{}, {}, {}, {}],'source_sha256':'mock-only','runtime':{'platform':'aws-lambda'}}))
 print(json.dumps({'StatusCode':200,**({'FunctionError':'Unhandled'} if mode=='function-error' else {})}))
elif operation=='put-function-concurrency':print(json.dumps({'ReservedConcurrentExecutions':0}))
elif operation!='delete-function-concurrency':sys.exit(99)
'''
for mode in ['success','cli-error','function-error','wrong-state']:
 with tempfile.TemporaryDirectory(prefix='clw-guard-') as tmp:
  root=pathlib.Path(tmp)
  for name in ['scripts','artifacts','bin']:(root/name).mkdir()
  shutil.copy2(SCRIPT,root/'scripts/aws-invoke-once.sh')
  (root/'artifacts/reliability-lambda.zip').write_bytes(b'unit-test-only')
  fake=root/'bin/aws';fake.write_text(FAKE);fake.chmod(0o700)
  env=dict(os.environ,PATH=str(root/'bin')+os.pathsep+os.environ['PATH'],CLW_TEST_MODE=mode)
  result=subprocess.run(['bash',str(root/'scripts/aws-invoke-once.sh')],env=env,capture_output=True,text=True)
  calls=[json.loads(x) for x in (root/'calls.jsonl').read_text().splitlines()]
  ops=[x[1] for x in calls]
  assert (result.returncode==0)==(mode=='success'),(mode,result.stderr)
  if mode=='wrong-state':assert 'delete-function-concurrency' not in ops and 'invoke' not in ops
  else:
   assert ops.count('invoke')==1 and ops[-1]=='put-function-concurrency',ops
   assert calls[-1][-1]=='0',calls[-1]
  assert not (root/'artifacts/aws-invoke.lock').exists()
print('4 guard cases passed: success, CLI failure, function failure, wrong initial state. No AWS API calls.')
