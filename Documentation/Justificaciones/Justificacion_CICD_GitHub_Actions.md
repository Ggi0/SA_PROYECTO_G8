# Justificación de Herramienta CI/CD - GitHub Actions

Para la integración y despliegue continuo se utiliza GitHub Actions. Esta herramienta se seleccionó porque el código se versiona en GitHub y permite automatizar compilación, pruebas, construcción de imágenes, despliegues y smoke tests desde el mismo repositorio.

## ¿Por qué GitHub Actions?

- Se integra directamente con Pull Requests y ramas.
- Permite ejecutar jobs por lenguaje: Go, TypeScript y Python.
- Permite bloquear el avance si fallan pruebas o cobertura.
- Permite ejecutar despliegues diferentes por rama.
- Permite usar GitHub Secrets para credenciales.
- Permite autenticación con GCP mediante Workload Identity Federation.

## Evidencia de uso en código

### Pipeline CI con pruebas por lenguaje

Ruta: `.github/workflows/ci.yml`

```yaml
name: CI Pipeline - Quetxal TV
on:
  push:
    branches: ['feature/**']
  pull_request:
    branches: [develop, release, main]
  workflow_call:
env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  test-go:
    name: "Go services (build + unit tests)"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.25.0'
          cache: false
      - name: subscription-service
        working-directory: app/QuetxalTV/microservices/subscription-service
        run: |
          go build ./...
          go test ./internal/payments ./internal/plans ./internal/subscriptions -coverprofile=coverage.out -covermode=atomic -v
          grep -v "repository.go" coverage.out > coverage_unit.out
          COVERAGE=$(go tool cover -func=coverage_unit.out | awk '/total:/ {gsub(/%/, "", $3); print int($3)}')
          echo "Cobertura subscription-service (handler+service): ${COVERAGE}%"
          [ "$COVERAGE" -ge 75 ] || { echo "❌ Cobertura ${COVERAGE}% menor al 75%"; exit 1; }
      - name: catalogo-service
        working-directory: app/QuetxalTV/microservices/catalogo-service
        run: |
          go build ./...
          go test ./internal/catalog -coverprofile=coverage.out -covermode=atomic -v
          grep -v "internal/catalog/repository.go" coverage.out > coverage_unit.out
          COVERAGE=$(go tool cover -func=coverage_unit.out | grep 'total:' | awk '{print $3}' | tr -d '%')
          echo "Cobertura catalogo-service (handler+service): ${COVERAGE}%"
          if [ $(echo "$COVERAGE < 75" | bc -l) -eq 1 ]; then echo "❌ Cobertura ${COVERAGE}% menor al 75%"; exit 1; fi
  test-ts:
    name: "TypeScript services (≥75%)"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - name: api-gateway
        working-directory: app/QuetxalTV/api-gateway
        env:
          JWT_SECRET: test-secret-ci
          JWT_ACCESS_SECRET: test-access-ci
        run: |
          npm ci --silent
          npx jest --coverage \
            --collectCoverageFrom=src/subscription/subscription.service.ts \
            --collectCoverageFrom=src/catalog/catalog.service.ts \
            --collectCoverageFrom=src/health.controller.ts \
            --coverageThreshold='{"global":{"lines":75}}' \
            --forceExit
      - name: auth-service
        working-directory: app/QuetxalTV/microservices/auth-service/auth-service
        env:
          JWT_SECRET: test-secret-ci
          JWT_ACCESS_SECRET: test-access-ci
        run: |
          npm ci --silent
          npm run test:cov
  test-python:
    name: "Python services (>=75%)"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: fx-service
        working-directory: app/QuetxalTV/microservices/fx-service
        env:
          PYTHONPATH: .
        run: |
          pip install -r requirements.txt pytest pytest-cov pytest-asyncio -q
          test -d tests && test "$(find tests -name 'test_*.py' | wc -l)" -gt 0 || { echo "fx-service sin tests"; exit 1; }
          pytest tests/ --cov=src.services.fx_service --cov-fail-under=75 --cov-report=term-missing -v
      - name: notification-service
        working-directory: app/QuetxalTV/microservices/notification-service
        env:
          PYTHONPATH: .
        run: |
          pip install -r requirements.txt pytest pytest-cov -q
          test -d tests && test "$(find tests -name 'test_*.py' | wc -l)" -gt 0 || { echo "notification-service sin tests"; exit 1; }
          pytest tests/ --cov=src.email --cov=src.db.repository --cov-fail-under=75 --cov-report=term-missing -v
      - name: historial-service
        working-directory: app/QuetxalTV/microservices/historial-service
        env:
          PYTHONPATH: .
        run: |
          pip install -r requirements.txt pytest pytest-cov -q
          test -d tests && test "$(find tests -name 'test_*.py' | wc -l)" -gt 0 || { echo "historial-service sin tests"; exit 1; }
          pytest tests/ --cov=app.history.service --cov-fail-under=75 --cov-report=term-missing -v
      - name: download-service
        working-directory: app/QuetxalTV/microservices/download-service
        env:
          PYTHONPATH: src
```

### CD hacia ambiente develop

Ruta: `.github/workflows/cd-develop.yml`

```yaml
name: CD - develop -> Compute Engine

on:
  push:
    branches: [develop]

env:
  REGISTRY: ${{ secrets.ARTIFACT_REGISTRY_LOCATION }}-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/${{ secrets.ARTIFACT_REGISTRY_REPOSITORY }}

jobs:
  ci-gate:
    name: CI gate
    uses: ./.github/workflows/ci.yml

  provision-infra:
    name: Infra (Terraform + Ansible)
    needs: ci-gate
    uses: ./.github/workflows/infra.yml
    permissions:
      id-token: write
      contents: read
    secrets: inherit

  build:
    name: Build and push (tag develop)
    needs: [ci-gate, provision-infra]
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.GCP_SA_EMAIL }}
      - name: Configure Docker auth
        run: gcloud auth configure-docker ${{ secrets.ARTIFACT_REGISTRY_LOCATION }}-docker.pkg.dev -q
      - name: Build application images only
        run: |
          set -euo pipefail
          API_URL="http://${{ needs.provision-infra.outputs.dev_host || secrets.GCE_INSTANCE_IP }}:3000"
          docker build --build-arg VITE_API_URL="$API_URL" --build-arg VITE_GATEWAY_URL="$API_URL" -t $REGISTRY/frontend:develop -f app/frontend/Dockerfile app/frontend
          docker push $REGISTRY/frontend:develop
          for SVC in api-gateway auth-service subscription-service catalogo-service fx-service notification-service historial-service download-service; do
            DIR="app/QuetxalTV/microservices/$SVC"
            [ "$SVC" = "api-gateway" ] && DIR="app/QuetxalTV/api-gateway"
            [ "$SVC" = "auth-service" ] && DIR="app/QuetxalTV/microservices/auth-service/auth-service"
            docker build -t $REGISTRY/$SVC:develop -f $DIR/Dockerfile $DIR
            docker push $REGISTRY/$SVC:develop
          done

  db-migrations:
    name: DB migrations on external VM
    needs: [provision-infra, build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Copy and apply migrations directly to DB VM
        env:
          SSH_USER: ${{ secrets.GCE_SSH_USER }}
          SSH_KEY: ${{ secrets.GCE_SSH_PRIVATE_KEY }}
        run: |
          set -euo pipefail
          HOST="${{ needs.provision-infra.outputs.db_public_ip || secrets.GCE_DB_PUBLIC_IP }}"
          for s in HOST SSH_USER SSH_KEY; do
            [ -n "${!s:-}" ] || { echo "::error::Missing $s"; exit 1; }
          done
          KEY_FILE="$RUNNER_TEMP/quetxal_db_key"
          if [[ "$SSH_KEY" == '"'*'"' ]]; then SSH_KEY="${SSH_KEY:1:${#SSH_KEY}-2}"; fi
          printf '%b\n' "$SSH_KEY" | sed 's/\r$//' > "$KEY_FILE"
          chmod 600 "$KEY_FILE"
          ssh-keygen -y -f "$KEY_FILE" >/dev/null || { echo "::error::Invalid GCE_SSH_PRIVATE_KEY format. Store only the private key contents, without GCE_SSH_PRIVATE_KEY= or wrapping quotes."; exit 1; }
          trap 'rm -f "$KEY_FILE" mig.tgz' EXIT
          tar czf mig.tgz app/QuetxalTV/database/migrations infra/ansible/files/apply-migrations.sh
          scp -i "$KEY_FILE" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null mig.tgz "$SSH_USER@$HOST:/tmp/mig.tgz"
          ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SSH_USER@$HOST" '
            set -euo pipefail
            sudo rm -rf /tmp/quetxal-mig /opt/quetxal/migrations
            sudo mkdir -p /tmp/quetxal-mig /opt/quetxal/migrations
```

### CD hacia release con GKE, despliegue y rollback

Ruta: `.github/workflows/cd-release.yml`

```yaml
--dry-run=client -o yaml | kubectl apply -f -
          kubectl delete job subscription-audit-migration -n $NAMESPACE --ignore-not-found=true
      - name: Apply manifests without relational DB pods
        run: |
          set -euo pipefail
          command -v envsubst >/dev/null || { sudo apt-get update && sudo apt-get install -y gettext-base; }
          export IMAGE_TAG="$VER"
          export GCP_PROJECT_ID="${{ secrets.GCP_PROJECT_ID }}"
          export GCP_SA_EMAIL="${{ secrets.GCP_SA_EMAIL }}"
          export ARTIFACT_REGISTRY_LOCATION="${{ secrets.ARTIFACT_REGISTRY_LOCATION }}"
          export ARTIFACT_REGISTRY_REPOSITORY="${{ secrets.ARTIFACT_REGISTRY_REPOSITORY }}"
          export MONITOR_PRIVATE_IP="${{ needs.provision-infra.outputs.monitor_private_ip || secrets.MONITOR_PRIVATE_IP }}"
          for f in k8s/service-accounts/*.yaml k8s/databases/redis.yaml k8s/deployments/*.yaml k8s/services/*.yaml k8s/jobs/*.yaml k8s/cronjobs/*.yaml k8s/observability/*.yaml; do
            envsubst '${IMAGE_TAG} ${GCP_PROJECT_ID} ${GCP_SA_EMAIL} ${ARTIFACT_REGISTRY_LOCATION} ${ARTIFACT_REGISTRY_REPOSITORY} ${MONITOR_PRIVATE_IP}' < "$f" | kubectl apply -f -
          done
          kubectl apply -f k8s/ingress.yaml
      - name: Wait for audit migration
        run: |
          set -euo pipefail
          JOB=subscription-audit-migration
          if ! kubectl wait --for=condition=complete --timeout=300s job/$JOB -n $NAMESPACE; then
            kubectl logs -n $NAMESPACE -l app=subscription-audit-migration --tail=200 || true
            kubectl describe job/$JOB -n $NAMESPACE || true
            exit 1
          fi
      - name: Verify rolling update with rollback
        run: |
          set -euo pipefail
          FAILED=0
          ALL="redis auth-service subscription-service catalogo-service fx-service notification-service historial-service download-service frontend api-gateway"
          for DEP in $ALL; do
            echo "$DEP"
            if ! kubectl rollout status deployment/$DEP -n $NAMESPACE --timeout=10m; then
              kubectl describe deployment/$DEP -n $NAMESPACE || true
              kubectl describe pods -n $NAMESPACE -l app=$DEP || true
              kubectl logs -n $NAMESPACE -l app=$DEP --all-containers --tail=200 || true
              kubectl rollout undo deployment/$DEP -n $NAMESPACE || true
              FAILED=1
            fi
          done
          [ "$FAILED" -eq 0 ] || exit 1

  smoke:
    name: Smoke tests after GKE deploy
    needs: deploy
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.GCP_SA_EMAIL }}
      - uses: google-github-actions/get-gke-credentials@v2
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}
          cluster_name: ${{ secrets.GKE_CLUSTER_NAME }}
          location: ${{ secrets.GKE_CLUSTER_ZONE }}
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Resolve Ingress URL
        id: ingress
        run: |
          set -euo pipefail
          for i in $(seq 1 30); do
            IP=$(kubectl get ingress quetxal-tv-ingress -n quetxal-tv-prod -o jsonpath='{.status.loadBalancer.ingress[0].ip}' || true)
            [ -n "$IP" ] && break
            sleep 10
          done
          [ -n "${IP:-}" ] || { echo "::error::Ingress has no IP"; exit 1; }
          echo "base_url=http://$IP" >> "$GITHUB_OUTPUT"
      - name: Run smoke suite
        env:
          BASE_URL: ${{ steps.ingress.outputs.base_url }}
        run: |
          set -euo pipefail
          pip install -r tests/smoke/requirements.txt -q
          python tests/smoke/smoke_test.py

  backup-after-deploy:
    name: Backup after deploy
    needs: [provision-infra, smoke]
    uses: ./.github/workflows/backup.yml
    with:
      target: gce
      db_public_ip: ${{ needs.provision-infra.outputs.db_public_ip }}
      gcs_backup_bucket: ${{ needs.provision-infra.outputs.gcs_backup_bucket }}
    permissions:
      id-token: write
      contents: read
    secrets: inherit
```

### Smoke tests posteriores al despliegue

Ruta: `tests/smoke/smoke_test.py`

```python
import os
import sys

import requests


BASE = os.environ["BASE_URL"].rstrip("/")
TIMEOUT = 10

CHECKS = [
    ("GET", "/api/health", {200}),
    ("GET", "/", {200}),
    ("GET", "/api/catalog", {200, 401}),
    ("POST", "/api/auth/login", {200, 400, 401}),
]


def main() -> int:
    failures = 0
    for method, path, expected in CHECKS:
        try:
            response = requests.request(method, f"{BASE}{path}", timeout=TIMEOUT)
            ok = response.status_code in expected
            print(f"{'OK' if ok else 'FAIL'} {method} {path} -> {response.status_code}")
            failures += 0 if ok else 1
        except Exception as exc:
            failures += 1
            print(f"FAIL {method} {path} -> {exc}")

    print(f"Smoke result: {len(CHECKS) - failures}/{len(CHECKS)} OK")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
```



GitHub Actions ayuda a garantizar que los cambios pasen por validaciones automáticas antes de integrarse. Esto reduce errores manuales y evita que código defectuoso llegue a `develop` o `release`.

## Conclusión

GitHub Actions fue una decisión adecuada porque automatiza el ciclo de validación y despliegue del proyecto, soporta el backend políglota y permite mantener control de calidad mediante pruebas, cobertura, build, migraciones, smoke tests y despliegue controlado por ramas.
