from locust import HttpUser, between, task


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
