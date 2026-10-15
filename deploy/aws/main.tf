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
resource "aws_lambda_function" "lab" {
  function_name                  = var.name
  role                           = aws_iam_role.lab.arn
  runtime                        = "nodejs24.x"
  handler                        = "lab/lambda.handler"
  filename                       = var.artifact
  source_code_hash               = filebase64sha256(var.artifact)
  architectures                  = ["arm64"]
  memory_size                    = 256
  timeout                        = 60
  reserved_concurrent_executions = 1
  depends_on                     = [aws_iam_role_policy.logs]
  tags                           = { project = "clw-reliability-lab", owner = "cloudlabworks" }
}
output "function_name" { value = aws_lambda_function.lab.function_name }
