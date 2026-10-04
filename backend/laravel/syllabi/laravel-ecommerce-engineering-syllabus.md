---
title: "Laravel E-Commerce Engineering Syllabus"
description: "A comprehensive 12-week advanced curriculum for Laravel developers who want to specialize in building production-grade e-commerce platforms, covering catalog modeling, cart and checkout state machines, payment gateway integration, order fulfillment, inventory and stock control, pricing and promotions, headless commerce APIs, subscriptions, fraud and PCI-DSS compliance, and commerce-scale performance."
category: "backend"
technology: "laravel"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Laravel E-Commerce Engineering Syllabus

## Overview

This 12-week advanced syllabus is designed for Laravel developers who already build web applications confidently and want to specialize in the domain where Laravel is used most in production: e-commerce. E-commerce is not "CRUD with a cart" — it is distributed-systems engineering wearing a storefront disguise. Order state machines must survive network failures, payment webhooks must be idempotent, inventory reservations must be race-free under concurrent checkouts, and a single promo-code bug can leak revenue.

The curriculum treats commerce as a set of disciplined subsystems rather than a plugin list. You will model product catalogs with variant-aware schemas, design cart and checkout state machines, integrate real payment gateways (including Indonesian providers such as Midtrans and Xendit alongside Stripe), build order and fulfillment pipelines, implement race-safe inventory ledgers, design promotion and pricing engines, expose headless storefront APIs, add subscription billing, and harden the whole platform against fraud, abuse, and PCI-DSS scope. Every module pairs architecture theory with hands-on labs that build one continuous commerce platform, culminating in a capstone marketplace project.

By the end of this course, learners will be able to reason about money-moving systems with the same rigor as about code: transactional boundaries, idempotency keys, reconciliation, and failure recovery will be second nature, and they will be able to defend commerce architecture decisions with concrete trade-off analysis.

## Curriculum

### Module 1: E-Commerce Domain Modeling (Week 1)

- **Catalog fundamentals**
  - Products, variants, and SKUs — the canonical three-level model
  - When a product becomes multiple SKUs (size, color, storage) and how to price variants
  - Categories, taxonomies, and attribute sets without the EAV anti-pattern hangover
- **Schema design in Eloquent**
  - `products`, `product_variants`, `skus`, `categories`, and pivot relationships
  - JSON attributes vs dedicated tables vs a restrained EAV for extensible fields
  - Soft deletes, published/unpublished states, and versioned product data
- **Money as a first-class value**
  - Storing amounts as integers (minor units) instead of floats — the currency trap
  - Multi-currency modeling and exchange-rate handling
- **Hands-on Lab**: Build the catalog schema for a fashion store with variants and nested categories; write migrations, seeders, and factory definitions

### Module 2: Cart and Checkout State Machines (Week 2)

- **Cart lifecycle**
  - Guest vs authenticated carts and the merge-on-login problem
  - Cart expiration, persistence, and the abandoned-cart funnel
  - Cart line items, quantities, and validation against current prices and stock
- **Checkout as a state machine**
  - States: `pending`, `collecting_address`, `payment_selected`, `processing`, `authorized`, `captured`, `failed`, `cancelled`
  - Guarded transitions and the single-responsibility rule for each transition
  - Idempotency — preventing double-submit and double-charge with idempotency keys
- **Orders and the transactional boundary**
  - When does the order row exist? The atomic "reserve + persist order" step
  - Snapshotting product data into the order line (price, options, seller) so history never changes
- **Hands-on Lab**: Implement the checkout state machine as an Eloquent model with explicit transition methods, plus an idempotent `POST /checkout` endpoint

### Module 3: Payment Gateway Integration (Week 3)

- **Gateway abstraction**
  - A `PaymentGateway` interface with providers behind it — the adapter pattern from the advanced syllabus applied to commerce
  - Midtrans (Snap, VA, QRIS, e-wallet), Xendit (invoices, VA, cards), and Stripe (Payment Intents, Checkout) as concrete adapters
  - Common operations: create payment, capture, refund, void, query status
- **Webhooks and settlement**
  - Signed webhooks, replay protection, and the "webhook is a hint, reconciliation is truth" rule
  - Updating order state from payment events with the state machine from Module 2
  - End-of-day settlement matching: gateway reports vs local transactions
- **Refunds and partial captures**
  - Refund state machines and money movement in both directions
  - Handling disputes/chargebacks with evidence collection
- **Hands-on Lab**: Integrate Midtrans Snap for a checkout; implement signed webhook handling, refund flow, and a daily reconciliation script

### Module 4: Order Management and Fulfillment (Week 5)

- **Order lifecycle beyond payment**
  - States: `paid`, `packed`, `shipped`, `delivered`, `return_requested`, `returned`, `completed`
  - Splitting a single order into multiple shipments (multi-warehouse, partial availability)
  - Shipping integrations and tracking numbers with shipment providers
- **Fulfillment workflows**
  - Queue-driven fulfillment pipelines (Laravel queues from the tutorials applied to picking, packing, labeling)
  - Pick/pack manifests, shipping labels, and AWB numbers — Indonesian logistics context (JNE, J&T, SiCepat, Pos Indonesia)
  - Delivery confirmation and the COD (cash on delivery) payment path
- **Returns and RMA**
  - Return merchandise authorization workflows and restocking
  - Refund-on-return and the interplay with the payment refund state machine
- **Hands-on Lab**: Build shipment splitting, a queue-backed fulfillment pipeline, and a return/RMA flow with automated refunds

### Module 5: Inventory and Stock Control (Week 5)

- **Inventory as a ledger**
  - Reservation vs committed vs available stock — three counters, not one
  - Stock movements as immutable ledger entries (`in`, `out`, `reserve`, `release`, `adjust`)
  - The double-entry rule: every movement has a counterpart, and the ledger never rewrites history
- **Race-free reservations**
  - Atomic decrements with conditional updates to prevent overselling under concurrency
  - Row locking vs optimistic locking vs Redis atomic counters — when each is right
  - Handling the "stock lost in cart" trade-off (reserve on add-to-cart vs reserve at checkout)
- **Replenishment and sync**
  - Low-stock alerts and purchase-order suggestions
  - Syncing with external warehouses/ERP and the eventual-consistency trap
- **Hands-on Lab**: Implement the stock ledger with atomic conditional updates, then load-test concurrent checkout against a single SKU with limited stock

### Module 6: Pricing, Promotions, and Coupons (Week 6)

- **Pricing engine**
  - Price lists, tiered/customer-group pricing, and sale pricing with date windows
  - Price computation order: base price → discounts → coupons → tax
- **Promotion engine**
  - Promotion rules as declarative data (conditions, actions) rather than scattered if-statements
  - Buy-X-get-Y, percentage/amount off, free shipping, minimum-order thresholds
  - Coupon codes: single-use, per-customer, per-order, expiry, and stackability rules
- **Preventing coupon abuse**
  - Rate limiting coupon redemption attempts, anomaly detection on usage patterns
  - The promo-stacking bug class — validating that computed totals always match the engine's rules
- **Hands-on Lab**: Build a declarative promotion engine with coupon codes and write property-based-style tests that enumerate stacking combinations

### Module 7: Headless Commerce APIs (Week 7)

- **Storefront API design**
  - Product listing, search, and detail endpoints with cursor pagination (from the pagination patterns in the repo's tutorials)
  - Caching strategies for catalog reads — the read-heavy side of commerce
  - API versioning and deprecation policy for third-party storefronts
- **Search beyond WHERE**
  - Full-text search with Scout and Meilisearch/OpenSearch for faceted product discovery
  - Facets, filters, and relevance tuning; keeping the search index in sync via queues
- **Admin APIs and the internal surface**
  - Separating storefront, admin, and partner API surfaces with distinct auth scopes
  - Rate limiting, API keys, and per-tenant quotas
- **Hands-on Lab**: Expose a public storefront API with cached product reads and faceted search, plus a scoped admin API for catalog management

### Module 8: Subscriptions and Recurring Billing (Week 8)

- **Subscription model design**
  - Plans, features, and entitlement checks — moving from "what the user paid for" to "what the user can do"
  - Trial periods, upgrades/downgrades, and proration math
  - Billing dates, anchor dates, and 30/31-day month edge cases
- **Recurring payment mechanics**
  - Gateway subscriptions vs internal billing engines vs hybrid (internal source of truth + gateway schedule)
  - The dunning cycle: retry schedules, failed-payment emails, and grace periods
  - Invoicing and PDF invoice generation
- **Cancellation and churn**
  - Cancel-at-period-end vs immediate cancellation semantics
  - Refund-on-cancel policies and the state machine for each path
- **Hands-on Lab**: Implement plans with prorated upgrades and a dunning cycle that retries failed invoices with escalating urgency

### Module 9: Commerce Security and Compliance (Week 9)

- **PCI-DSS scope reduction**
  - Why you should never touch raw card numbers: gateway-hosted checkout (Snap/Checkout), tokenization, and SAQ-A
  - Storing tokens, never PANs; the forbidden-data list
- **Fraud and abuse detection**
  - Velocity checks, geolocation/score signals, and manual review queues
  - Webhook forgery, promo abuse, and account-takeover defenses on checkout endpoints
  - Applying the OWASP Top 10 from the advanced syllabus specifically to money-moving endpoints
- **Data protection**
  - Indonesian PDP Law (UU PDP) and GDPR considerations for customer data
  - Anonymizing order history on account deletion while preserving financial records for tax
- **Hands-on Lab**: Scope a PCI-DSS SAQ-A-compliant checkout, then attack your own checkout with a forgery, replay, and velocity test suite

### Module 10: Performance and Scalability for Commerce (Week 10)

- **Read-path optimization**
  - Catalog caching layers (Redis from the advanced syllabus) and cache invalidation on product updates
  - CDN-caching storefront pages and the stale-price trade-off
  - Query optimization for product listing with filters — composite indexes from the Eloquent performance module
- **Write-path reliability**
  - Queue-driven order processing with Horizon and failure isolation per pipeline
  - Outbox pattern for reliable event publishing from order state transitions
  - Backpressure and load shedding during flash sales
- **Flash-sale architecture**
  - Pre-warming caches, request throttling, and queue-based admission control
  - Keeping inventory atomic under 10x traffic spikes
- **Hands-on Lab**: Load-test a flash-sale checkout path, profile bottlenecks, and apply caching-plus-queue fixes until throughput meets the target

### Module 11: Analytics, Personalization, and Reporting (Week 11)

- **Event tracking**
  - Commerce event taxonomy: `product_viewed`, `added_to_cart`, `checkout_started`, `order_placed`
  - Server-side tracking with queues and an event-lake table; UTM and session attribution
- **Personalization**
  - Product recommendations: rule-based (bought-together), collaborative filtering, and embedding-based (vector search) approaches
  - A/B testing checkout and pricing experiments without leaking revenue
- **Merchant reporting**
  - Sales, GMV, refund-rate, and conversion dashboards
  - Aggregated reporting tables (materialized rollups) instead of live aggregate queries on order tables
- **Hands-on Lab**: Instrument the platform with a commerce event pipeline, build a recommendations module, and ship a daily sales rollup report

### Module 12: Capstone Project — Multi-Vendor Marketplace (Week 12)

- **Capstone specification**
  - Extend the course platform into a multi-vendor marketplace: vendor onboarding, per-vendor catalogs and settlement, and platform commission rules
  - Vendor payout engine with minimum-balance thresholds and disbursement scheduling
  - Marketplace-level fraud review and dispute resolution between buyers and vendors
- **Integration requirements**
  - Every subsystem from Modules 1–11 must appear: catalog with variants, checkout states, gateway integration, fulfillment, inventory ledger, promotions, headless API, subscriptions for seller plans, security controls, performance work, and analytics
- **Delivery format**
  - Final project is a deployed, load-tested marketplace with documentation and a written architecture defense

## Final Project

Learners build and ship a multi-vendor marketplace platform. The project must handle the full commerce loop: vendors manage variant-aware catalogs, buyers shop through a headless storefront API, checkout persists through a guarded state machine, payments flow through a real gateway sandbox (Midtrans or Stripe test mode) with signed webhooks and daily reconciliation, inventory reservations stay race-free under concurrent load, promotions and coupon codes apply through the declarative engine, subscription seller plans bill via the dunning cycle, and merchant dashboards report sales and refunds from rollup tables.

The project must be deployed to a production-like environment, load-tested during a simulated flash sale, and accompanied by a written architecture document that defends each state machine, transactional boundary, and idempotency decision. A short recorded demo walking through a complete purchase — including a webhook-based payment notification and a refund — is required.

## Assessment Criteria

- **Assignments**: Weekly hands-on labs are graded on schema discipline (no float money, correct ledger semantics), state-machine correctness (guarded transitions, idempotent endpoints), and test coverage of failure paths (webhook replay, oversell, coupon stacking, double-submit). Labs must pass the instructor's hidden test suite before advancing.
- **Final Project**: Evaluated on end-to-end correctness of the money flow (order → payment → fulfillment → settlement), race safety under the flash-sale load test, PCI-DSS scope minimization, reconciliation completeness, code organization, and the strength of the architecture-defense write-up. The marketplace must survive the instructor's adversarial checklist: forged webhooks, replayed notifications, concurrent oversell attempts, and stacked coupon abuse.
- **Peer Review**: Each learner reviews one classmate's capstone against the same adversarial checklist and files structured findings, which are assessed for accuracy.

## References

- [Laravel official documentation](https://laravel.com/docs) — Eloquent, queues, cashier, and validation reference
- [Laravel Cashier (Stripe and Paddle)](https://laravel.com/docs/cashier) — subscription billing patterns
- [Midtrans documentation](https://docs.midtrans.com/) — Snap, VA, QRIS, and webhook signing for Indonesian payments
- [Xendit documentation](https://developers.xendit.co/) — invoices, cards, and payment channels
- [Stripe Payment Intents](https://docs.stripe.com/payments/payment-intents) — the canonical payment state machine
- [PCI Security Standards Council](https://www.pcisecuritystandards.org/) — SAQ-A and scope reduction guidance
- [Scout documentation](https://laravel.com/docs/scout) — full-text and faceted product search
- [Laravel Horizon](https://laravel.com/docs/horizon) — queue monitoring and failure isolation
- [UU PDP (Indonesian Personal Data Protection Law)](https://pdp.go.id/) — customer data handling requirements
