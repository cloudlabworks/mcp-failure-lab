terraform {
  required_version = ">= 1.8.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = ">= 6.0, < 7.0" }
  }
}
variable "region" { default = "us-west-2" }
variable "artifact" { type = string }
variable "name" { default = "clw-reliability-lab" }
provider "aws" { region = var.region }
resource "aws_cloudwatch_log_group" "lab" {
  name              = "/aws/lambda/${var.name}"
  retention_in_days = 7
  tags              = { project = "clw-reliability-lab", owner = "cloudlabworks" }
}
resource "aws_iam_role" "lab" {
  name = var.name
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole"
  }] })
}
resource "aws_iam_role_policy" "logs" {
  role = aws_iam_role.lab.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect   = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"],
    Resource = "${aws_cloudwatch_log_group.lab.arn}:*"
  }] })
}
resource "aws_s3_bucket" "code" {
  bucket_prefix = "clw-reliability-code-"
  tags          = { project = "clw-reliability-lab", owner = "cloudlabworks" }
}
resource "aws_s3_bucket_public_access_block" "code" {
  bucket                  = aws_s3_bucket.code.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_server_side_encryption_configuration" "code" {
  bucket = aws_s3_bucket.code.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}
resource "aws_s3_object" "code" {
  bucket                 = aws_s3_bucket.code.id
  key                    = "${filesha256(var.artifact)}.zip"
  source                 = var.artifact
  source_hash            = filesha256(var.artifact)
  server_side_encryption = "AES256"
  depends_on             = [aws_s3_bucket_public_access_block.code, aws_s3_bucket_server_side_encryption_configuration.code]
}
resource "aws_lambda_function" "lab" {
  function_name                  = var.name
  role                           = aws_iam_role.lab.arn
  runtime                        = "nodejs24.x"
  handler                        = "lab/lambda.handler"
  s3_bucket                      = aws_s3_bucket.code.id
  s3_key                         = aws_s3_object.code.key
  source_code_hash               = filebase64sha256(var.artifact)
  architectures                  = ["arm64"]
  memory_size                    = 256
  timeout                        = 60
  reserved_concurrent_executions = 0
  depends_on                     = [aws_iam_role_policy.logs]
  tags                           = { project = "clw-reliability-lab", owner = "cloudlabworks" }
}
output "function_name" { value = aws_lambda_function.lab.function_name }

# Disabled at rest. scripts/aws-invoke-once.sh briefly enables a single manual
# invocation, then restores zero concurrency. It is not a one-execution cap
# during that window; the account-wide quota applies. No public triggers.

output "artifact_bucket" { value = aws_s3_bucket.code.id }
