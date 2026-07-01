#!/usr/bin/env bash
# Orquesta IaC + configuración de forma reproducible.
# Uso básico:        bash infra/scripts/deploy-infra.sh
# Sin confirmación:  AUTO_APPROVE=1 bash infra/scripts/deploy-infra.sh   (CI)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF="$ROOT/terraform"
ANS="$ROOT/ansible"

echo "==> 1/5 Terraform init"
terraform -chdir="$TF" init -input=false

echo "==> 2/5 Terraform plan (REVISA los cambios antes de aplicar)"
terraform -chdir="$TF" plan -out=tfplan

if [ "${AUTO_APPROVE:-0}" != "1" ]; then
  read -r -p "¿Aplicar este plan? (escribe 'yes' para continuar): " ANS_OK
  [ "$ANS_OK" = "yes" ] || { echo "Cancelado por el usuario."; rm -f "$TF/tfplan"; exit 1; }
fi

echo "==> 3/5 Terraform apply"
terraform -chdir="$TF" apply tfplan
rm -f "$TF/tfplan"

echo "==> 4/5 Generar inventory desde Terraform + ejecutar Ansible"
terraform -chdir="$TF" output -raw ansible_inventory > "$ANS/inventory.ini"
echo "Inventario generado:"
cat "$ANS/inventory.ini"

cd "$ANS"
ansible-galaxy collection install community.docker community.general
ansible-playbook db.yml monitor.yml dev.yml

echo "==> 5/5 Listo. Valores para GitHub Secrets:"
echo "DEV_HOST           = $(terraform -chdir="$TF" output -raw DEV_HOST)"
echo "DB_HOST            = $(terraform -chdir="$TF" output -raw DB_HOST)"
echo "DB_PRIVATE_IP      = $(terraform -chdir="$TF" output -raw DB_PRIVATE_IP)"
echo "MONITOR_HOST       = $(terraform -chdir="$TF" output -raw MONITOR_HOST)"
echo "MONITOR_PRIVATE_IP = $(terraform -chdir="$TF" output -raw MONITOR_PRIVATE_IP)"
echo "GKE_CLUSTER_NAME   = $(terraform -chdir="$TF" output -raw gke_cluster_name)"
echo "WIF_PROVIDER       = $(terraform -chdir="$TF" output -raw workload_identity_provider)"
echo "GCP_SA_EMAIL       = $(terraform -chdir="$TF" output -raw cicd_sa_email)"
