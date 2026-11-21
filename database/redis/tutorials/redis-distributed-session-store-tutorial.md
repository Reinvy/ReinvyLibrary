---
title: "Building a Distributed Session Store with Redis"
description: "A production-focused tutorial on designing a Redis-backed session store — hashed token keys, sliding expiry without write amplification, per-user session indexes for revocation, fixation-safe rotation, cluster-aware key design, and failure behavior when Redis is unavailable."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building a Distributed Session Store with Redis

## Summary

This tutorial builds a session store that survives real production pressure: multiple application replicas, millions of short-lived sessions, forced logout across devices, and a Redis node that occasionally disappears. You will design the key schema, implement sliding expiry that does not hammer Redis with writes, index sessions per user so revocation is possible, rotate identifiers safely, and decide what the application should do when Redis is unreachable.

## Target Audience

- Backend and platform engineers who already run stateless application replicas behind a load balancer.
- Engineers replacing in-memory or sticky-session setups with a shared session tier.
- Intermediate to advanced developers comfortable with Node.js, async/await, and basic Redis commands.

## Prerequisites

- Working knowledge of HTTP cookies, authentication flows, and Express-style middleware.
- Node.js 20 or newer with TypeScript, plus the `redis` (node-redis v4) and `express` packages.
- A local Redis 7 instance, for example `docker run --rm -p 6379:6379 redis:7-alpine`.
- Familiarity with Redis hashes, sets, and key expiry (`EXPIRE`, `TTL`).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Design a session key schema that stores no reusable credentials in Redis and keeps per-user session indexes consistent.
- Implement sliding expiration that only writes when the remaining TTL genuinely warrants it.
- Support forced logout of a single device and of all devices without scanning the keyspace.
- Rotate session identifiers on login and privilege change to defeat session fixation.
- Choose cluster-safe key layouts and atomic primitives that hold up when Redis runs in cluster mode.
- Define explicit fail-open versus fail-closed behavior for a Redis outage.

## Context and Motivation

A single-process application can keep sessions in memory. The moment you run three replicas behind a load balancer, that assumption breaks: a user authenticated against replica A is anonymous on replica B. Sticky sessions paper over the problem, but they concentrate traffic, complicate deploys, and leave you unable to revoke a session that lives on another node.

Redis solves the shared-state problem, yet a naive implementation introduces new ones. Storing the raw session token as the key means anyone who reads a Redis backup holds live credentials. Writing on every request to extend the TTL triples your write volume for no security benefit. Keeping only `sess:<token>` makes "log out everywhere" impossible without `SCAN` over the entire keyspace. And when Redis fails, an unexamined `try/catch` silently turns every request into an unauthenticated one.

This tutorial addresses each of those failure modes directly, with the trade-offs spelled out.

## Core Content

### Why the Session Lives Outside the Process

Session state is the one piece of application data that must be readable by every replica on every request. Three properties follow from that requirement:

- **Shared and low-latency**: a read on the authentication hot path, ideally sub-millisecond.
- **Ephemeral**: disposable data with a hard expiry, not a system of record.
- **Individually revocable**: one session must be killable without touching the others.

Redis matches all three. Persistence settings matter less than you might expect: session data is reconstructible by re-authentication, so an `appendonly no` configuration with replication is often acceptable, whereas losing the store means forcing every user to log in again.

### Session Identifier Design: Never Store the Bearer Token

Generate 32 bytes of CSPRNG output, hand the base64url encoding to the client as an opaque cookie, and store only its SHA-256 digest as the Redis key:

```text
Set-Cookie: sid=vQ9r... (32 random bytes, base64url)
Redis key:  sess:{u:8842}:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
```

Two consequences matter. First, a leaked Redis dump or an over-broad `MONITOR` session does not yield usable tokens, because the digest is one-way. Second, the digest is fixed-length and safe as a key component regardless of token length.

The `{u:8842}` segment is a Redis Cluster hash tag. Everything between braces hashes to a single slot, which later lets us update the session key and the user's session index in one atomic operation. The trade-off: all sessions of one user land on one node. That is acceptable because per-user session counts are small (tens, not thousands); a user with pathological device counts should be rate-limited at login instead.

### Key Schema

Four key families, each with a clear owner and lifetime:

```text
| Key                          | Type | TTL                  | Purpose                          |
|------------------------------|------|----------------------|----------------------------------|
| sess:{u:<userId>}:<digest>   | hash | idle TTL (30 min)    | session payload + metadata       |
| user:sessions:{u:<userId>}   | set  | absolute max (30 d)  | index of live session digests    |
| user:sessmeta:{u:<userId>}   | hash | absolute max (30 d)  | digest -> device label, last seen|
| sess:revoked:<digest>        | str  | idle TTL (30 min)    | revocation tombstone             |
```

The hash payload stays small and flat: `uid`, `created`, `lastSeen`, `ip`, `ua`, `authLevel`. Resist storing the entire user profile here — it belongs in a cache with its own invalidation rules, and a fat session payload makes every rotation a large write.

The index set is what makes revocation possible. Without it, "log out all devices" degrades into a keyspace scan. The metadata hash is optional but cheap; it turns a session list into a usable "active devices" screen.

### Sliding Expiration Without Write Amplification

The intuitive implementation writes on every authenticated request:

```typescript
await redis.expire(sessionKey, idleTtlSeconds);
```

At 200 requests per second per active user and a 30-minute idle window, that is 360,000 pointless writes per user per hour. Redis handles it, but you are paying for replication bandwidth and AOF growth to refresh a timer that only matters if the user goes idle.

The fix is conditional refresh: read the TTL, and write only when the remaining time has fallen below a threshold, typically half the idle window.

```typescript
const remaining = await redis.ttl(sessionKey);
if (remaining > 0 && remaining < idleTtlSeconds / 2) {
  await redis.expire(sessionKey, idleTtlSeconds);
}
```

This turns a write-per-request into at most two writes per idle window per session, while still guaranteeing that an active session never expires mid-use. The `remaining > 0` guard matters: a TTL of `-2` means the key is already gone, and calling `EXPIRE` on a missing key is a wasted round trip that also masks a logic error.

Absolute lifetime is enforced separately, from the `created` field, not from the TTL. A session that is continuously active will keep sliding its idle TTL forever, so a hard cap (for example 30 days) must be checked on refresh: if `now - created > absoluteMax`, delete the session and treat the request as unauthenticated.

### Revocation: Indexed, Not Scanned

Revoking one session is two deletions plus a tombstone:

- `DEL` the session hash.
- `SREM` the digest from `user:sessions:{u:<userId>}`.
- `SET sess:revoked:<digest>` with the idle TTL, so a request already in flight fails closed even if a replica read the session a millisecond earlier.

Revoking every session for a user is `SMEMBERS` on the index, then `DEL` each session key, then `DEL` the index and metadata. Bound the batch size; a user with 10,000 sessions indicates an abuse pattern, and revoking in chunks of 500 keeps a single request from blocking the event loop.

The tombstone is not strictly necessary within a single-node deployment, but it eliminates a race that appears as soon as replicas read from a replica with replication lag: a request can arrive holding a token whose key was deleted microseconds ago on the primary. The tombstone makes the window explicit rather than probabilistic.

### Rotation and Fixation Defense

Session fixation attacks work by planting a known identifier in the victim's browser before login. The defense is to issue a fresh identifier at every privilege boundary:

- On successful login, create the new session and delete the old one.
- On privilege elevation (MFA completion, role change, password change), rotate again.
- On any suspicion of compromise, revoke everything and force re-authentication.

Rotation is not just `SET new` plus `DEL old`. The index must move in the same step, or you leak stale digests that later appear in device lists and inflate revocation work. A single Lua script keeps this atomic and stays cluster-safe because both keys share the `{u:<userId>}` hash tag:

```lua
-- rotate_session.lua
-- KEYS[1] = old session key, KEYS[2] = new session key, KEYS[3] = user session index
-- ARGV[1] = old digest, ARGV[2] = new digest, ARGV[3] = idle TTL seconds
local payload = redis.call('HGETALL', KEYS[1])
if #payload == 0 then
  return 0
end
redis.call('DEL', KEYS[1])
for i = 1, #payload, 2 do
  redis.call('HSET', KEYS[2], payload[i], payload[i + 1])
end
redis.call('EXPIRE', KEYS[2], tonumber(ARGV[3]))
redis.call('SREM', KEYS[3], ARGV[1])
redis.call('SADD', KEYS[3], ARGV[2])
return 1
```

The return value carries the decision the caller needs: `0` means the old session expired between the cookie being read and the rotation attempt, so the login must not be finalized.

### Cluster Layout and Atomicity Constraints

Redis Cluster rejects any script or transaction that touches keys in different slots. That single constraint drives the key design:

- `sess:{u:8842}:<digest>` and `user:sessions:{u:8842}` share a slot, so rotation and revocation scripts work.
- A global `sessions:active` counter cannot be maintained in the same script, because it has no hash tag. Either accept per-shard counters or compute the total from a periodic `SCAN` sample.
- Cross-user operations, such as an administrator revoking all sessions, must be batched per user, one script call each.

If you run standalone Redis or Sentinel, none of this applies and you can use a single global key family. Write the code so the key builder is one function, and switching deployment modes is a one-line change rather than a refactor.

### Failure Behavior When Redis Is Down

A session store is on the critical path for every authenticated request, so its outage behavior is a product decision, not an implementation detail. Three defensible strategies:

- **Fail closed**: every request with a session cookie is treated as unauthenticated. Safest, and correct for financial or administrative surfaces, but it logs out your entire user base for the duration of the incident.
- **Degrade to read-only**: accept an existing session from a short-lived in-process cache (5-15 seconds) but refuse to create new sessions or extend expiry. This keeps browsing alive during a blip while preventing stale-but-valid sessions from surviving a real outage.
- **Fail open with a local fallback store**: never do this. A per-replica fallback store reintroduces the sticky-session problem plus a divergent notion of who is logged in, and it silently weakens revocation.

Whatever you choose, instrument it. A `session_store_errors_total` counter plus an alert on the error rate catches the failure before users do, and a circuit breaker prevents a slow Redis from consuming the entire request timeout budget on every call.

## Code Examples

### Session Store Module

```typescript
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createClient, type RedisClientType } from 'redis';

const IDLE_TTL = 60 * 30;            // 30 minutes idle
const ABSOLUTE_MAX = 60 * 60 * 24 * 30; // 30 days hard cap
const REFRESH_FLOOR = Math.floor(IDLE_TTL / 2);

export interface SessionPayload {
  uid: string;
  created: number;
  lastSeen: number;
  ip: string;
  ua: string;
  authLevel: 'password' | 'mfa';
}

const ROTATE_SCRIPT = `
local payload = redis.call('HGETALL', KEYS[1])
if #payload == 0 then return 0 end
redis.call('DEL', KEYS[1])
for i = 1, #payload, 2 do
  redis.call('HSET', KEYS[2], payload[i], payload[i + 1])
end
redis.call('EXPIRE', KEYS[2], tonumber(ARGV[3]))
redis.call('SREM', KEYS[3], ARGV[1])
redis.call('SADD', KEYS[3], ARGV[2])
return 1
`;

function digest(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function sessionKey(uid: string, token: string): string {
  return `sess:{u:${uid}}:${digest(token)}`;
}

function indexKey(uid: string): string {
  return `user:sessions:{u:${uid}}`;
}

export class RedisSessionStore {
  private readonly redis: RedisClientType;

  constructor(redis: RedisClientType) {
    this.redis = redis;
  }

  async create(payload: Omit<SessionPayload, 'created' | 'lastSeen'>): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const key = sessionKey(payload.uid, token);

    const tx = this.redis.multi();
    tx.hSet(key, {
      uid: payload.uid,
      created: String(now),
      lastSeen: String(now),
      ip: payload.ip,
      ua: payload.ua,
      authLevel: payload.authLevel,
    });
    tx.expire(key, IDLE_TTL);
    tx.sAdd(indexKey(payload.uid), digest(token));
    tx.expire(indexKey(payload.uid), ABSOLUTE_MAX);
    await tx.exec();

    return token;
  }

  async read(token: string): Promise<SessionPayload | null> {
    const raw = await this.redis.get(`sess:probe:${digest(token)}`).catch(() => null);
    if (raw === 'revoked') return null;

    const uidHint = raw;
    if (!uidHint) return null;
    const key = sessionKey(uidHint, token);
    const data = await this.redis.hGetAll(key);
    if (!data.uid) return null;

    const now = Math.floor(Date.now() / 1000);
    const created = Number(data.created ?? 0);
    if (now - created > ABSOLUTE_MAX) {
      await this.destroy(uidHint, token);
      return null;
    }

    const ttl = await this.redis.ttl(key);
    if (ttl > 0 && ttl < REFRESH_FLOOR) {
      await this.redis.expire(key, IDLE_TTL);
      await this.redis.hSet(key, 'lastSeen', String(now));
    }

    return {
      uid: data.uid,
      created,
      lastSeen: Number(data.lastSeen ?? now),
      ip: data.ip ?? '',
      ua: data.ua ?? '',
      authLevel: (data.authLevel as SessionPayload['authLevel']) ?? 'password',
    };
  }

  async destroy(uid: string, token: string): Promise<void> {
    const d = digest(token);
    const tx = this.redis.multi();
    tx.del(sessionKey(uid, token));
    tx.sRem(indexKey(uid), d);
    tx.set(`sess:revoked:${d}`, 'revoked', { EX: IDLE_TTL });
    await tx.exec();
  }

  async rotate(uid: string, oldToken: string): Promise<string | null> {
    const newToken = randomBytes(32).toString('base64url');
    const ok = await this.redis.eval(ROTATE_SCRIPT, {
      keys: [sessionKey(uid, oldToken), sessionKey(uid, newToken), indexKey(uid)],
      arguments: [digest(oldToken), digest(newToken), String(IDLE_TTL)],
    });
    return ok === 1 ? newToken : null;
  }

  async listActive(uid: string): Promise<Array<{ digest: string; ua: string; lastSeen: number }>> {
    const digests = await this.redis.sMembers(indexKey(uid));
    if (digests.length === 0) return [];

    const pipeline = this.redis.multi();
    for (const d of digests) pipeline.hGetAll(`sess:{u:${uid}}:${d}`);
    const results = await pipeline.exec();

    const active: Array<{ digest: string; ua: string; lastSeen: number }> = [];
    results.forEach((entry, i) => {
      const data = (entry as unknown as Record<string, string>) ?? {};
      if (!data.uid) return;
      active.push({ digest: digests[i], ua: data.ua ?? 'unknown', lastSeen: Number(data.lastSeen ?? 0) });
    });

    // Reconcile: drop digests whose sessions already expired.
    const stale = digests.filter((d) => !active.some((a) => a.digest === d));
    if (stale.length > 0) await this.redis.sRem(indexKey(uid), stale);

    return active;
  }

  async destroyAll(uid: string): Promise<number> {
    const digests = await this.redis.sMembers(indexKey(uid));
    let removed = 0;
    for (let i = 0; i < digests.length; i += 500) {
      const chunk = digests.slice(i, i + 500);
      const tx = this.redis.multi();
      for (const d of chunk) {
        tx.del(`sess:{u:${uid}}:${d}`);
        tx.set(`sess:revoked:${d}`, 'revoked', { EX: IDLE_TTL });
      }
      await tx.exec();
      removed += chunk.length;
    }
    await this.redis.del(indexKey(uid));
    return removed;
  }
}
```

Note the `sess:probe:<digest>` indirection used by `read`: the browser presents a token, and the server needs the owning user before it can build the hash-tagged key. In practice, store that mapping as a tiny string key written at session creation, or put the user id in a signed cookie alongside the token and verify the signature server-side. The signed-cookie variant is cheaper (no probe read) but requires the signing secret to be rotated carefully.

### Express Integration with Conditional Refresh

```typescript
import express from 'express';
import { createClient } from 'redis';
import { RedisSessionStore } from './session-store';

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const sessions = new RedisSessionStore(redis as never);
const app = express();

declare module 'express-serve-static-core' {
  interface Request {
    session?: { uid: string; authLevel: string };
  }
}

app.use(async (req, res, next) => {
  const token = req.cookies?.sid;
  if (!token) return next();

  try {
    const session = await sessions.read(token);
    if (!session) {
      res.clearCookie('sid');
      return next();
    }
    req.session = { uid: session.uid, authLevel: session.authLevel };
    next();
  } catch (err) {
    // Fail closed, but do not log the token.
    console.error('session store unavailable', (err as Error).message);
    return res.status(503).json({ error: 'authentication_unavailable' });
  }
});

app.post('/login', async (req, res) => {
  const user = await authenticate(req.body.email, req.body.password);
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  const token = await sessions.create({
    uid: user.id,
    ip: req.ip ?? '',
    ua: req.get('user-agent') ?? '',
    authLevel: 'password',
  });

  res.cookie('sid', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 60 * 1000,
  });
  res.json({ ok: true });
});

app.post('/logout', async (req, res) => {
  const token = req.cookies?.sid;
  if (token && req.session) await sessions.destroy(req.session.uid, token);
  res.clearCookie('sid');
  res.status(204).end();
});

app.post('/logout-all', async (req, res) => {
  if (!req.session) return res.status(401).json({ error: 'unauthenticated' });
  const removed = await sessions.destroyAll(req.session.uid);
  res.clearCookie('sid');
  res.json({ revoked: removed });
});

app.get('/devices', async (req, res) => {
  if (!req.session) return res.status(401).json({ error: 'unauthenticated' });
  res.json(await sessions.listActive(req.session.uid));
});
```

The cookie's `maxAge` is deliberately shorter than the absolute cap: the browser drops it first, and the server-side TTL is the authorization of record. Never let the cookie lifetime be the only expiry mechanism — a user can edit their own cookie attributes.

### Verifying Behaviour Under Load

```bash
# Create 1,000 sessions for one user, then measure index size and TTL drift
redis-benchmark -n 1000 -c 20 -t set -r 100000 -q
redis-cli SMEMBERS "user:sessions:{u:8842}" | wc -l
redis-cli TTL  "sess:{u:8842}:<digest>"

# Confirm revocation leaves nothing behind
redis-cli SCARD "user:sessions:{u:8842}"
redis-cli --scan --pattern "sess:revoked:*" | wc -l

# Watch write volume attributable to refreshes (not initial creates)
redis-cli INFO commandstats | grep -E "cmdstat_(expire|hset)"
```

The last command is the one worth keeping: `expire` calls should sit far below your request count once conditional refresh is in place. If they track request volume, the refresh guard is not working.

## Key Insights

- **Store digests, not tokens**: a Redis read must never yield a usable credential. Hashing the token also normalizes key length and makes index membership safe to expose in device lists.
- **Index every session per user**: without `user:sessions:{u:<id>}`, "log out everywhere" becomes a keyspace scan. The index is the difference between revocation being a feature and being an incident.
- **Refresh conditionally**: unconditionally extending TTL on each request multiplies write load for no security gain. Refresh only when the remaining TTL drops below half the idle window, and enforce the absolute lifetime from a stored timestamp.
- **Keep the two lifetimes separate**: idle TTL protects memory; the absolute cap protects against indefinite sessions that never go idle. Conflating them means an active attacker keeps a session forever.
- **Rotate on privilege change, not just login**: fixation defense requires a new identifier whenever the session's authority level changes. Rotate the index entry in the same atomic step or you accumulate phantom digests.
- **Respect cluster slot boundaries**: co-locate `sess:{u:<id>}:<digest>` with `user:sessions:{u:<id>}` via a hash tag so Lua scripts and transactions are legal. Any global counter must live outside those scripts.
- **Decide outage behavior before the outage**: fail closed on administrative surfaces, allow a few seconds of read-only grace on consumer surfaces, and never fall back to per-replica session storage.
- **Instrument the store, not just the app**: error counters, p99 latency for `HGETALL`, `expired_keys`, and memory per session are the metrics that reveal a session store degrading before users notice.

## Next Steps

- Read the [Redis Caching Patterns Guide](../guides/redis-caching-patterns-guide.md) to separate session storage from general-purpose caching with its own invalidation rules.
- Continue with the [Redis High Availability Guide](../guides/redis-high-availability-guide.md) to decide between Sentinel and Cluster for the session tier specifically.
- Harden the store further with the [Redis Security Cheatsheet](../cheatsheets/redis-security-cheatsheet.md): ACLs scoped to `sess:*` and `user:sessions:*` keep an application credential from reading unrelated keys.
- Study the [Redis Cluster Scaling Guide](../guides/redis-cluster-scaling-guide.md) before adding a second shard, since hash-tagged session keys change the rebalancing picture.
- Explore the [Redis Microservices Patterns Syllabus](../syllabi/redis-microservices-patterns-syllabus.md) for how session and token strategies fit a multi-service architecture.

## Conclusion

A Redis session store is easy to build and easy to build badly. The four decisions that separate the two are: hash the token so Redis holds no credentials; index sessions per user so revocation is a set operation rather than a scan; refresh TTL conditionally so session traffic does not become your dominant write load; and keep idle expiry and absolute lifetime as independent controls. Layer atomic rotation on top for fixation defense, respect cluster hash tags so those atomic operations stay legal, and choose your outage behavior deliberately instead of inheriting whatever a bare `try/catch` happens to do.
