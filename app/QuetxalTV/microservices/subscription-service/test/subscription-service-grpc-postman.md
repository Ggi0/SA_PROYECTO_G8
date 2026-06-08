# Subscription Service - Pruebas gRPC Directas en Postman

Esta prueba es solo para depurar el microservicio directamente. Para el flujo oficial del proyecto se debe usar la coleccion HTTP via API Gateway.

## Preparacion

1. Levanta el servicio:

```powershell
cd app\QuetxalTV
docker compose -f docker-compose.local.yml up -d --build subscription-service
```

2. Confirma que escucha en gRPC:

```powershell
docker compose -f docker-compose.local.yml logs subscription-service
```

Debe aparecer:

```text
Subscription Service listening on :50053
```

## Crear Request gRPC En Postman

1. Click en `New`.
2. Selecciona `gRPC`.
3. En server URL escribe:

```text
localhost:50053
```

4. Si Postman no lista los metodos automaticamente, importa este proto:

```text
app/QuetxalTV/proto/subscription/subscription.proto
```

5. Selecciona el servicio:

```text
subscription.SubscriptionService
```

## Requests

### GetPlans

Metodo:

```text
GetPlans
```

Mensaje:

```json
{}
```

### GetPlanById

Metodo:

```text
GetPlanById
```

Mensaje:

```json
{
  "plan_id": "1"
}
```

### GetPlansWithRates

Metodo:

```text
GetPlansWithRates
```

Mensaje:

```json
{
  "currency": "GTQ",
  "user_id": "11111111-1111-1111-1111-111111111111"
}
```

### Subscribe

Metodo:

```text
Subscribe
```

Mensaje:

```json
{
  "user_id": "11111111-1111-1111-1111-111111111111",
  "plan_id": "1",
  "currency": "GTQ",
  "payment_method": "card"
}
```

### GetUserSubscription

Metodo:

```text
GetUserSubscription
```

Mensaje:

```json
{
  "user_id": "11111111-1111-1111-1111-111111111111"
}
```

### GetPaymentHistory

Metodo:

```text
GetPaymentHistory
```

Mensaje:

```json
{
  "user_id": "11111111-1111-1111-1111-111111111111",
  "limit": 10,
  "offset": 0
}
```

### CancelSubscription

Metodo:

```text
CancelSubscription
```

Mensaje:

```json
{
  "user_id": "11111111-1111-1111-1111-111111111111",
  "reason": "Cancelado desde prueba gRPC directa"
}
```
