resource "google_compute_network" "vpc" {
  name                    = "quetxal-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.enabled]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "quetxal-subnet"
  ip_cidr_range = "10.10.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id

  # Rangos secundarios para GKE VPC-native (pods y services)
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.20.0.0/16"
  }
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.30.0.0/16"
  }
}

# SSH hacia VMs etiquetadas. GitHub Actions usa IPs dinámicas, por eso debe
# poder entrar directo a la VM de BD pública para backups/migraciones.
resource "google_compute_firewall" "allow_ssh" {
  name      = "quetxal-allow-ssh"
  network   = google_compute_network.vpc.name
  direction = "INGRESS"
  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["ssh"]
}

# IAP SSH fallback para CI/CD cuando GitHub Actions no puede alcanzar el puerto
# 22 publico de la VM. Requiere roles/iap.tunnelResourceAccessor en la SA.
resource "google_compute_firewall" "allow_iap_ssh" {
  name      = "quetxal-allow-iap-ssh"
  network   = google_compute_network.vpc.name
  direction = "INGRESS"
  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
  source_ranges = ["35.235.240.0/20"]
  target_tags   = ["ssh"]
}

# Tráfico interno libre dentro de la VPC (GKE <-> VMs)
resource "google_compute_firewall" "allow_internal" {
  name      = "quetxal-allow-internal"
  network   = google_compute_network.vpc.name
  direction = "INGRESS"
  allow { protocol = "tcp" }
  allow { protocol = "udp" }
  allow { protocol = "icmp" }
  source_ranges = ["10.10.0.0/24", "10.20.0.0/16", "10.30.0.0/16"]
}

# PostgreSQL: solo desde la red interna hacia la VM de BD
resource "google_compute_firewall" "allow_postgres" {
  name      = "quetxal-allow-postgres"
  network   = google_compute_network.vpc.name
  direction = "INGRESS"
  allow {
    protocol = "tcp"
    ports    = ["5432-5438"]
  }
  source_ranges = ["10.10.0.0/24", "10.20.0.0/16"]
  target_tags   = ["db"]
}

# Puertos web del monitor (Kibana 5601, Grafana 3000, Prometheus 9090, Locust 8089)
# OJO: limita el acceso a tu IP con var.admin_cidr. NO lo dejes en 0.0.0.0/0.
resource "google_compute_firewall" "allow_monitor" {
  name      = "quetxal-allow-monitor"
  network   = google_compute_network.vpc.name
  direction = "INGRESS"
  allow {
    protocol = "tcp"
    ports    = ["5601", "3000", "9090", "8089"]
  }
  source_ranges = [var.admin_cidr]
  target_tags   = ["monitor"]
}

# Logstash (5044) lo usa Filebeat desde GKE -> solo red interna
resource "google_compute_firewall" "allow_logstash" {
  name      = "quetxal-allow-logstash"
  network   = google_compute_network.vpc.name
  direction = "INGRESS"
  allow {
    protocol = "tcp"
    ports    = ["5044"]
  }
  source_ranges = ["10.20.0.0/16", "10.10.0.0/24"]
  target_tags   = ["monitor"]
}

# Puertos públicos de la VM develop (frontend + api-gateway) para el equipo
resource "google_compute_firewall" "allow_dev_app" {
  name      = "quetxal-allow-dev-app"
  network   = google_compute_network.vpc.name
  direction = "INGRESS"
  allow {
    protocol = "tcp"
    ports    = ["8080", "3000"] # frontend (FRONTEND_PUBLIC_PORT) y api-gateway
  }
  source_ranges = [var.admin_cidr] # cámbialo a 0.0.0.0/0 si todo el equipo debe entrar
  target_tags   = ["dev-app"]
}

# Cloud NAT para que las VMs sin IP pública salgan a Internet (apt, docker pull)
resource "google_compute_router" "router" {
  name    = "quetxal-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "quetxal-nat"
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}
