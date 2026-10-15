terraform {
  required_version = ">= 1.8.0"
  required_providers {
    google = { source = "hashicorp/google", version = ">= 7.0, < 8.0" }
  }
}
variable "billing_account" { type = string }
variable "project_id" { default = "clw-reliability-20261014" }
variable "attach_billing" {
  type    = bool
  default = false
}
provider "google" {
  billing_project       = var.project_id
  user_project_override = true
}
resource "google_project" "lab" {
  project_id          = var.project_id
  name                = "CLW Reliability Lab"
  billing_account     = var.attach_billing ? var.billing_account : null
  deletion_policy     = "PREVENT"
  auto_create_network = false
}
resource "google_project_service" "apis" {
  for_each           = toset(var.attach_billing ? ["run.googleapis.com", "artifactregistry.googleapis.com", "iam.googleapis.com", "logging.googleapis.com", "billingbudgets.googleapis.com", "cloudbilling.googleapis.com", "cloudresourcemanager.googleapis.com"] : ["billingbudgets.googleapis.com", "cloudbilling.googleapis.com", "cloudresourcemanager.googleapis.com"])
  project            = google_project.lab.project_id
  service            = each.key
  disable_on_destroy = false
}
resource "google_artifact_registry_repository" "lab" {
  count         = var.attach_billing ? 1 : 0
  project       = google_project.lab.project_id
  location      = "us-central1"
  repository_id = "reliability-lab"
  format        = "DOCKER"
  depends_on    = [google_project_service.apis]
  description   = "One synthetic fixture image; no model artifacts"
}
resource "google_billing_budget" "lab" {
  count           = var.attach_billing ? 1 : 0
  billing_account = var.billing_account
  display_name    = "CLW Reliability Lab charge alert (not a cap)"
  budget_filter { projects = ["projects/${google_project.lab.number}"] }
  amount {
    specified_amount {
      currency_code = "USD"
      units         = "1"
    }
  }
  threshold_rules { threshold_percent = 0.01 }
  depends_on = [google_project_service.apis]
}
output "project_id" { value = google_project.lab.project_id }
output "project_number" { value = google_project.lab.number }
output "registry" { value = "us-central1-docker.pkg.dev/${google_project.lab.project_id}/reliability-lab" }
