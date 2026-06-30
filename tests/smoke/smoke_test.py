import os
import sys

import requests


BASE = os.environ["BASE_URL"].rstrip("/")
TIMEOUT = 10

CHECKS = [
    # ── Health ────────────────────────────────────────
    ("GET",  "/api/health",                              {200}),
    ("GET",  "/api/health/live",                         {200}),
    ("GET",  "/api/health/ready",                        {200, 503}),

    # ── Auth ──────────────────────────────────────────
    ("POST", "/api/auth/login",                          {200, 400, 401}),
    ("POST", "/api/auth/register",                       {200, 201, 400,500}),

    # ── Catálogo ──────────────────────────────────────
    ("GET",  "/api/catalog",                             {200, 401}),
    ("GET",  "/api/catalog/genres",                      {200, 401}),

    # ── Suscripciones ─────────────────────────────────
    ("GET",  "/api/subscriptions/me",                    {200, 401}),

    # ── FX ────────────────────────────────────────────
    ("GET",  "/api/fx/rates",                            {200}),
    ("GET",  "/api/fx/rates/GTQ",                        {200}),

    # ── Historial ─────────────────────────────────────
    ("GET",  "/api/historial/continue-watching/test",    {200, 401, 403}),

    # ── Descargas ─────────────────────────────────────
    ("GET",  "/api/downloads",                           {200, 401}),
    ("POST", "/api/downloads/initiate",                  {200, 201, 400, 401}),
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
