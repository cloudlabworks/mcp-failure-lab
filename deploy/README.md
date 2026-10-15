# Cloud deployment runbook

These configurations have no cloud credentials and perform no deployment by themselves. Use the intended Cloud Lab Works account, not an employer project or a home-automation project. Verify billing and free-tier headroom before `apply`. The initial execution is one manual suite per provider; no scheduler is created.

## AWS

Build the application and ZIP locally:

```sh
docker build -t mcp-failure-lab:cross-cloud-20261014 .
bash scripts/package-lambda.sh mcp-failure-lab:cross-cloud-20261014
tofu -chdir=deploy/aws init
tofu -chdir=deploy/aws validate
tofu -chdir=deploy/aws plan -var="artifact=$PWD/artifacts/reliability-lambda.zip" -out=lab.tfplan
```

After checking the account, quota and saved plan, apply the plan and invoke once:

```sh
tofu -chdir=deploy/aws apply lab.tfplan
aws lambda invoke --region us-west-2 --function-name clw-reliability-lab --cli-binary-format raw-in-base64-out --payload '{"action":"run-suite"}' artifacts/aws-suite.json
```

Require `FunctionError` absent from invoke metadata, `pass: true` in the result, and independently read the function configuration. A claimed `aws-lambda` runtime inside a JSON file alone is not verification. Keep the deployment receipt separate from public, synthetic result data.

## Google Cloud

Build and test an AMD64 image:

```sh
docker build --platform linux/amd64 -t mcp-failure-lab:google-amd64 .
docker run --rm --platform linux/amd64 --network none --read-only --cap-drop ALL --security-opt no-new-privileges mcp-failure-lab:google-amd64 npm test
tofu -chdir=deploy/gcp init
tofu -chdir=deploy/gcp validate
```

Push this image to the account's approved registry only after verifying storage and transfer allowances. Supply its resolved digest and the dedicated project through a private, ignored `terraform.tfvars` or explicit `-var` arguments. No project ID or image digest is fabricated here.

After a reviewed plan is applied, execute `clw-reliability-lab` once with the signed-in Cloud Shell `gcloud run jobs execute` command for the actual project and configured region. Verify the execution completed successfully, export its JSON log result, and check `pass: true`. Export the record before deleting the job/image. Cloud Run's platform contract requires AMD64; an ARM64-only image is not a valid deployment candidate.

## Known limits

- AWS ZIP packaging, Terraform validation and container tests do not establish live-cloud behavior.
- Managed IAM policy propagation, project permissions, organization policy and provider quotas can block apply.
- A reservation of one Lambda execution can be unavailable on a low-quota account.
- The Google job needs a digest-pinned image in a reachable registry; registry setup is not hidden inside the job configuration.
- Structured stdout must remain below Cloud Logging's entry limit; the current four-fixture suite is checked locally for size.
- No credential is embedded in the source, package, generated sample, or report.

Official runtime references: [Lambda runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html), [Cloud Run contract](https://docs.cloud.google.com/run/docs/container-contract).
