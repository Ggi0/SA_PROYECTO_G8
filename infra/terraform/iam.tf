data "google_project" "current" {}

data "google_compute_default_service_account" "default" {
  project = var.project_id
}

# --- Roles a nivel de proyecto para la SA ---
locals {
  cicd_sa_email = "quetxal-tv-cicd@${var.project_id}.iam.gserviceaccount.com"
  cicd_sa_name  = "projects/${var.project_id}/serviceAccounts/${local.cicd_sa_email}"

  cicd_roles = [
    "roles/artifactregistry.writer",
    "roles/artifactregistry.admin",
    "roles/container.admin",
    "roles/container.developer",
    "roles/storage.admin",
    "roles/compute.admin",
    "roles/compute.viewer",
    "roles/iam.serviceAccountAdmin",
    "roles/iam.serviceAccountUser",
    "roles/iam.serviceAccountTokenCreator",
    "roles/iam.workloadIdentityPoolAdmin",
    "roles/iap.tunnelResourceAccessor",
    "roles/resourcemanager.projectIamAdmin",
    "roles/serviceusage.serviceUsageAdmin",
  ]
}

resource "google_project_iam_member" "cicd_roles" {
  for_each = toset(local.cicd_roles)
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${local.cicd_sa_email}"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_project_iam_member" "gke_nodes_artifact_registry_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${data.google_compute_default_service_account.default.email}"
}

# --- Permite a GitHub Actions (de tu repo) suplantar a la SA ---
resource "google_service_account_iam_member" "wif_binding" {
  service_account_id = local.cicd_sa_name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/github-pool/attribute.repository/${var.github_repo}"

  lifecycle {
    prevent_destroy = true
  }
}
