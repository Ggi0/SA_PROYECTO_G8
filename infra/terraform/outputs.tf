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
  value       = local.cicd_sa_email
}

# ---------- Outputs de conveniencia para CI/CD ----------
output "DB_HOST" {
  description = "IP pública de la VM de BD (para SSH en CI/CD)"
  value       = google_compute_instance.db.network_interface[0].access_config[0].nat_ip
}
output "DB_PRIVATE_IP" {
  description = "IP privada de la VM de BD (para los servicios dentro de la VPC)"
  value       = google_compute_instance.db.network_interface[0].network_ip
}
output "DEV_HOST" {
  description = "IP pública de la VM develop"
  value       = google_compute_instance.dev.network_interface[0].access_config[0].nat_ip
}
output "MONITOR_HOST" {
  description = "IP pública de la VM de observabilidad"
  value       = google_compute_instance.monitor.network_interface[0].access_config[0].nat_ip
}
output "MONITOR_PRIVATE_IP" {
  description = "IP privada de la VM de observabilidad (Logstash, Prometheus targets)"
  value       = google_compute_instance.monitor.network_interface[0].network_ip
}

# ---------- Inventario de Ansible generado desde Terraform ----------
output "ansible_inventory" {
  description = "Inventario INI para Ansible, generado automáticamente con las IPs de Terraform"
  value = <<-EOT
    [db]
    ${google_compute_instance.db.name} ansible_host=${google_compute_instance.db.network_interface[0].access_config[0].nat_ip} private_ip=${google_compute_instance.db.network_interface[0].network_ip}

    [monitor]
    ${google_compute_instance.monitor.name} ansible_host=${google_compute_instance.monitor.network_interface[0].access_config[0].nat_ip} private_ip=${google_compute_instance.monitor.network_interface[0].network_ip}

    [dev]
    ${google_compute_instance.dev.name} ansible_host=${google_compute_instance.dev.network_interface[0].access_config[0].nat_ip} private_ip=${google_compute_instance.dev.network_interface[0].network_ip}

    [all:vars]
    ansible_user=${var.ssh_user}
    ansible_python_interpreter=/usr/bin/python3
  EOT
}
