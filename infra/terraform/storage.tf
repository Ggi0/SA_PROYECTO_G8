resource "google_storage_bucket" "backups" {
  name                        = "quetxal-tv-backups"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false # protege los respaldos ante terraform destroy
  depends_on                  = [google_project_service.enabled]
}

resource "google_storage_bucket" "videos" {
  name                        = "quetxal-tv-videos"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false
  depends_on                  = [google_project_service.enabled]

  # CORS amplio: la app sube y reproduce videos (firma URLs, PUT/POST/HEAD/GET)
  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "OPTIONS"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}