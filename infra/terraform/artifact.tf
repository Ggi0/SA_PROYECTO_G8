resource "google_artifact_registry_repository" "rp" {
  repository_id = "quetxal-tv-rp"
  location      = var.region
  format        = "DOCKER"
  description   = "Imágenes Docker de Quetxal TV"
  depends_on    = [google_project_service.enabled]
}