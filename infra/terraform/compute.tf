locals {
  ssh_keys = "${var.ssh_user}:${file(var.ssh_pub_key_path)}"
}

# ---------- IPs públicas estáticas (fijas aunque se reinicie la VM) ----------
resource "google_compute_address" "db" {
  name       = "quetxal-db-ip"
  region     = var.region
  depends_on = [google_project_service.enabled]
}
resource "google_compute_address" "monitor" {
  name       = "quetxal-monitor-ip"
  region     = var.region
  depends_on = [google_project_service.enabled]
}
resource "google_compute_address" "dev" {
  name       = "quetxal-dev-ip"
  region     = var.region
  depends_on = [google_project_service.enabled]
}

# ---------- VM de Bases de Datos (persistencia aislada) ----------
resource "google_compute_instance" "db" {
  name         = "quetxal-db-vm"
  machine_type = "e2-medium"
  zone         = var.zone
  tags         = ["ssh", "db"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 30
    }
  }

  network_interface {
    network    = google_compute_network.vpc.name
    subnetwork = google_compute_subnetwork.subnet.name
    access_config {
      nat_ip = google_compute_address.db.address
    }
  }

  metadata   = { ssh-keys = local.ssh_keys }
  depends_on = [google_project_service.enabled]
}

# ---------- VM de Observabilidad (ELK + Prometheus + Grafana + Locust) ----------
resource "google_compute_instance" "monitor" {
  name         = "quetxal-monitor-vm"
  machine_type = "e2-standard-2"
  zone         = var.zone
  tags         = ["ssh", "monitor"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 50
    }
  }

  network_interface {
    network    = google_compute_network.vpc.name
    subnetwork = google_compute_subnetwork.subnet.name
    access_config {
      nat_ip = google_compute_address.monitor.address
    }
  }

  # SA con permisos de lectura de Compute -> Prometheus usa gce_sd_configs
  # para autodescubrir las VMs y los nodos de GKE sin IPs manuales.
  service_account {
    email  = local.cicd_sa_email
    scopes = ["cloud-platform"]
  }

  metadata   = { ssh-keys = local.ssh_keys }
  depends_on = [google_project_service.enabled]
}

# ---------- VM de Desarrollo (entorno develop) ----------
resource "google_compute_instance" "dev" {
  name                      = "quetxal-dev-vm"
  machine_type              = "e2-standard-2"
  zone                      = var.zone
  tags                      = ["ssh", "dev-app"] # dev-app abre los puertos públicos de develop
  allow_stopping_for_update = true

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 40
    }
  }

  network_interface {
    network    = google_compute_network.vpc.name
    subnetwork = google_compute_subnetwork.subnet.name
    access_config {
      nat_ip = google_compute_address.dev.address
    }
  }

  service_account {
    email  = local.cicd_sa_email
    scopes = ["cloud-platform"]
  }

  metadata   = { ssh-keys = local.ssh_keys }
  depends_on = [google_project_service.enabled]
}
