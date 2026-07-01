locals {
  bucket_prefix = "quetxal-tv-${var.project_id}"
}

resource "google_storage_bucket" "backups" {
  name                        = "${local.bucket_prefix}-backups"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false # protege los respaldos ante terraform destroy
  depends_on                  = [google_project_service.enabled]
}

resource "google_storage_bucket" "videos" {
  name                        = "${local.bucket_prefix}-videos"
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
