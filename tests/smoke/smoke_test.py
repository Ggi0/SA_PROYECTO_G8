import os
import sys

import requests


BASE = os.environ["BASE_URL"].rstrip("/")
TIMEOUT = 10

CHECKS = [
    # Smoke de release: solo rutas publicas/sin estado. Las rutas protegidas o
    # mutadoras requieren datos validos y pertenecen a pruebas funcionales.
    ("GET", "/api/health", {200}),
    ("GET", "/api/health/live", {200}),
    ("GET", "/api/health/ready", {200, 503}),
    ("GET", "/api/catalog", {200}),
    ("GET", "/api/catalog/genres", {200}),
    ("GET", "/api/subscriptions/plans", {200}),
    ("GET", "/api/fx/rates", {200}),
    ("GET", "/api/fx/rates/GTQ", {200}),
]


def main() -> int:
    failures = 0
    for method, path, expected in CHECKS:
        try:
            response = requests.request(method, f"{BASE}{path}", timeout=TIMEOUT)
            ok = response.status_code in expected
            body = response.text.replace("\n", " ")[:300]
            print(
                f"{'OK' if ok else 'FAIL'} {method} {path} -> "
                f"{response.status_code}; expected={sorted(expected)}; body={body}",
                flush=True,
            )
            failures += 0 if ok else 1
        except Exception as exc:
            failures += 1
            print(f"FAIL {method} {path} -> {exc}", flush=True)

    print(f"Smoke result: {len(CHECKS) - failures}/{len(CHECKS)} OK", flush=True)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
