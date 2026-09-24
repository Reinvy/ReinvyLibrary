---
title: "Elysia.js OpenAPI Documentation Cheatsheet"
description: "A quick reference for documenting Elysia.js APIs with the Swagger plugin — schema-to-OpenAPI generation, tags and summaries, security schemes, and exporting the spec."
category: "backend"
technology: "elysiajs"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# Elysia.js OpenAPI Documentation Cheatsheet

## Quick Reference Table

| Action | Code | Description |
|--------|------|-------------|
| Install the plugin | `bun add @elysiajs/swagger` | Adds OpenAPI 3 generation to the app |
| Register the plugin | `.use(swagger())` | Serves the docs UI at `/swagger` |
| Move the UI | `swagger({ path: '/docs' })` | Changes where the UI is mounted |
| Move the JSON spec | `swagger({ specPath: '/docs/json' })` | Changes where the raw spec is served |
| Set spec metadata | `documentation: { info: { version: '1.2.0' } }` | Writes `info.version` and friends |
| Describe an operation | `detail: { summary: '...' }` | Operation-level title in the UI |
| Group operations | `detail: { tags: ['Users'] }` | Creates collapsible sections in the UI |
| Hide a route | `detail: { hide: true }` | Keeps the route out of the spec |
| Document a body | `body: t.Object({ ... })` | Emitted as `requestBody` |
| Document responses | `response: { 200: Ok, 404: Err }` | One documented response per status |
| Document path params | `params: t.Object({ id: t.Numeric() })` | Emitted as typed `parameters` |
| Attach a security scheme | `detail: { security: [{ bearerAuth: [] }] }` | Marks the operation as protected |

## Common Commands

```bash
# Add the Swagger plugin alongside Elysia
bun add elysia @elysiajs/swagger

# Start the dev server with hot reload
bun run --watch src/index.ts

# Confirm the spec is served and list documented paths
curl -s http://localhost:3000/swagger/json | jq -r '.paths | keys[]'
```

### Inspect and Export the Spec

```bash
# Save the generated OpenAPI document to disk
curl -s http://localhost:3000/swagger/json -o openapi.json

# Validate the document against the OpenAPI 3 schema
bunx @redocly/cli lint openapi.json

# Generate TypeScript types for consumers from the saved spec
bunx openapi-typescript openapi.json -o src/types/api.d.ts
```

## Code Snippets

### Minimal Setup

```typescript
import { Elysia, t } from 'elysia'
import { swagger } from '@elysiajs/swagger'

const app = new Elysia()
  .use(
    swagger({
      path: '/docs',
      documentation: { info: { title: 'Reinvy Inventory API', version: '1.0.0' } }
    })
  )
  .listen(3000)
```

Every declared route appears in the spec automatically, but routes without a `detail` block get generated summaries that age badly.

### Tags, Summaries, and Descriptions

```typescript
const app = new Elysia()
  .use(swagger({ path: '/docs' }))
  .get('/products/:id', ({ params }) => getProduct(params.id), {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
    detail: {
      tags: ['Products'],
      summary: 'Get a product by id',
      description: 'Returns a single product with its current stock level.'
    }
  })
```

Keep the `tags` list small and stable — a tag is a navigation section, not a label. Hide health probes and metric scrapers with `detail: { hide: true }` instead of documenting endpoints nobody should call.

### Bearer Auth Scheme

```typescript
const app = new Elysia()
  .use(
    swagger({
      path: '/docs',
      documentation: {
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          }
        }
      }
    })
  )
  .guard({ detail: { security: [{ bearerAuth: [] }] } })
  .use(ordersPlugin)
```

Declaring `security` on a guard applies it to every route inside the group, so the "Authorize" button in the UI covers the whole protected surface.

### Per-Status Response Schemas

```typescript
import { Elysia, t } from 'elysia'
import { swagger } from '@elysiajs/swagger'

const Product = t.Object({
  id: t.String({ format: 'uuid' }),
  name: t.String(),
  stock: t.Integer({ minimum: 0 })
})

const NotFound = t.Object({
  error: t.Literal('NOT_FOUND'),
  message: t.String()
})

const app = new Elysia()
  .use(swagger({ path: '/docs' }))
  .get('/products/:id', async ({ params, status }) => {
    const product = await findProduct(params.id)
    if (!product) return status(404, { error: 'NOT_FOUND', message: 'No such product' })
    return product
  }, {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
    response: { 200: Product, 404: NotFound },
    detail: { tags: ['Products'], summary: 'Get a product' }
  })
```

Response schemas do double duty: they validate output at runtime and populate `responses` in the spec. Without them, clients see untyped `200` entries.

### Exporting the Spec in CI

```typescript
// scripts/export-openapi.ts
import { app } from '../src/index'

const response = await app.handle(new Request('http://localhost/docs/json'))

if (!response.ok) {
  console.error(`Spec export failed: HTTP ${response.status}`)
  process.exit(1)
}

const spec = await response.json()
await Bun.write('openapi.json', JSON.stringify(spec, null, 2))
console.log(`Wrote ${Object.keys(spec.paths).length} paths`)
```

Run this in CI and diff the output; an unexpected change to `openapi.json` is a breaking-change signal for downstream clients.
