output "db_public_ip" {
  value = google_compute_instance.db.network_interface[0].access_config[0].nat_ip
}
output "db_private_ip" {
  value = google_compute_instance.db.network_interface[0].network_ip
}
output "monitor_public_ip" {
  value = google_compute_instance.monitor.network_interface[0].access_config[0].nat_ip
}
output "monitor_private_ip" {
  value = google_compute_instance.monitor.network_interface[0].network_ip
}
output "dev_public_ip" {
  value = google_compute_instance.dev.network_interface[0].access_config[0].nat_ip
}
output "dev_private_ip" {
  value = google_compute_instance.dev.network_interface[0].network_ip
}
output "gke_cluster_name" {
  value = google_container_cluster.primary.name
}
output "workload_identity_provider" {
  description = "Valor para el GitHub Secret WORKLOAD_IDENTITY_PROVIDER"
  value       = "projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
}
output "cicd_sa_email" {
  description = "Valor para el GitHub Secret GCP_SA_EMAIL"
  value       = google_service_account.cicd.email
}
