---
title: "Building an E-commerce Storefront with SvelteKit"
description: "Build a SvelteKit storefront with SSR product pages, reactive cart state, a server-validated checkout, SEO metadata, and Stripe payment integration."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building an E-commerce Storefront with SvelteKit

## Summary

This tutorial builds a production-shaped storefront with SvelteKit: a server-rendered catalog, a cart that survives navigation, a checkout that re-prices on the server, and Stripe confirmation through a webhook. You will also add metadata that makes product pages indexable.

## Target Audience

- Frontend developers who know Svelte basics and want a realistic SvelteKit project.
- Developers moving a client-rendered storefront to server-side rendering (intermediate level).

## Prerequisites

- Node.js 20+ and npm installed.
- Working knowledge of Svelte 5 runes (`$state`, `$derived`, `$props`).
- A Stripe account with test API keys, plus basic SQL familiarity (examples use SQLite via `better-sqlite3`).

## Learning Objectives

- Load product data with typed server `load` functions.
- Share cart state across routes without leaking it between visitors.
- Validate prices and stock server-side before creating a payment.
- Confirm orders through a signed Stripe webhook.

## Context and Motivation

A slow first paint costs conversions, and a price trusted from the browser costs money. SvelteKit covers both in one project: the same route renders HTML for crawlers and hydrates a reactive cart for humans. The discipline throughout is separating what the browser may decide (which product, how many) from what only the server may decide (price, stock, whether payment succeeded).

## Core Content

### Render the catalog on the server

Product pages are read-heavy and change slowly. A `+page.server.ts` load function queries the database and returns serializable data, so SvelteKit ships complete HTML on first byte — name, price, and description visible to crawlers.

### Keep cart state per-visitor

Cart state cannot live in a module-level server variable. Keep it in a `.svelte.ts` module persisted to `localStorage` and treat it as a proposal: checkout re-reads product rows and recomputes totals, rejecting a cart that claims a laptop costs one cent.

### Make checkout a server transaction

The checkout action receives product IDs and quantities, loads authoritative prices, verifies stock, writes a `pending` order, then creates a Checkout Session with a server-defined amount. The browser is redirected to Stripe; nothing sensitive round-trips through the client.

### Confirm payment with a webhook, then describe pages to crawlers

Verify the Stripe signature against the raw body, then mark the order `paid` in the same transaction that decrements stock. Return 200 quickly and make the handler idempotent, because Stripe retries. Product routes also need a unique title, a canonical link, Open Graph tags, and `Product` JSON-LD rendered from loaded data in `<svelte:head>`.

## Code Examples

```typescript
// src/routes/products/[slug]/+page.server.ts
export const load: PageServerLoad = async ({ params, setHeaders }) => {
    const product = db.prepare('SELECT id, slug, name, price_cents, stock FROM products WHERE slug = ?')
        .get(params.slug) as Product | undefined;
    if (!product) throw error(404, 'Product not found');
    setHeaders({ 'cache-control': 'public, max-age=60, stale-while-revalidate=300' });
    return { product, available: product.stock > 0 };
};
```

```typescript
// src/lib/cart.svelte.ts
const STORAGE_KEY = 'storefront-cart';

function readStorage(): CartItem[] {
    if (!browser) return [];
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as CartItem[];
    } catch (err) {
        console.error('Corrupt cart payload, resetting', err);
        return [];
    }
}

class Cart {
    items = $state<CartItem[]>(readStorage());
    totalCents = $derived(this.items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0));
    add(item: CartItem, quantity = 1): void {
        const existing = this.items.find((i) => i.productId === item.productId);
        if (existing) existing.quantity += quantity;
        else this.items.push({ ...item, quantity });
        if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    }
}
export const cart = new Cart();
```

```typescript
// src/routes/checkout/+page.server.ts
export const actions: Actions = {
    default: async ({ request, url }) => {
        const raw = String((await request.formData()).get('items') ?? '[]');
        let entries: Array<{ productId: string; quantity: number }>;
        try {
            entries = JSON.parse(raw);
        } catch {
            return fail(400, { message: 'Cart payload is not valid JSON' });
        }
        if (!Array.isArray(entries) || entries.length === 0) {
            return fail(400, { message: 'Your cart is empty' });
        }
        const lineItems = [];
        for (const { productId, quantity } of entries) {
            const row = db.prepare('SELECT name, price_cents, stock FROM products WHERE id = ?')
                .get(productId) as Product | undefined;
            if (!row) return fail(400, { message: 'A product no longer exists' });
            if (quantity < 1 || quantity > row.stock) {
                return fail(409, { message: `Insufficient stock for ${row.name}` });
            }
            const price_data = { currency: 'usd', unit_amount: row.price_cents, product_data: { name: row.name } };
            lineItems.push({ quantity, price_data });
        }
        const order = createOrder(lineItems);
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: lineItems,
            client_reference_id: order.id,
            success_url: `${url.origin}/orders/${order.id}?status=success`,
            cancel_url: `${url.origin}/cart`
        });
        throw redirect(303, session.url ?? '/cart');
    }
};
```

```typescript
// src/routes/api/stripe/webhook/+server.ts
export const POST: RequestHandler = async ({ request }) => {
    const signature = request.headers.get('stripe-signature');
    if (!signature) return json({ error: 'Missing signature' }, { status: 400 });
    try {
        const event = stripe.webhooks.constructEvent(
            await request.text(), signature, env.STRIPE_WEBHOOK_SECRET ?? ''
        );
        if (event.type === 'checkout.session.completed') {
            const s = event.data.object as Stripe.Checkout.Session;
            markOrderPaid(s.client_reference_id ?? '', String(s.payment_intent));
        }
        return json({ received: true });
    } catch (err) {
        console.error('Webhook verification failed', err);
        return json({ error: 'Invalid signature' }, { status: 400 });
    }
};
```

## Key Insights

- **Never trust a client price.** Re-read amounts from the database inside the action; that rule prevents most storefront fraud.
- **Cart state is client state.** A `.svelte.ts` module plus `localStorage` keeps it per-visitor instead of leaking across requests.
- **Webhooks need the raw body and idempotency.** Parsing JSON before `constructEvent` breaks verification, and Stripe retries, so `markOrderPaid` must no-op on repeats.

## Next Steps

- Add inventory reservation with expiry so abandoned checkouts release stock.
- Introduce variants (size, color) and rebuild line items around SKUs.
- Read the SvelteKit performance optimization guide to tune SSR and bundles.

## Conclusion

Each part now does one job: the server renders HTML for crawlers, the client owns ephemeral cart state, and money moves only after a signed webhook. That boundary is the reusable part of this build.
