#!/usr/bin/env bash
# Prepara el proyecto para poder ejecutar terraform destroy y luego reconstruir
# la infraestructura con un push a GitHub Actions.
#
# Uso minimo:
#   GCP_PROJECT_ID=mi-proyecto GITHUB_REPO=owner/repo bash infra/scripts/prepare-recreate-from-zero.sh
#
# Opcionalmente actualiza GitHub Secrets si gh esta autenticado:
#   SET_GITHUB_SECRETS=1 GCE_SSH_USER=deployer GCE_SSH_PRIVATE_KEY="$(cat key)" \
#     AUTH_DB_PASSWORD=... JWT_SECRET=... JWT_ACCESS_SECRET=... JWT_REFRESH_SECRET=... \
#     GCP_PROJECT_ID=mi-proyecto GITHUB_REPO=owner/repo bash infra/scripts/prepare-recreate-from-zero.sh
#
# Si los buckets de videos/backups tienen objetos, terraform destroy falla porque
# force_destroy=false. Para vaciarlos explicitamente:
#   ALLOW_DELETE_BUCKET_OBJECTS=1 ... bash infra/scripts/prepare-recreate-from-zero.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TF_DIR="$ROOT_DIR/infra/terraform"

PROJECT_ID="${GCP_PROJECT_ID:-${PROJECT_ID:-}}"
REGION="${ARTIFACT_REGISTRY_LOCATION:-${REGION:-us-central1}}"
ZONE="${GKE_CLUSTER_ZONE:-${ZONE:-us-central1-a}}"
GITHUB_REPO="${GITHUB_REPO:-}"
TFSTATE_BUCKET="${TFSTATE_BUCKET:-quetxal-tv-tfstate}"
TFSTATE_LOCATION="${TFSTATE_LOCATION:-US}"
SA_ID="${SA_ID:-quetxal-tv-cicd}"
SA_EMAIL="${GCP_SA_EMAIL:-${SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com}"
POOL_ID="${WORKLOAD_IDENTITY_POOL_ID:-github-pool}"
PROVIDER_ID="${WORKLOAD_IDENTITY_PROVIDER_ID:-github-provider}"
ARTIFACT_REPOSITORY="${ARTIFACT_REGISTRY_REPOSITORY:-quetxal-tv-rp}"
GKE_CLUSTER_NAME="${GKE_CLUSTER_NAME:-quetxal-tv-cluster}"
SET_GITHUB_SECRETS="${SET_GITHUB_SECRETS:-0}"
DETACH_PROTECTED_TF_RESOURCES="${DETACH_PROTECTED_TF_RESOURCES:-1}"
ALLOW_DELETE_BUCKET_OBJECTS="${ALLOW_DELETE_BUCKET_OBJECTS:-0}"

log() { printf '\n==> %s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*" >&2; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

require_env() {
  local name="$1"
  local value="${!name:-}"
  [ -n "$value" ] || die "Falta $name"
}

detect_github_repo() {
  if [ -n "$GITHUB_REPO" ]; then
    return 0
  fi
  if git -C "$ROOT_DIR" remote get-url origin >/dev/null 2>&1; then
    GITHUB_REPO="$(git -C "$ROOT_DIR" remote get-url origin | sed -E 's#^git@github.com:##; s#^https://github.com/##; s#\.git$##')"
  fi
}

gcloud_project_number() {
  gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)'
}

enable_apis() {
  log "Habilitando APIs base de GCP"
  gcloud services enable \
    serviceusage.googleapis.com \
    compute.googleapis.com \
    container.googleapis.com \
    artifactregistry.googleapis.com \
    iam.googleapis.com \
    iamcredentials.googleapis.com \
    iap.googleapis.com \
    sts.googleapis.com \
    storage.googleapis.com \
    cloudresourcemanager.googleapis.com \
    --project "$PROJECT_ID"
}

ensure_tfstate_bucket() {
  log "Validando bucket remoto de Terraform state"
  if gcloud storage buckets describe "gs://$TFSTATE_BUCKET" --project "$PROJECT_ID" >/dev/null 2>&1; then
    echo "Bucket existente: gs://$TFSTATE_BUCKET"
    return 0
  fi
  gcloud storage buckets create "gs://$TFSTATE_BUCKET" \
    --project "$PROJECT_ID" \
    --location "$TFSTATE_LOCATION" \
    --uniform-bucket-level-access
}

ensure_service_account() {
  log "Validando service account de CI/CD"
  if gcloud iam service-accounts describe "$SA_EMAIL" --project "$PROJECT_ID" >/dev/null 2>&1; then
    echo "Service account existente: $SA_EMAIL"
  else
    gcloud iam service-accounts create "$SA_ID" \
      --project "$PROJECT_ID" \
      --display-name "Quetxal TV CI/CD"
  fi
}

grant_project_roles() {
  log "Asegurando roles de proyecto para $SA_EMAIL"
  local roles=(
    roles/artifactregistry.writer
    roles/artifactregistry.admin
    roles/container.admin
    roles/container.developer
    roles/storage.admin
    roles/compute.admin
    roles/compute.viewer
    roles/iam.serviceAccountAdmin
    roles/iam.serviceAccountUser
    roles/iam.serviceAccountTokenCreator
    roles/iam.workloadIdentityPoolAdmin
    roles/iap.tunnelResourceAccessor
    roles/resourcemanager.projectIamAdmin
    roles/serviceusage.serviceUsageAdmin
  )
  for role in "${roles[@]}"; do
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member "serviceAccount:$SA_EMAIL" \
      --role "$role" \
      --condition=None \
      --quiet >/dev/null
  done
}

ensure_workload_identity() {
  log "Validando Workload Identity Federation para GitHub Actions"
  local project_number provider_name member
  project_number="$(gcloud_project_number)"
  provider_name="projects/$project_number/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID"
  member="principalSet://iam.googleapis.com/projects/$project_number/locations/global/workloadIdentityPools/$POOL_ID/attribute.repository/$GITHUB_REPO"

  if ! gcloud iam workload-identity-pools describe "$POOL_ID" --project "$PROJECT_ID" --location global >/dev/null 2>&1; then
    gcloud iam workload-identity-pools create "$POOL_ID" \
      --project "$PROJECT_ID" \
      --location global \
      --display-name "GitHub Actions"
  fi

  if gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
    --project "$PROJECT_ID" \
    --location global \
    --workload-identity-pool "$POOL_ID" >/dev/null 2>&1; then
    gcloud iam workload-identity-pools providers update-oidc "$PROVIDER_ID" \
      --project "$PROJECT_ID" \
      --location global \
      --workload-identity-pool "$POOL_ID" \
      --issuer-uri "https://token.actions.githubusercontent.com" \
      --attribute-mapping "google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
      --attribute-condition "assertion.repository=='$GITHUB_REPO'"
  else
    gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
      --project "$PROJECT_ID" \
      --location global \
      --workload-identity-pool "$POOL_ID" \
      --display-name "GitHub provider" \
      --issuer-uri "https://token.actions.githubusercontent.com" \
      --attribute-mapping "google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
      --attribute-condition "assertion.repository=='$GITHUB_REPO'"
  fi

  gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
    --project "$PROJECT_ID" \
    --role roles/iam.workloadIdentityUser \
    --member "$member" \
    --quiet >/dev/null

  gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
    --project "$PROJECT_ID" \
    --role roles/iam.serviceAccountTokenCreator \
    --member "serviceAccount:$SA_EMAIL" \
    --quiet >/dev/null

  WORKLOAD_IDENTITY_PROVIDER="${WORKLOAD_IDENTITY_PROVIDER:-$provider_name}"
}

grant_default_compute_sa_reader() {
  log "Asegurando permiso de lectura de Artifact Registry para nodos GKE"
  local default_sa
  default_sa="$(gcloud iam service-accounts list \
    --project "$PROJECT_ID" \
    --filter='displayName:Compute Engine default service account' \
    --format='value(email)' | head -n 1 || true)"
  if [ -n "$default_sa" ]; then
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member "serviceAccount:$default_sa" \
      --role roles/artifactregistry.reader \
      --condition=None \
      --quiet >/dev/null
  else
    warn "No se encontro la Compute Engine default service account. Terraform la validara en el apply."
  fi
}

detach_protected_terraform_resources() {
  [ "$DETACH_PROTECTED_TF_RESOURCES" = "1" ] || return 0
  log "Separando del Terraform state los IAM bootstrap con prevent_destroy"
  terraform -chdir="$TF_DIR" init -input=false >/dev/null
  local resources
  resources="$(terraform -chdir="$TF_DIR" state list 2>/dev/null | grep -E '^(google_project_iam_member\.cicd_roles|google_service_account_iam_member\.wif_binding)$|^google_project_iam_member\.cicd_roles\[' || true)"
  if [ -z "$resources" ]; then
    echo "No hay recursos IAM protegidos en state o ya fueron separados."
    return 0
  fi
  while IFS= read -r resource; do
    [ -n "$resource" ] || continue
    terraform -chdir="$TF_DIR" state rm "$resource"
  done <<< "$resources"
}

bucket_has_objects() {
  local bucket="$1"
  gcloud storage ls -r "gs://$bucket/**" --project "$PROJECT_ID" >/tmp/quetxal-bucket-ls.$$ 2>/dev/null || return 1
  [ -s /tmp/quetxal-bucket-ls.$$ ]
}

check_destroyable_buckets() {
  log "Validando buckets que pueden bloquear terraform destroy"
  local buckets=("quetxal-tv-$PROJECT_ID-backups" "quetxal-tv-$PROJECT_ID-videos")
  local bucket
  for bucket in "${buckets[@]}"; do
    if ! gcloud storage buckets describe "gs://$bucket" --project "$PROJECT_ID" >/dev/null 2>&1; then
      echo "Bucket no existe todavia: gs://$bucket"
      continue
    fi
    if bucket_has_objects "$bucket"; then
      if [ "$ALLOW_DELETE_BUCKET_OBJECTS" = "1" ]; then
        warn "Vaciando gs://$bucket por ALLOW_DELETE_BUCKET_OBJECTS=1"
        gcloud storage rm -r "gs://$bucket/**" --project "$PROJECT_ID" --quiet || true
      else
        die "gs://$bucket contiene objetos. terraform destroy fallara porque force_destroy=false. Ejecuta con ALLOW_DELETE_BUCKET_OBJECTS=1 si puedes borrar su contenido."
      fi
    else
      echo "Bucket vacio: gs://$bucket"
    fi
    rm -f /tmp/quetxal-bucket-ls.$$ >/dev/null 2>&1 || true
  done
}

set_secret_if_value_exists() {
  local name="$1"
  local value="${!name:-}"
  [ -n "$value" ] || return 0
  printf '%s' "$value" | gh secret set "$name" --repo "$GITHUB_REPO" --body-file - >/dev/null
}

sync_github_secrets() {
  log "Validando GitHub Secrets"
  if ! have gh; then
    warn "gh no esta instalado; no puedo validar ni actualizar GitHub Secrets."
    return 0
  fi
  if ! gh auth status >/dev/null 2>&1; then
    warn "gh no esta autenticado; ejecuta gh auth login si quieres validar secrets."
    return 0
  fi

  if [ "$SET_GITHUB_SECRETS" = "1" ]; then
    export GCP_PROJECT_ID="$PROJECT_ID"
    export GCP_SA_EMAIL="$SA_EMAIL"
    export WORKLOAD_IDENTITY_PROVIDER
    export GKE_CLUSTER_NAME
    export GKE_CLUSTER_ZONE="$ZONE"
    export ARTIFACT_REGISTRY_LOCATION="$REGION"
    export ARTIFACT_REGISTRY_REPOSITORY="$ARTIFACT_REPOSITORY"
    set_secret_if_value_exists GCP_PROJECT_ID
    set_secret_if_value_exists GCP_SA_EMAIL
    set_secret_if_value_exists WORKLOAD_IDENTITY_PROVIDER
    set_secret_if_value_exists GKE_CLUSTER_NAME
    set_secret_if_value_exists GKE_CLUSTER_ZONE
    set_secret_if_value_exists ARTIFACT_REGISTRY_LOCATION
    set_secret_if_value_exists ARTIFACT_REGISTRY_REPOSITORY
    set_secret_if_value_exists SSH_ADMIN_CIDR
    set_secret_if_value_exists GCE_SSH_USER
    set_secret_if_value_exists GCE_SSH_PRIVATE_KEY
    set_secret_if_value_exists AUTH_DB_PASSWORD
    set_secret_if_value_exists JWT_SECRET
    set_secret_if_value_exists JWT_ACCESS_SECRET
    set_secret_if_value_exists JWT_REFRESH_SECRET
    set_secret_if_value_exists SMTP_HOST
    set_secret_if_value_exists SMTP_PORT
    set_secret_if_value_exists SMTP_USER
    set_secret_if_value_exists SMTP_PASSWORD
    set_secret_if_value_exists SMTP_FROM
    set_secret_if_value_exists EXCHANGE_API_KEY
    set_secret_if_value_exists EXCHANGE_API_URL
  fi

  local required=(
    GCP_PROJECT_ID
    GCP_SA_EMAIL
    WORKLOAD_IDENTITY_PROVIDER
    GKE_CLUSTER_NAME
    GKE_CLUSTER_ZONE
    ARTIFACT_REGISTRY_LOCATION
    ARTIFACT_REGISTRY_REPOSITORY
    GCE_SSH_USER
    GCE_SSH_PRIVATE_KEY
    AUTH_DB_PASSWORD
    JWT_SECRET
    JWT_ACCESS_SECRET
    JWT_REFRESH_SECRET
  )
  local existing missing=0
  existing="$(gh secret list --repo "$GITHUB_REPO" --json name --jq '.[].name' 2>/dev/null || true)"
  for secret in "${required[@]}"; do
    if printf '%s\n' "$existing" | grep -qx "$secret"; then
      echo "OK secret: $secret"
    else
      warn "Falta GitHub Secret requerido: $secret"
      missing=1
    fi
  done
  [ "$missing" -eq 0 ] || die "Faltan GitHub Secrets requeridos. Puedes reejecutar con SET_GITHUB_SECRETS=1 y variables de entorno."
}

print_summary() {
  local project_number
  project_number="$(gcloud_project_number)"
  cat <<EOF

Bootstrap listo.

Valores esperados en GitHub Secrets:
  GCP_PROJECT_ID=$PROJECT_ID
  GCP_SA_EMAIL=$SA_EMAIL
  WORKLOAD_IDENTITY_PROVIDER=projects/$project_number/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID
  GKE_CLUSTER_NAME=$GKE_CLUSTER_NAME
  GKE_CLUSTER_ZONE=$ZONE
  ARTIFACT_REGISTRY_LOCATION=$REGION
  ARTIFACT_REGISTRY_REPOSITORY=$ARTIFACT_REPOSITORY

Ahora puedes ejecutar el destroy desde infra/terraform:
  terraform init -input=false
  terraform destroy -input=false

Despues haz push a la rama correspondiente:
  release  -> CD - release -> GKE
  develop  -> CD - develop -> Compute Engine
EOF
}

main() {
  have gcloud || die "Necesitas gcloud instalado y autenticado."
  have terraform || die "Necesitas terraform instalado."
  require_env PROJECT_ID
  detect_github_repo
  require_env GITHUB_REPO

  gcloud config set project "$PROJECT_ID" >/dev/null
  enable_apis
  ensure_tfstate_bucket
  ensure_service_account
  grant_project_roles
  ensure_workload_identity
  grant_default_compute_sa_reader
  detach_protected_terraform_resources
  check_destroyable_buckets
  sync_github_secrets
  print_summary
}

main "$@"
