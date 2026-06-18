# Integración del Panel Admin — Catálogo

## Archivos generados

| Archivo | Destino en tu proyecto |
|---|---|
| `CatalogAdminPage.tsx` | `src/pages/admin/CatalogAdminPage.tsx` |
| `ContentForm.tsx` | `src/pages/admin/components/ContentForm.tsx` |
| `ScheduleModal.tsx` | `src/pages/admin/components/ScheduleModal.tsx` |
| `catalog-admin-functions.ts` | Pegar al final de `src/api/catalog.ts` |

---

## 1. Agregar funciones al catalog.ts

Abre `src/api/catalog.ts` y pega todo el contenido de `catalog-admin-functions.ts` al final del archivo.

También agrega estos tipos a la interface `CatalogGrpcService` en `catalog.service.ts` del API Gateway:

```typescript
createContent(data: CreateContentRequest): Observable<unknown>;
updateContent(data: UpdateContentRequest): Observable<unknown>;
publishContent(data: { contentId: string }): Observable<unknown>;
createPerson(data: CreatePersonRequest): Observable<unknown>;
addPersonToContent(data: AddPersonToContentRequest): Observable<unknown>;
```

---

## 2. Agregar endpoints al API Gateway

En `catalog.controller.ts` agrega:

```typescript
import { Body, Patch, Post } from '@nestjs/common'

@Post('content')
createContent(@Body() body: CreateContentPayload) {
  return this.catalogService.createContent(body)
}

@Patch('content/:id')
updateContent(@Param('id') id: string, @Body() body: UpdateContentPayload) {
  return this.catalogService.updateContent({ contentId: id, ...body })
}

@Post('content/:id/publish')
publishContent(@Param('id') id: string) {
  return this.catalogService.publishContent(id)
}

@Post('person')
createPerson(@Body() body: CreatePersonPayload) {
  return this.catalogService.createPerson(body)
}

@Post('content/:id/cast')
addPersonToContent(@Param('id') id: string, @Body() body: AddPersonToContentPayload) {
  return this.catalogService.addPersonToContent(id, body.personId, body.roleType, body.characterName, body.billingOrder)
}
```

---

## 3. Agregar rutas en AppRoutes.tsx

```tsx
import CatalogAdminPage from '@/pages/admin/CatalogAdminPage'

// Dentro del Route path="/admin":
<Route path="catalog" element={<CatalogAdminPage />} />
```

---

## 4. Agregar link en el sidebar (layoutAdmin.tsx)

```tsx
import { Film } from 'lucide-react'

// En NAV_ITEMS:
{
  label: 'Catálogo',
  href: '/admin/catalog',
  icon: Film,
},
```

---

## 5. Crear carpeta de componentes

```
src/pages/admin/
├── layoutAdmin.tsx       (ya existe)
├── mainPage.tsx          (ya existe)
├── CatalogAdminPage.tsx  (nuevo)
└── components/
    ├── ContentForm.tsx   (nuevo)
    └── ScheduleModal.tsx (nuevo)
```

---

## Notas

- El modal de programación de estreno actualmente llama `publishContent` inmediatamente.
  Cuando el backend soporte fecha futura en el proto, solo hay que extender el payload en `ScheduleModal.tsx`.
- Los colores usan las variables del tema (`spotlight`, `silver`, `film`, `#1a1408`, etc.) igual que el layout existente.
- Se usa `@tanstack/react-query` que ya estaba instalado en el proyecto.
