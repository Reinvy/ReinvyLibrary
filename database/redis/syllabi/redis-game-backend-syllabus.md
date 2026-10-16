---
title: "Redis Game Backend Engineering Syllabus"
description: "A comprehensive 12-week advanced curriculum for building real-time multiplayer game backends on Redis, covering authoritative game state, matchmaking queues, leaderboards and ranking systems, player economy and inventory transactions, presence and chat, geospatial and social features, anti-cheat enforcement, and launch-scale operations."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Redis Game Backend Engineering Syllabus

## Overview

This 12-week advanced syllabus is designed for backend engineers, game server developers, and platform engineers who want to master Redis as the real-time state layer of online game backends. Where general Redis courses treat data structures as catalog items, this curriculum treats them as the primitives of a live game: a sorted set is a seasonal leaderboard serving hundreds of thousands of concurrent reads, a hash is an authoritative match room whose every transition must be validated server-side, a Lua script is the atomic unit that guarantees a player can never spend currency they do not have, and a Stream is the durable record that a match result was scored exactly once.

Every module pairs the theory of game backend architecture — latency budgets, authoritative state, idempotent rewards, launch-day traffic spikes — with hands-on labs using the Redis CLI, Lua scripting, Node.js and Python clients, WebSocket gateways, Docker Compose, and Redis Cluster. Learners build progressively: from session and presence services, through matchmaking and in-match state machines, up to a complete multiplayer game backend with matchmaking, leaderboards, economy, chat, telemetry, and a launch-day operations runbook. By the end of the course, learners will be able to design and operate a game backend where Redis absorbs tens of thousands of operations per second at sub-millisecond p99 latency without ever corrupting player state.

This syllabus is redis's fifth curriculum and deliberately takes the gaming angle: the first syllabus covered core data structures and general development, the second covered internals, modules, and enterprise operations, the third covered real-time analytics with RedisTimeSeries, and the fourth covered microservices coordination patterns. This fifth curriculum is the interactive-entertainment view, where every primitive is judged by its behavior under a live player population: atomicity guarantees, hot-key pressure from millions of readers of a single leaderboard key, and the correctness of economy operations that real money may be attached to.

## Curriculum

### Module 1: Game Backend Architecture and Redis Foundations (Week 1)

- **Anatomy of an Online Game Backend**
  - The authoritative server model: clients send intents, the backend owns truth
  - Latency budgets by genre: turn-based (hundreds of milliseconds) versus real-time competitive (single-digit milliseconds)
  - State tiers: hot in-match state, warm player profile and economy state, cold archival state
  - Why Redis fits: sub-millisecond operations, atomic primitives, TTL lifecycle, and predictable memory behavior
- **Topology Choices for Game Workloads**
  - Single instance with Sentinel versus Redis Cluster versus regional per-shard deployments
  - Regional data locality: keeping a player's hot state in their region while profiles stay global
  - Redis 7+ features that matter for games: client-side caching, function libraries, ACLs
- **Key Design for Game Systems**
  - Namespacing conventions: `game:{match_id}:state`, `player:{player_id}:wallet`, `lb:{season}:global`
  - Cluster hash tags and why related keys must share a slot for atomic multi-key work
  - Choosing between hashes, sorted sets, streams, and plain strings for each game concern
- **Lab Setup**
  - Docker Compose stack: Redis Stack, a Node.js game gateway, a Python worker, and a load generator
  - Measuring baseline round-trip latency with `redis-cli --latency` and a client benchmark harness
- **Hands-on Lab**: Stand up the stack, write a key-naming schema for a fictional arena game, and benchmark `HSET`/`HGETALL` versus `ZADD`/`ZREVRANGE` throughput to establish a p99 baseline

### Module 2: Player Sessions, Presence, and Reconnection (Week 2)

- **Session State at Player Scale**
  - Opaque session tokens mapped to hashes instead of self-contained tokens, for instant revocation
  - Sliding expiration on activity with `EXPIRE` and the idle-timeout policies games actually use
  - Concurrent session limits per account, device binding, and forced eviction on suspicious logins
- **Presence and Online State**
  - Presence sets per region, shard, and game mode with heartbeat refresh
  - Last-seen tracking with sorted sets for friend lists and roster queries
  - Presence fan-out to gateway instances and the cost of broadcasting to a large friend graph
- **Reconnection and Match Rejoin**
  - Storing enough in-match state to let a disconnected player rejoin within a grace window
  - Distinguishing a dropped client from a rage-quit, and the state cleanup rules for each
  - Idempotent rejoin handling so a duplicate rejoin never spawns a second avatar
- **Hands-on Lab**: Build a session and presence service with sliding expiration, add a concurrent-session cap with eviction, and implement a rejoin flow that restores a player to an in-progress match

### Module 3: Leaderboards and Ranking Systems (Week 3)

- **Sorted Set Mechanics in Depth**
  - `ZADD` flags that matter in production: `GT`, `LT`, `NX`, `XX`, and their anti-cheat uses
  - Score encoding for composite rankings: rating plus tie-break determinism via member encoding
  - Atomic score updates with `ZINCRBY`, and preventing negative-progress exploits with conditional scripts
- **Leaderboard Topologies**
  - Global, seasonal, weekly, and per-mode boards with windowed keys and TTL rollover
  - Friend-scoped and guild-scoped boards built by intersecting small sets with the global board
  - Top-N queries, rank lookup with `ZREVRANK`, and the around-me view with rank-window reads
- **Scaling a Hot Leaderboard**
  - Sharding one logical board into N segments and merging for the displayed page
  - Snapshot-and-swap season resets that avoid blocking reads on the live board
  - Read scaling with replicas and client-side caching for the top-of-board page
- **Hands-on Lab**: Build a three-tier leaderboard (global, weekly, friends-only) with a season reset, then shard the global board across four segments and implement a merge that returns the correct top 100

### Module 4: Matchmaking Queues and Rating Systems (Week 4)

- **Queue Design**
  - Rating buckets with widening tolerance over queue time to keep waits bounded
  - Sorted-set queues scored by rating or queue timestamp, queried with range reads
  - Party and team queues: grouping players before matching and preserving party integrity
- **Atomic Pairing**
  - Why pairing must be a single atomic operation: the double-match race
  - Implementing the pair-and-remove step in Lua so two workers can never claim the same player
  - Handling partial failures: rolling back half-formed matches and requeueing abandoned entries
- **Constraints and Fairness**
  - Region and latency constraints, using geospatial lookups to keep matches low-ping
  - Role and skill composition rules, and when to relax them to avoid starvation
  - Backfill into in-progress matches without breaking team balance
- **Hands-on Lab**: Implement a Lua-based matchmaker with widening rating tolerance, inject concurrent matching workers to prove no player is ever matched twice, and add a region constraint backed by geospatial lookups

### Module 5: Real-Time Game State and Atomic Transitions (Week 5)

- **Authoritative State Modeling**
  - Room, match, and turn state in hashes with explicit version fields
  - Optimistic concurrency with `WATCH`/`MULTI`/`EXEC` and the retry loop that makes it safe
  - Snapshot plus delta modeling for tick-based games versus full-state writes for turn-based games
- **Server-Authoritative Rules in Lua**
  - Validating an intent, applying it, and emitting the resulting event in one atomic script
  - Rejecting illegal moves without leaving partial state behind
  - Keeping scripts deterministic and avoiding non-deterministic commands inside them
- **Distributing State to Gateways**
  - Pub/Sub for ephemeral state fan-out to the gateway instance holding each player
  - Streams for state transitions that must be replayable after a gateway restart
  - The cross-instance routing problem and how a routing table in Redis solves it
- **Hands-on Lab**: Build a turn-based match room with a Lua move validator that rejects out-of-turn and illegal actions, then fan out state updates to two WebSocket gateway instances through Pub/Sub

### Module 6: Player Inventory, Economy, and Transactional Safety (Week 6)

- **Economic State Modeling**
  - Wallets as integer counters, inventories as hashes, ownership unlocks as sets
  - Soft currency versus hard currency, and the isolation each needs
  - Audit trails: every credit and debit recorded, never inferred
- **Atomic Transactions in Lua**
  - Check balance, debit, grant the item, and write the ledger entry in one script
  - Guaranteeing no negative balances under concurrent purchase attempts
  - Trade and gifting flows between two players with both sides validated atomically
- **Idempotency and Recovery**
  - Idempotency keys for purchase and reward endpoints so retries never double-grant
  - Storing the response payload for replay and defining the key retention window
  - Compensation paths for partially fulfilled grants and refund flows
- **Hands-on Lab**: Build a shop with an atomic Lua purchase path, prove under concurrent load that no account ever goes negative, and implement an idempotent reward claim that survives client retries

### Module 7: Real-Time Events, Chat, and Telemetry (Week 7)

- **Choosing the Right Messaging Primitive**
  - Pub/Sub for ephemeral traffic: chat in a match, lobby updates, presence pings
  - Streams for anything that must survive a consumer crash: match results, purchases, telemetry
  - The cost of losing an event versus the cost of delivering it twice
- **Durable Event Pipelines**
  - Producer and consumer groups with `XADD`, `XREADGROUP`, `XACK`, and `XAUTOCLAIM`
  - Partitioning by match or shard, and load balancing across worker replicas
  - Dead-letter streams, retention with `MAXLEN`, and lag monitoring with `XLEN`
- **Chat, Moderation, and Abuse Signals**
  - Room-scoped chat channels, rate-limited sends, and message retention windows
  - Capturing moderation signals into the event log for offline review
  - Fan-out to multiple gateway instances and the message-ordering guarantees each approach gives
- **Hands-on Lab**: Build a match-result pipeline over Streams with a dead-letter stream, add room chat over Pub/Sub with send rate limiting, and measure consumer lag under a simulated worker outage

### Module 8: Geospatial, Social, and Progression Features (Week 8)

- **Geospatial Systems**
  - `GEOADD` and `GEOSEARCH` for proximity matchmaking, local events, and regional boards
  - Region-scoped leaderboards and the query cost of radius searches at scale
  - Combining geospatial filters with rating filters for location-aware matchmaking
- **Social Graph Features**
  - Friend lists and requests, party composition, and guild membership modeled with sets and hashes
  - Caching the social graph and invalidating it when friendships change
  - Friend activity feeds derived from sorted sets of recent events
- **Progression, Retention, and Analytics Counters**
  - Daily activity and streak tracking with bitmaps, one bit per player per day
  - Distinct player counting with HyperLogLog for DAU, MAU, and feature adoption
  - Achievement counters, quest progress, and the write amplification of updating many counters per action
- **Hands-on Lab**: Build a location-aware matchmaking filter, a friends-only leaderboard, and a retention dashboard powered by bitmaps and HyperLogLog estimates

### Module 9: Content Caching and Launch-Day Traffic Spikes (Week 9)

- **Caching Game Content**
  - Cache-aside for config, level data, item catalogs, and localization bundles
  - Short-TTL caching of remotely configured values so live-ops changes propagate quickly
  - Serialization choices for large content payloads and the memory cost of each
- **Stampede and Hot-Key Defense**
  - Mutex-based rebuild with `SET NX PX` so one worker repopulates and the rest wait briefly
  - TTL jitter to prevent synchronized expiry across thousands of keys
  - Hot-key splitting when a global config key becomes the most-read key in the fleet
- **Launch and Live-Event Preparation**
  - Pre-warming caches before a launch or limited-time event
  - Capacity math for a launch spike: connections, ops per second, and memory growth
  - Degradation strategy when the cache is cold and the database is the bottleneck
- **Hands-on Lab**: Build a content service, drive it with a simulated 100x launch spike, and demonstrate both the stampede failure without a mutex and the recovery with one

### Module 10: Anti-Cheat, Rate Limiting, and Abuse Prevention (Week 10)

- **Server Authority as the Primary Defense**
  - Never trusting client-reported scores, positions, timers, or rewards
  - Validating plausibility at the boundary: rate of progress, action frequency, and reward legitimacy
  - The difference between preventing an exploit and detecting it after the fact
- **Distributed Rate Limiting**
  - Per-player, per-IP, and per-endpoint limits with Lua token buckets
  - Sliding window enforcement for bursty but abusive patterns
  - Backpressure responses that degrade gracefully instead of disconnecting honest players
- **Detection Signals and Response**
  - Anomaly signals from Redis counters: impossible velocities, duplicate grants, replay attempts
  - Recording suspicious events in Streams for offline analysis and appeals
  - Escalation flows: flag, shadow-restrict, and ban, with the state each requires
- **Hands-on Lab**: Build a multi-layer rate limiter for game endpoints, implement a reward-grant anomaly detector over Streams, and produce a report of flagged accounts from a simulated cheating run

### Module 11: Scaling, Availability, and Cost at Launch Scale (Week 11)

- **Cluster Design for Game Workloads**
  - Slot distribution, hash tags for co-location, and why cross-slot scripts fail in production
  - Segmenting hot systems (leaderboards, matchmaking) from cold ones (profiles, archives)
  - Client configuration: topology refresh, redirect handling, and connection pooling per gateway
- **Availability and Durability Trade-offs**
  - Replication, automatic failover, and the player-visible impact of each outage mode
  - Persistence choices for game state: what must survive a restart, and what may be rebuilt from the event log
  - Multi-region considerations: active-passive failover for profiles, regional hot state, and consistency expectations
- **Observability, Capacity, and Cost**
  - Metrics that matter: p99 command latency, ops per second, hit rate, connected players, evictions
  - Memory accounting per player and per active match, plus headroom for failover and fragmentation
  - Cost levers: data tiering, key TTL hygiene, replica counts, and trimming event streams aggressively
- **Hands-on Lab**: Deploy a Redis Cluster, run a controlled failover drill during simulated match traffic, and produce a capacity plan with measured p99 latency and memory-per-player figures

### Module 12: Capstone Project — Real-Time Multiplayer Game Backend (Week 12)

- **Project Definition**
  - A competitive online arena game backend with lobby, matchmaking, live matches, leaderboards, economy, and chat
  - Redis owns all hot state: sessions, presence, queues, match rooms, wallets, inventories, boards, and telemetry streams
- **Architecture Requirements**
  - Every state transition validated server-side, with illegal intents rejected without partial writes
  - Matchmaking pairings proven free of double-matching under concurrent workers
  - Economy operations atomic and idempotent, with an auditable ledger for every grant and spend
  - Leaderboards correct under concurrent writes and survivable across a season reset
  - Telemetry and match results delivered at least once through Streams with dead-letter handling
- **Delivery Milestones**
  - Milestone 1: sessions, presence, and reconnection (week 2 patterns)
  - Milestone 2: matchmaking queue and atomic pairing (week 4 patterns)
  - Milestone 3: match rooms, currency, and inventory with idempotent purchases (weeks 5-6 patterns)
  - Milestone 4: leaderboards, chat, telemetry, and launch-scale operations (weeks 3, 7, 9-11 patterns)
- **Documentation Deliverable**
  - Architecture decision records for each Redis data model and atomicity choice
  - A failure-mode analysis covering Redis failover, gateway restart, and duplicate client retries
  - Load-test results with p99 latency, throughput, and memory per concurrent player

## Final Project

Learners build and operate a complete multiplayer game backend: an arena-style game with authentication, presence, a skill-based matchmaking queue, authoritative match rooms, a three-tier leaderboard with seasonal resets, a soft-currency and item economy with an auditable ledger, room chat, and a telemetry pipeline. Redis must own every hot-state concern in the system — sessions, presence, queues, room state, wallets, inventories, boards, rate limits, and event streams — and every write path that touches player value must be atomic, idempotent, and validated on the server. The backend is delivered running on Redis Cluster with gateways in two instances, a controlled failover drill completed during simulated match traffic, a load test demonstrating the target p99 latency under the expected concurrent-player count, and architecture decision records explaining each data model and atomicity guarantee.

## Assessment Criteria

- **Assignments**: Weekly labs are submitted as repositories with runnable code and short write-ups. Each lab is graded on correctness under concurrency (does the atomic path actually hold under parallel workers), data model quality (is the right Redis structure used for the access pattern), and failure handling (reconnects, retries, dead-letter paths).
- **Module Quizzes**: Short quizzes after each module verify conceptual understanding — sorted set flags and tie-breaking, why pairing must be atomic, optimistic concurrency retry loops, Pub/Sub versus Streams delivery semantics, and the difference between preventing and detecting an exploit.
- **Final Project**: The capstone is evaluated against the architecture requirements: no illegal state transition ever committed, no double-match under concurrent workers, no negative wallet under concurrent purchases, no double-grant on retried requests, leaderboards correct under load and across a season reset, telemetry delivered at least once with dead letters handled, a successful failover drill, and load tests meeting the target p99 latency.
- **Presentation**: Learners present their data model, their atomicity choices, and their failure-mode analysis, defending why each Redis structure and each Lua script boundary was chosen for its game system.

## References

- [Redis Documentation — Sorted Sets](https://redis.io/docs/latest/develop/data-types/sorted-sets/)
- [Redis Documentation — Scripting with Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/)
- [Redis Documentation — Streams and Consumer Groups](https://redis.io/docs/latest/develop/data-types/streams/)
- [Redis Documentation — Geospatial Queries](https://redis.io/docs/latest/develop/data-types/geospatial/)
- [Redis Documentation — Client-Side Caching](https://redis.io/docs/latest/develop/clients/client-side-caching/)
- [Redis Documentation — Scaling with Redis Cluster](https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/)
- [Redis Patterns — Rate Limiting](https://redis.io/docs/latest/develop/patterns/rate-limiting/)
- [Redis Blog — How to Build a Leaderboard](https://redis.io/blog/leaderboards/)
- [Redis University — RU101: Introduction to Redis Data Structures](https://university.redis.com/courses/ru101/)
