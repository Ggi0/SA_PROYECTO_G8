from locust import HttpUser, between, task
import os
import random


def auth_headers():
    token = os.getenv("JWT_TOKEN", "").strip()
    if not token:
        return {}
    return {"Authorization": f"Bearer {token}"}


class QuetxalUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def health(self):
        self.client.get("/api/health", name="health")

    @task(5)
    def catalog(self):
        self.client.get("/api/catalog", name="catalog")

    @task(2)
    def home(self):
        self.client.get("/", name="frontend")

    @task(1)
    def login(self):
        self.client.post(
            "/api/auth/login",
            json={"email": "demo@quetxal.tv", "password": "demo"},
            name="login",
        )

    # Estas tareas permiten generar tráfico adicional para validar logs, métricas y comportamiento del API Gateway bajo carga.
    @task(5)
    def health_live(self):
        self.client.get("/api/health/live", name="health-live")

    @task(5)
    def health_ready(self):
        self.client.get("/api/health/ready", name="health-ready")

    @task(4)
    def catalog_paginated(self):
        self.client.get(
            "/api/catalog?page=1&page_size=12",
            name="catalog-paginated",
        )

    @task(3)
    def catalog_search(self):
        search_terms = ["matrix", "accion", "drama", "comedia", "serie"]
        term = random.choice(search_terms)

        self.client.get(
            f"/api/catalog/search?q={term}",
            name="catalog-search",
        )

    @task(2)
    def catalog_genres(self):
        self.client.get("/api/catalog/genres", name="catalog-genres")

    @task(2)
    def subscription_plans(self):
        self.client.get("/api/subscriptions/plans", name="subscription-plans")

    @task(1)
    def fx_rates(self):
        self.client.get("/api/fx/rates", name="fx-rates")

    @task(1)
    def continue_watching(self):
        token = os.getenv("JWT_TOKEN", "").strip()

        if not token:
            return

        profile_id = os.getenv("LOCUST_PROFILE_ID", "1")

        self.client.get(
            f"/api/historial/continue-watching/{profile_id}?limit=10",
            headers=auth_headers(),
            name="continue-watching",
        )