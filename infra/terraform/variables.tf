variable "project_id" {
  type        = string
  description = "ID del proyecto GCP"
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "zone" {
  type    = string
  default = "us-central1-a"
}

variable "ssh_user" {
  type        = string
  description = "Usuario Linux para SSH en las VMs (Ansible y CI/CD)"
  default     = "deployer"
}

variable "ssh_pub_key_path" {
  type        = string
  description = "Ruta a la llave pública SSH que se inyecta en las VMs"
  default     = "~/.ssh/quetxal_deploy.pub"
}

variable "gke_node_count" {
  type    = number
  default = 2
}

variable "gke_machine_type" {
  type    = string
  default = "e2-standard-2"
}

variable "github_repo" {
  type        = string
  description = "owner/repo de GitHub, p. ej. TU_USUARIO_GITHUB/SA_PROYECTO_G8"
}

variable "admin_cidr" {
  type        = string
  description = "Tu IP pública /32 para acceder a Kibana/Grafana/Prometheus/Locust"
  default     = "0.0.0.0/0"
}