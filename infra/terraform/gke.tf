resource "google_container_cluster" "primary" {
  name     = "quetxal-tv-cluster"
  location = var.zone

  # Quitamos el node pool por defecto y gestionamos uno propio
  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  # VPC-native (usa los rangos secundarios de la subred)
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Workload Identity (para que catalogo-service acceda a GCS)
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Los nodos no necesitan IP pública; salen a Internet por Cloud NAT.
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  deletion_protection = false
  depends_on          = [google_project_service.enabled]
}

resource "google_container_node_pool" "primary_nodes" {
  name       = "quetxal-pool"
  location   = var.zone
  cluster    = google_container_cluster.primary.name
  node_count = var.gke_node_count

  autoscaling {
    min_node_count = 1
    max_node_count = 3
  }

  node_config {
    machine_type = var.gke_machine_type
    disk_size_gb = 50
    disk_type    = "pd-standard"
    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}
