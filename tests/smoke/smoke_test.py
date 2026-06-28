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
