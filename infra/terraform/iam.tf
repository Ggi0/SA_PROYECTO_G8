data "google_project" "current" {}

# --- Service Account para CI/CD ---
resource "google_service_account" "cicd" {
  account_id   = "quetxal-tv-cicd"
  display_name = "GitHub Actions CI/CD + deploy bot"
  depends_on   = [google_project_service.enabled]

  lifecycle {
    prevent_destroy = true
  }
}

# --- Roles a nivel de proyecto para la SA ---
locals {
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
    "roles/resourcemanager.projectIamAdmin",
    "roles/serviceusage.serviceUsageAdmin",
  ]
}

resource "google_project_iam_member" "cicd_roles" {
  for_each = toset(local.cicd_roles)
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.cicd.email}"

  lifecycle {
    prevent_destroy = true
  }
}

# --- Workload Identity Federation ---
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
  depends_on                = [google_project_service.enabled]

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Provider"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }
  # Condición de seguridad: solo tu repo puede usar este provider
  attribute_condition = "assertion.repository == '${var.github_repo}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# --- Permite a GitHub Actions (de tu repo) suplantar a la SA ---
resource "google_service_account_iam_member" "wif_binding" {
  service_account_id = google_service_account.cicd.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github.workload_identity_pool_id}/attribute.repository/${var.github_repo}"

  lifecycle {
    prevent_destroy = true
  }
}
