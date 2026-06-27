terraform {
  backend "gcs" {
    bucket = "quetxal-tv-tfstate"
    prefix = "infra/state-g8"
  }
}
