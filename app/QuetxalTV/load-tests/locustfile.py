import os
import random
from locust import HttpUser, between, task


def auth_headers():
    token = os.getenv("JWT_TOKEN", "").strip()
    if not token:
        return {}
    return {"Authorization": f"Bearer {token}"}


class QuetxalTvUser(HttpUser):
    wait_time = between(1, 3)

    @task(5)
    def health_live(self):
        self.client.get("/health/live", name="GET /health/live")

    @task(5)
    def health_ready(self):
        self.client.get("/health/ready", name="GET /health/ready")

    @task(4)
    def catalog_home(self):
        self.client.get("/catalog?page=1&page_size=12", name="GET /catalog")

    @task(3)
    def catalog_search(self):
        term = random.choice(["matrix", "dark", "amor", "accion", "serie"])
        self.client.get(f"/catalog/search?q={term}", name="GET /catalog/search")

    @task(2)
    def genres(self):
        self.client.get("/catalog/genres", name="GET /catalog/genres")

    @task(2)
    def plans(self):
        self.client.get("/subscriptions/plans", name="GET /subscriptions/plans")

    @task(1)
    def fx_rates(self):
        self.client.get("/fx/rates", name="GET /fx/rates")

    @task(1)
    def authenticated_continue_watching(self):
        profile_id = os.getenv(
            "TEST_PROFILE_ID",
            "00000000-0000-0000-0000-000000000000",
        )

        headers = auth_headers()

        if not headers:
            return

        self.client.get(
            f"/historial/continue-watching/{profile_id}?limit=10",
            headers=headers,
            name="GET /historial/continue-watching/:profileId",
        )