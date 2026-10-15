terraform {
  required_version = ">= 1.8.0"
  required_providers {
    google = { source = "hashicorp/google", version = ">= 7.0, < 8.0" }
  }
}
variable "project_id" { type = string }
variable "region" { default = "us-central1" }
variable "image" {
  type = string
  validation {
    condition     = can(regex("@sha256:[0-9a-f]{64}$", var.image))
    error_message = "Supply a digest-pinned container image, not a mutable tag."
  }
}
provider "google" {
  project               = var.project_id
  region                = var.region
  billing_project       = var.project_id
  user_project_override = true
}
resource "google_service_account" "lab" {
  account_id   = "clw-reliability-lab"
  display_name = "Reliability Lab: no application IAM grants"
}
resource "google_cloud_run_v2_job" "lab" {
  name                = "clw-reliability-lab"
  location            = var.region
  deletion_protection = false
  template {
    task_count  = 1
    parallelism = 1
    template {
      service_account = google_service_account.lab.email
      max_retries     = 0
      timeout         = "60s"
      containers {
        image   = var.image
        command = ["node"]
        args    = ["lab/cloud-run.mjs"]
        resources { limits = { cpu = "1", memory = "512Mi" } }
      }
    }
  }
  labels = { project = "clw-reliability-lab", owner = "cloudlabworks" }
}
output "job_name" { value = google_cloud_run_v2_job.lab.name }
