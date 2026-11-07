---
title: "Building Subscription Paywalls and In-App Purchases with React Native"
description: "Build a production-grade monetization layer in React Native: store product fetching, the purchase state machine, server-side receipt validation with StoreKit 2 and Play Billing, entitlement gating, and subscription lifecycle events like grace period, billing retry, and refunds."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building Subscription Paywalls and In-App Purchases with React Native

## Summary

This tutorial builds a complete subscription layer for a React Native app: a product catalog fetched from the store, a paywall that requests purchases through `react-native-iap`, a server that validates every transaction against Apple and Google before granting anything, and an entitlement provider that gates the rest of the UI. You end with a flow that survives the cases that break naive implementations — a purchase that completes after the network drops, a renewal that arrives while the app is closed, a refund that must revoke access, and a user who reinstalls on a new phone and expects their subscription back.

## Target Audience

- React Native and Expo developers shipping an app that charges for digital content, features, or quotas.
- Intermediate to advanced developers who are comfortable with TypeScript, an authenticated API, and a relational database.
- Backend engineers responsible for the API that the mobile client calls after a purchase.

## Prerequisites

- A React Native 0.74+ or Expo SDK 51+ project with TypeScript and an existing authentication flow that gives each user a stable server-side ID.
- A backend you control (Node, Go, PHP, anything) with a database and the ability to store secrets.
- `react-native-iap` (bare/prebuild) or `expo-iap` (Expo development build — neither library works inside Expo Go).
- Sandbox accounts: an App Store Connect sandbox tester and a Google Play license-testing account.
- Products already created in App Store Connect and Google Play Console. Store configuration is not code, and no amount of client work compensates for a missing product.

## Learning Objectives

By the end of this tutorial, you will be able to:
- Separate products, offerings, and entitlements so pricing changes never require an app release.
- Implement the purchase state machine: request, validate on the server, grant, then finish the transaction.
- Validate StoreKit 2 signed transactions and Play Billing purchases server-side instead of trusting the client.
- Handle renewals, grace periods, account holds, refunds, and revocations through store notifications.
- Build a paywall that shows localized store prices, restores purchases, and never leaves a paying user locked out.

## Context and Motivation

Monetization is the one part of a mobile app where a bug is measured in refunds, chargebacks, and one-star reviews instead of bounce rate. The failure modes are specific and unforgiving. A purchase that succeeds in the store but never reaches your server becomes a support ticket. A transaction that is never finished on Android is refunded automatically after three days. A subscription that renews while the app is closed must extend access without the user opening anything. A refund must revoke access immediately, even though the client believes it is paid up.

Almost every one of these is caused by the same architectural mistake: treating the purchase result on the device as the source of truth. The device is a client. Apple and Google are the payment processors, and your server is the ledger. Once that division is clear, the implementation stops being a pile of platform-specific special cases and becomes a small state machine with a webhook attached.

There is also a policy dimension. Apple's App Store Review Guidelines require in-app purchase for digital goods consumed inside the app, and a paywall that hides the restore option or misrepresents a price gets rejected. Google enforces the same rule through Play Billing. Reading prices from the store rather than hardcoding them is both a correctness requirement and a review requirement.

## Core Content

### The Store Owns the Money, Your Server Owns the Truth

Two authorities exist and they must never be confused. The store knows whether a payment succeeded. Your server decides whether the user has access. The client's job is to carry a receipt from one to the other and then render whatever the server says.

This means the client must never write "premium = true" into local storage after a purchase callback fires. Instead it posts the receipt to your API, the API verifies it with Apple or Google, records the subscription, and returns the current entitlements. The client caches that response with a short TTL and uses it to gate screens. A user who clears the cache gets the truth back on the next launch; a user who tampered with local storage gets nothing, because the server never agreed.

The practical consequence is that the app must work with a slow or failed verification. Design for three client states — verifying, entitled, not entitled — rather than a boolean. A purchase that is still verifying is not a purchase you should deny access to; it is a purchase you should show a spinner for, and retry.

### Products, Offerings, and Entitlements Are Three Different Things

Most early implementations collapse these into one identifier, and then every price experiment becomes a release.

- A **product** is what the store sells: `com.acme.pro.monthly`, `com.acme.pro.yearly`, `com.acme.credits.100`. Its price, currency, trial, and localizations live in App Store Connect and Play Console, not in your code.
- An **offering** is what the paywall displays right now: "the two-plan upgrade screen" or "the Black Friday screen". An offering maps a slot (monthly, yearly) to a concrete product ID. Keeping that mapping server-side lets you swap the yearly product for a promotional one without shipping a build.
- An **entitlement** is what the user can do: `pro`, `team_seats: 5`, `export_credits: 100`. It is the only thing application code should ever check.

The mapping table is small and worth writing down explicitly, because it is the seam where pricing experiments happen.

```text
Offering: "default"
  monthly  -> com.acme.pro.monthly   (product type: subs, group: pro)
  yearly   -> com.acme.pro.yearly    (product type: subs, group: pro)
  credits  -> com.acme.credits.100   (product type: in-app, consumable)

Offering resolution (client suggests, server decides):
  user.segment == "trial_eligible"  -> offering "default"
  user.segment == "winback"         -> offering "winback_40"
  user.region  == "id"              -> offering "id_local_pricing"
```

Notice the direction of authority: the client asks which offering to show, the server answers, and the client fetches the products named in that answer. A client that decides on its own which product to sell drifts out of sync with the store the moment a product is removed.

### The Purchase State Machine

Every platform follows the same five-step sequence, and skipping a step produces a specific, recognizable bug.

```text
1. fetch products      -> store returns localized price, title, trial info
2. request purchase    -> store charges the user, returns a signed receipt
3. verify on server    -> server asks Apple/Google "is this real and current?"
4. grant entitlement   -> server upserts the subscription row
5. finish transaction  -> client acknowledges; otherwise Android auto-refunds
```

Step 3 before step 5 is not negotiable. `finishTransaction` is the acknowledgement that says "this receipt has been consumed by my business logic". On Android, an unacknowledged purchase is refunded after three days. On iOS the transaction stays in the queue and `onPurchaseSuccess` can fire again for the same transaction on the next launch, so a handler that grants without an idempotency key double-grants.

The reverse order — finish first, validate later — feels faster and is the single most common source of "user paid and got nothing" reports. If validation fails after you have finished the transaction, the money is gone and the only recovery is a manual refund.

A subtler rule: the purchase callback is not a request handler. It can fire while the app is backgrounded, on a cold start, or twice for the same transaction. Treat it as an event that must be idempotent, which is what the server-side unique constraint on the original transaction ID provides.

### Validation: StoreKit 2 JWS and Play purchasesv2

The receipt format differs by platform, but the server's answer is the same three fields: is it valid, what does it unlock, and when does it expire.

On iOS with StoreKit 2, the client receives a JWS-signed transaction. Your server verifies the signature chain against Apple's root certificates, then reads `originalTransactionId`, `productId`, `expiresDate`, `type`, and `environment`. For "what is the current state right now", the authoritative call is the App Store Server API subscription status endpoint, which returns the renewal state rather than a single transaction. The old `verifyReceipt` endpoint is deprecated; new integrations should not use it.

On Android, the Play Developer API is the authority. `purchases.subscriptionsv2.get` returns a `subscriptionState` — `SUBSCRIPTION_STATE_ACTIVE`, `IN_GRACE_PERIOD`, `ON_HOLD`, `PAUSED`, `CANCELED`, `EXPIRED` — plus the line items and their expiry times. That single field is what you store, because it already encodes the difference between "still paying" and "in billing retry".

Some rules apply to both:

- **Never trust a client-supplied expiry date.** The client can be offline for a month with a stale `expiresDate`. Ask the store, or compute from the last verified record plus the notifications you have received.
- **Store the original transaction ID, not the latest one.** Renewals produce new transaction IDs pointing at the same subscription; the original ID is the stable identity for a user's subscription across renewals and device changes.
- **Hash and store the purchase token.** It is a bearer credential for the store API. Logs should carry a prefix, never the full token.
- **Record the environment.** Sandbox receipts must never grant production access. This is the one bug that lets a tester with TestFlight on their phone unlock the real product for free.

### Lifecycle Events You Must Handle

A subscription is a relationship that changes without the app running. The client cannot poll its way to correctness; store notifications are the mechanism.

Apple delivers App Store Server Notifications V2 to an HTTPS endpoint you register: `SUBSCRIBED`, `DID_RENEW`, `DID_CHANGE_RENEWAL_STATUS`, `EXPIRED`, `DID_FAIL_TO_RENEW`, `GRACE_PERIOD_EXPIRED`, `REFUND`, `REVOKE`. Google delivers real-time developer notifications through Pub/Sub, with types like `SUBSCRIPTION_PURCHASED`, `SUBSCRIPTION_RENEWED`, `SUBSCRIPTION_IN_GRACE_PERIOD`, `SUBSCRIPTION_ON_HOLD`, `SUBSCRIPTION_CANCELED`, `SUBSCRIPTION_EXPIRED`, `SUBSCRIPTION_REVOKED`, and `VOIDED_PURCHASE`.

The states that matter for access control are fewer than the event types:

- **Active / renewing** — grant access through `expires_at`.
- **Grace period** — the payment failed but the store is still retrying. Keep access. This is a deliberate retention feature; revoking here churns users whose card simply expired.
- **On hold** — grace expired. Revoke. Play stops retrying until the user fixes payment.
- **Canceled but not expired** — the user turned off auto-renew. Do not revoke; they paid until the period ends, and revoking early is a refund request waiting to happen.
- **Refunded / revoked** — revoke immediately. Apple's `REFUND` and Google's `VOIDED_PURCHASE` mean the money is gone.
- **Billing retry** (Apple) — equivalent in spirit to grace period plus retries; keep access while the store retries, then expire.

Two implementation notes that save weeks. First, notifications are at-least-once delivery with possible out-of-order arrival, so every handler must be idempotent and compare event timestamps rather than assuming order. Second, the notification is a signal, not the data: the payload tells you something changed, and you then fetch the current state from the store API and reconcile. Trusting the payload alone means a missed field or a replayed event silently corrupts your ledger.

### Restore, Cross-Device, and the "I Paid But It's Locked" Recovery Path

Restore is not an edge case; it is the normal path for anyone who changed phones, reinstalled, or restored from a backup. `getAvailablePurchases()` returns the non-consumable and subscription purchases tied to the store account, and the correct handling is to send each one through the same verify endpoint the purchase callback uses. One code path, two entry points.

The trickier variant is the user who is entitled on the store but blocked in your app because their session is for a different account. Decide the policy explicitly, because both answers are defensible and neither is default:

- **Store account wins** — the purchase attaches to whichever app user is signed in when verification runs. Simple, but it allows one subscription to be shared across accounts.
- **App account wins** — the subscription is bound to the first user who verified it, and a second user restoring on the same device gets an error. Correct for teams, annoying for families.

For most consumer apps the first is right, with a server-side rule that a single original transaction ID may only map to one active app user at a time. That gives the shared-device case a deterministic outcome — the newest verification wins, the previous binding is logged — instead of an ambiguous both-are-entitled state.

The recovery UX matters more than the policy. A screen that says "Restore purchases" must exist, must actually call the store, and must report one of three outcomes: restored, nothing to restore, or verification failed with a retry. A paywall with no restore affordance is both a support burden and a review risk.

### Paywall UX Rules That Affect Revenue and Review Outcomes

The paywall is where engineering meets policy, and a few rules are worth encoding from day one.

- **Render the store's localized price.** `product.displayPrice` is already formatted for the user's storefront, including currency and tax-inclusive conventions. A hardcoded "$4.99" is wrong in every non-US storefront and is a rejection reason when it disagrees with the purchase sheet.
- **Never gate the restore option.** Apple requires a way to restore non-consumable purchases, and a hidden restore button reads as a dark pattern.
- **Answer trial questions from the store.** `isEligibleForIntroOfferIOS` tells you whether this Apple ID can still take the introductory offer. Showing "7 days free" to someone who already used it produces a support ticket at the moment of charge.
- **State the renewal terms plainly.** Price, period, and cancellation path, in the paywall, in the language the user reads. Disclosing them in a linked page is not enough.
- **Handle every error the store can return.** `ErrorCode.UserCancelled` is not an error and should be silent. `PaymentPending` (Ask to Buy, SCA) must produce a "waiting for approval" state, not a failure toast. `AlreadyOwned` should trigger a restore, not a second charge attempt.
- **Do not retry a failed purchase automatically.** A declined card retried in a loop is rate-limited at best and flagged as fraud at worst.

## Code Examples

The catalog keeps store identifiers in one place and keeps the offering mapping behind the API. Nothing else in the app should contain a product ID string.

```typescript
// src/iap/catalog.ts
export type ProductType = 'subs' | 'inapp';

export interface CatalogProduct {
  id: string;
  type: ProductType;
  entitlement: string;
  consumable: boolean;
}

export const CATALOG: Record<string, CatalogProduct> = {
  'com.acme.pro.monthly': {
    id: 'com.acme.pro.monthly',
    type: 'subs',
    entitlement: 'pro',
    consumable: false,
  },
  'com.acme.pro.yearly': {
    id: 'com.acme.pro.yearly',
    type: 'subs',
    entitlement: 'pro',
    consumable: false,
  },
  'com.acme.credits.100': {
    id: 'com.acme.credits.100',
    type: 'inapp',
    entitlement: 'export_credits',
    consumable: true,
  },
};

export function subscriptionIds(): string[] {
  return Object.values(CATALOG)
    .filter((product) => product.type === 'subs')
    .map((product) => product.id);
}

export function productFor(id: string): CatalogProduct | undefined {
  return CATALOG[id];
}
```

The entitlement provider is the only place that knows how to turn a server response into UI state. A purchase that is still verifying resolves to `pending`, which the paywall renders as a spinner rather than a denial.

```typescript
// src/iap/EntitlementsProvider.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../api/client';

type Status = 'loading' | 'pending' | 'ready' | 'error';

interface Entitlements {
  pro: boolean;
  exportCredits: number;
  expiresAt: string | null;
}

interface EntitlementsContextValue {
  status: Status;
  entitlements: Entitlements;
  has: (key: keyof Entitlements) => boolean;
  refresh: () => Promise<void>;
}

const EMPTY: Entitlements = { pro: false, exportCredits: 0, expiresAt: null };

const EntitlementsContext = createContext<EntitlementsContextValue | null>(null);

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [entitlements, setEntitlements] = useState<Entitlements>(EMPTY);

  const refresh = useCallback(async () => {
    try {
      // The server is the source of truth; never derive access locally.
      const response = await api.get<Entitlements>('/me/entitlements');
      setEntitlements(response);
      setStatus('ready');
    } catch (error) {
      console.warn('Entitlement refresh failed', error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<EntitlementsContextValue>(
    () => ({
      status,
      entitlements,
      has: (key) =>
        key === 'expiresAt' ? entitlements.expiresAt !== null : Boolean(entitlements[key]),
      refresh,
    }),
    [status, entitlements, refresh],
  );

  return (
    <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>
  );
}

export function useEntitlements(): EntitlementsContextValue {
  const context = useContext(EntitlementsContext);
  if (!context) {
    throw new Error('useEntitlements must be used inside EntitlementsProvider');
  }
  return context;
}
```

The paywall does not call the store directly and then decide anything. It requests the purchase and hands the receipt to the server, which returns the entitlements to cache.

```tsx
// src/screens/PaywallScreen.tsx
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { ErrorCode, useIAP, type Purchase } from 'react-native-iap';
import { CATALOG, subscriptionIds } from '../iap/catalog';
import { api } from '../api/client';
import { useEntitlements } from '../iap/EntitlementsProvider';

export function PaywallScreen() {
  const { refresh } = useEntitlements();
  const [verifying, setVerifying] = useState(false);

  const { connected, subscriptions, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: async (purchase: Purchase) => {
      // The same handler runs on cold start and on duplicate delivery,
      // so the server call must be idempotent by purchase token.
      setVerifying(true);
      try {
        await api.post('/iap/verify', {
          platform: purchase.platform,
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
        });
        await refresh();
        // Finish only after the server accepted the receipt.
        await finishTransaction({ purchase, isConsumable: false });
      } catch (error) {
        Alert.alert(
          'Purchase could not be confirmed',
          'Your payment went through but we could not activate it yet. Tap restore in a moment.',
        );
        console.warn('Verification failed', error);
      } finally {
        setVerifying(false);
      }
    },
    onPurchaseError: (error) => {
      if (error.code === ErrorCode.UserCancelled) return;
      if (error.code === ErrorCode.PaymentPending) {
        Alert.alert('Waiting for approval', 'This purchase needs approval before it completes.');
        return;
      }
      Alert.alert('Purchase failed', error.message);
    },
  });

  useEffect(() => {
    if (!connected) return;
    void fetchProducts({ skus: subscriptionIds(), type: 'subs' }).catch((error) =>
      console.warn('Product fetch failed', error),
    );
  }, [connected, fetchProducts]);

  const buy = async (productId: string) => {
    const product = CATALOG[productId];
    if (!product) return;
    await requestPurchase({
      request: {
        // iOS sells one SKU per call, Android accepts an array.
        apple: { sku: productId },
        google: { skus: [productId] },
      },
      type: product.type === 'subs' ? 'subs' : 'in-app',
    });
  };

  if (verifying) {
    return (
      <View style={{ padding: 24, alignItems: 'center' }}>
        <ActivityIndicator />
        <Text>Activating your subscription…</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 24, gap: 16 }}>
      {subscriptions.map((product) => (
        <TouchableOpacity key={product.id} onPress={() => void buy(product.id)}>
          <Text style={{ fontSize: 18 }}>{product.title}</Text>
          <Text>{product.displayPrice} per period</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        onPress={() => {
          void api.post('/iap/restore').then(refresh);
        }}
      >
        <Text>Restore purchases</Text>
      </TouchableOpacity>
    </View>
  );
}
```

The restore and verify endpoints share one server function. That is the whole point: two entry points, one validation path.

```typescript
// server/iap/service.ts
import { createHash } from 'node:crypto';

export interface VerifyInput {
  platform: 'ios' | 'android';
  productId: string;
  purchaseToken: string;
  userId: string;
}

export interface VerifiedSubscription {
  originalTransactionId: string;
  productId: string;
  status: 'active' | 'grace' | 'hold' | 'expired' | 'revoked';
  expiresAt: Date;
  environment: 'sandbox' | 'production';
}

export async function verifyAndGrant(input: VerifyInput) {
  if (!input.purchaseToken) {
    throw new Error('Missing purchase token');
  }

  const verified =
    input.platform === 'ios'
      ? await verifyAppleJws(input.purchaseToken)
      : await verifyGooglePurchase(input.productId, input.purchaseToken);

  // Sandbox receipts must never unlock production.
  if (verified.environment === 'sandbox' && process.env.NODE_ENV === 'production') {
    throw new Error('Sandbox receipt rejected in production');
  }

  const tokenHash = createHash('sha256').update(input.purchaseToken).digest('hex');
  const active = verified.status === 'active' || verified.status === 'grace';

  // Upsert keyed by the ORIGINAL transaction id: renewals produce new
  // transaction ids for the same subscription, so this stays stable.
  await db.query(
    `insert into subscriptions
       (original_transaction_id, user_id, platform, product_id, status,
        expires_at, environment, token_hash, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())
     on conflict (original_transaction_id) do update set
       user_id = excluded.user_id,
       status = excluded.status,
       expires_at = greatest(subscriptions.expires_at, excluded.expires_at),
       token_hash = excluded.token_hash,
       updated_at = now()`,
    [
      verified.originalTransactionId,
      input.userId,
      input.platform,
      verified.productId,
      verified.status,
      verified.expiresAt,
      verified.environment,
      tokenHash,
    ],
  );

  return { active, expiresAt: verified.expiresAt, productId: verified.productId };
}
```

Store notifications arrive at least once and out of order, so the handler reconciles from the store rather than trusting the payload body.

```typescript
// server/iap/notifications.ts
import type { Request, Response } from 'express';
import { verifyAndGrant } from './service';

export async function handleAppleNotification(req: Request, res: Response) {
  const signedPayload = req.body?.signedPayload;
  if (!signedPayload) return res.status(400).json({ error: 'missing signedPayload' });

  // Verify the JWS chain and extract the notification type + transaction.
  const event = await decodeAppleNotification(signedPayload);

  try {
    // The payload is a signal: re-fetch current state from Apple, then apply.
    if (event.type !== 'REFUND' && event.type !== 'REVOKE') {
      await verifyAndGrant({
        platform: 'ios',
        productId: event.productId,
        purchaseToken: event.signedTransaction,
        userId: await userIdFor(event.originalTransactionId),
      });
    } else {
      await db.query(
        `update subscriptions set status = 'revoked', updated_at = now()
          where original_transaction_id = $1`,
        [event.originalTransactionId],
      );
    }
  } catch (error) {
    // Returning 5xx makes Apple retry; returning 200 drops the event forever.
    console.error('Notification handling failed', error);
    return res.status(500).json({ error: 'retry' });
  }

  return res.status(200).json({ received: true });
}

export async function handleGoogleRtdn(req: Request, res: Response) {
  const message = req.body?.message;
  if (!message?.data) return res.status(400).json({ error: 'missing message' });
  const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf8'));

  try {
    // subscriptionNotification.notificationType tells you what changed;
    // purchases.subscriptionsv2.get tells you what it is now.
    await reconcileGoogleSubscription(decoded.subscriptionNotification.purchaseToken);
  } catch (error) {
    console.error('RTDN handling failed', error);
    return res.status(500).json({ error: 'retry' });
  }

  return res.status(200).json({ received: true });
}
```

The schema enforces the invariants that the client cannot be trusted to keep.

```sql
-- One row per subscription, keyed by the store's stable identity.
create table subscriptions (
  original_transaction_id text primary key,
  user_id                 uuid not null references users (id),
  platform                text not null check (platform in ('ios', 'android')),
  product_id              text not null,
  status                  text not null
                          check (status in ('active', 'grace', 'hold', 'expired', 'revoked')),
  expires_at              timestamptz not null,
  environment             text not null check (environment in ('sandbox', 'production')),
  token_hash              text not null,
  updated_at              timestamptz not null default now()
);

create index subscriptions_user_active_idx
  on subscriptions (user_id, expires_at desc)
  where status in ('active', 'grace');

-- The entitlement read path: one query, no client trust involved.
select
  (s.expires_at > now()
   and s.status in ('active', 'grace')
   and s.environment = 'production') as pro,
  s.expires_at
from subscriptions s
where s.user_id = $1
order by s.expires_at desc
limit 1;
```

## Key Insights

- **Finish the transaction last.** `finishTransaction` is an acknowledgement of business logic, not of payment. Calling it before validation means a verification failure is unrecoverable, and on Android an unfinished purchase is auto-refunded after three days, which silently cancels a paying user's subscription.
- **Idempotency is mandatory, not defensive.** Purchase callbacks fire on cold start, and store notifications are at-least-once with no ordering guarantee. A unique constraint on `original_transaction_id` plus `greatest(existing_expires_at, new_expires_at)` turns every duplicate into a no-op instead of a double grant.
- **Grace period is a product decision encoded in code.** Revoking access the moment a card fails costs you customers whose payment simply lapsed. Keep access through grace, revoke on hold, and always let a canceled-but-unexpired subscription run to its `expires_at`.
- **Sandbox leakage is the most expensive bug in this domain.** One `if` that skips the environment check lets anyone with a TestFlight build unlock the production product for free. Enforce the check on the server, where the client cannot patch it.
- **Localized price comes from the store, never from your copy.** `product.displayPrice` and `product.title` are already correct for the storefront; hardcoded strings diverge the moment you add a currency or a price change, and a mismatch with the purchase sheet is a review rejection.
- **The entitlement read path should be one cheap query.** Gating a screen must not trigger a store API call. Cache the server's answer on the client with a short TTL, refresh on foreground, and treat "verifying" as its own state rather than a denial.
- **Test with real sandbox accounts on real devices.** StoreKit configuration files and Play license testers cover most flows, but Ask to Buy, grace period, and refunds are only reproducible through the stores' sandbox tooling — which is exactly where the bugs live.

## Next Steps

- Read the companion guide on React Native security hardening for the storage and transport side of the same problem: where to keep the auth token that authorizes `/iap/verify`, and how to bind it to a device.
- Build the offline path from the offline sync tutorial into the paywall, so a purchase completed on a dead network retries verification from the outbox instead of relying on the user to tap restore.
- Add server-side analytics on the funnel between paywall impression and verified entitlement to see where verification failures actually cluster.
- Study the store notification schemas directly — App Store Server Notifications V2 and Google real-time developer notifications — and write contract tests against recorded payloads before you ship.

## Conclusion

You built a monetization layer where the client never decides anything it cannot prove. Products are fetched from the store with their localized prices, offerings are resolved server-side so pricing experiments do not need a release, purchases are verified against StoreKit 2 and Play Billing before any access is granted, and the transaction is finished only after the server has recorded it. Entitlements are read from one indexed query and cached with a TTL, so gating a screen is cheap and tamper-resistant.

The parts that will save you the most support tickets are the least glamorous: the unique constraint that makes duplicate callbacks harmless, the environment check that keeps sandbox receipts out of production, and the state handling for grace period, hold, and refund. Those three decisions are the difference between a paywall that works and a paywall that quietly charges people for nothing.
