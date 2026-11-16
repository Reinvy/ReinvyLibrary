---
title: "Redis Search Engineering Syllabus"
description: "A 12-week advanced curriculum on building production search on Redis, covering inverted index internals, schema and analyzer design, the full-text query DSL, relevance tuning, autocomplete, aggregations and facets, geo and hybrid vector retrieval, index memory and performance engineering, cluster-scale operations, and zero-downtime reindexing."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Redis Search Engineering Syllabus

## Overview

This 12-week advanced syllabus is for backend and search engineers who already know Redis as a cache and now need it to answer queries: product catalogs, documentation portals, marketplace listings, log exploration, and retrieval layers behind AI features. Most Redis material treats the Query Engine as a footnote — a single `FT.CREATE` example next to JSON and TimeSeries — which leaves engineers unprepared for the parts that actually decide whether search works in production: how the index stores terms, why a query is slow, why relevance scores look wrong, and how to rebuild an index without a maintenance window.

This curriculum is built the other way around. Every module starts from the index itself — how documents are tokenized, stored, and scored — and only then moves to the API surface. Learners write queries by hand against `redis-cli` before touching a client library, read `FT.EXPLAIN` and `FT.PROFILE` output until the execution plan is obvious, and measure index memory rather than guessing at it. The arc is deliberate: schema and analyzers first (because they are irreversible decisions), then querying and relevance, then the features that make search feel finished — autocomplete, facets, geo — then hybrid retrieval with vectors, and finally the operational work of running search at scale with no downtime.

The second half is where most courses stop and most outages begin. Learners design index migrations that swap atomically through aliases, keep the index consistent with a relational source of truth through an outbox, plan memory for multi-tenant indexes with millions of documents, and set SLOs for query latency under writes. The capstone is a working multi-tenant marketplace search service — not a notebook, a service with dashboards, a reindex runbook, and a load test it must survive.

## Curriculum

### Module 1: Search Architecture and Index Foundations (Week 1)

- **What the Redis Query Engine Is**
  - Redis Query Engine (RediSearch) as a module: in-memory inverted index co-located with the data
  - Query serving versus document storage: why Redis keeps both in one process and what that buys
  - Decision space: Redis Query Engine, Elasticsearch/OpenSearch, Meilisearch, Postgres full-text — latency, operational surface, cost, and feature fit
  - Where Redis search genuinely wins: sub-10ms lookups, filtered retrieval, hybrid vector+text, and search on data that already lives in Redis
  - Where it does not: huge corpora with heavy analytics, complex relevance pipelines, and teams without Redis operational experience
- **Inverted Index Internals**
  - Term dictionary, posting lists, and document table: the three structures every query touches
  - How a document becomes terms: field extraction, tokenization, normalization, stemming
  - Numeric and tag fields as separate indexes with their own encodings
  - The document table: document IDs, internal IDs, flags, and why deletes are lazy
  - Garbage collection of deleted documents (`FT.CONFIG GET`/`SET` on `GCSCANSIZE`, `MINPREFIX`)
- **Index Lifecycle**
  - `FT.CREATE` anatomy: `ON HASH` versus `ON JSON`, `PREFIX`, `FILTER`, `LANGUAGE`, `SCORE`, `STOPWORDS`, `TEMPORARY`
  - `FT.INFO` as the source of truth: `num_docs`, `hash_indexing_failures`, `indexing`, `percent_indexed`, `gc_stats`
  - `FT.DROPINDEX` with and without `DD` — what each one destroys
  - Aliases (`FT.ALIASADD`, `FT.ALIASUPDATE`) as the indirection layer used everywhere later
- **Lab Environment**
  - Running Redis Stack with Docker Compose, loading `redis-stack-server`
  - `redis-cli --search` assistance and raw-command discipline
  - Seeding 50,000 generated product documents into hashes with a Lua or Node script
- **Hands-on Lab**: Build a first product index over hashes, seed 50,000 documents, then use `FT.INFO` to prove every document was indexed and to account for where the memory went

### Module 2: Schema Design and Field Types (Week 2)

- **Field Type Selection**
  - `TEXT`: tokenized, stemmed, scored — the only type that affects relevance
  - `TAG`: exact-match sets for enumerations, arrays, and IDs; case sensitivity and separator control
  - `NUMERIC`: ranges, sorting, and numeric filters
  - `GEO`: geospatial points and radius/box predicates
  - `VECTOR`: declared alongside a text schema for hybrid retrieval (covered in depth in Module 8)
- **Attributes That Change Everything**
  - `SORTABLE`: enables `SORTBY` and range predicates at the cost of a duplicated, non-compressed copy
  - `NOINDEX` and `NOSAVE`: store-only fields versus index-only fields, and the write/search trade-off each creates
  - `UNF`: disable normalization for fields where exact byte matching matters
  - `WEIGHT`: per-field relevance multiplier and when it replaces query-side boosting
  - `SEPARATOR`: tag separators for values that cannot use the default comma
- **Hashes versus JSON**
  - Hash field layout for flat documents: one field per attribute, no nesting
  - JSON documents with JSONPath expressions as field definitions
  - Indexing arrays of tags and arrays of objects from JSON
  - Nested and dynamic paths, and the fields that silently fail to index
  - Choosing between the two for the same product record, measured
- **Multi-Tenancy and Index Scoping**
  - `PREFIX` to scope an index to a key family
  - `FILTER` for numeric and tag predicates applied at index time
  - One index per tenant versus one shared index with a tenant tag — cardinality and isolation trade-offs
  - Key naming as the tenancy boundary: what a leaked prefix means in a shared cluster
- **Hands-on Lab**: Model a marketplace listing three ways (flat hash, JSON with nested attributes, JSON with shared tenant tag), then measure index memory, query latency, and filter selectivity for each

### Module 3: The Query DSL in Depth (Week 3)

- **Query Syntax Fundamentals**
  - `FT.SEARCH index "query"` — what is actually parsed, and the dialect question (`DIALECT 2` semantics)
  - Field targeting with `@field:value` and multi-field targeting with `@field1|field2:value`
  - Combining terms: implicit AND, explicit `AND`, `OR`, negation with `-`, grouping with parentheses
  - Exact phrases with quoted strings and why they interact badly with stemming
- **Matching Modes**
  - Prefix matching with `term*` and `PREFIX`-driven partial queries
  - Fuzzy matching with `%term%` and the distance parameter — the cost curve as fuzziness grows
  - Wildcards with `w'pattern'` including `*` and `?`
  - Phonetic matching with `$term` and the `PHONETIC` field attribute
  - `VERBATIM` to disable stemming and stopword removal at query time
- **Numeric, Tag, and Geo Predicates**
  - Numeric ranges `@price:[10 100]`, exclusive bounds `((10`, and `+inf`/`-inf`
  - Tag queries with `{red | blue}`, negation `{-red}`, and escaping rules for special characters
  - Geo predicates `@location:[lon lat radius unit]` inside `FT.SEARCH`
  - Combining all three in one query without accidentally drowning the text term
- **Query Shaping Options**
  - `LIMIT offset count`, `SORTBY field ASC|DESC`, and multi-key sorts with `SORTBY 2`
  - `RETURN` to project fields and cut network payload, `NOCONTENT` for ID-only scans
  - `INKEYS` and `INFIELDS` for bounded exploration and debugging
  - `WITHSCORES`, `WITHSORTKEYS`, `EXPLAINSCORE`, `WITHPAYLOADS`, and `PARAMS` for parameterized queries
- **Hands-on Lab**: Write forty queries by hand against the seeded corpus — every matching mode, every predicate type — then rewrite the five slowest using `INKEYS`, `RETURN`, and `NOCONTENT` and measure the difference

### Module 4: Analyzers, Tokenization, and Relevance (Week 4)

- **Text Analysis Pipeline**
  - Character normalization, tokenization boundaries, and case folding
  - Stemming via Snowball for the declared `LANGUAGE`: what it merges and what it breaks
  - Stopword handling and the `STOPWORDS` argument for domain-specific noise
  - Custom tokenization for languages without whitespace boundaries, and the limits of the built-in support
  - When to reach for `UNF` plus pre-normalized fields instead of fighting the analyzer
- **Scoring Models**
  - TF-IDF and BM25 scorers via `SCORER`: `TFIDF`, `TFIDF.DOCNORM`, `BM25STD`, `DISMAX`, `DOCSCORE`
  - Term frequency, inverse document frequency, and field length normalization in practice
  - Per-field `WEIGHT` versus query-side boosting (`term => { $weight: 3 }`)
  - Custom document scores written into the `SCORE` field at index time
  - `EXPLAINSCORE` to see exactly why a document ranked where it did
- **Synonyms and Dictionaries**
  - Synonym groups with `FT.SYNUPDATE` and term expansion at query time
  - Spellcheck with `FT.SPELLCHECK` — distance, inclusion of terms, and custom dictionaries
  - Custom dictionaries loaded from term files for domain vocabulary
- **Relevance Evaluation**
  - Building a small judgment set: queries, expected documents, and graded relevance
  - Measuring precision at k and mean reciprocal rank without a framework
  - A/B comparing two scorers on the same judgment set
  - Recognizing when relevance is actually a schema problem, not a scoring problem
- **Hands-on Lab**: Build a 30-query judgment set for the marketplace corpus, then tune weights, synonyms, and scorer choice until mean reciprocal rank improves — recording each change and its measured effect

### Module 5: Autocomplete and Search-as-You-Type (Week 5)

- **Suggestion Data Structures**
  - `FT.SUGADD key "phrase" score` with `INCR`, `PAYLOAD`, and the memory cost of payloads
  - `FT.SUGGET key prefix` with `FUZZY`, `MAX`, `WITHSCORES`, `WITHPAYLOADS`
  - `FT.SUGDEL` and `FT.SUGLEN` for lifecycle management
  - Why suggestions are a separate structure from the search index, and what that means for consistency
- **Prefix Search Alternatives**
  - `term*` against a `TEXT` field versus the suggestion dictionary — latency and result quality
  - `TAG` fields with `PREFIX`-scoped prefix matching for structured completions (SKUs, categories)
  - Numeric and date completions that should not be suggestions at all
  - Hybrid approach: suggestions for phrasing, index queries for filtering
- **API Design for Search-as-You-Type**
  - Debounce and cancellation: server-side `CLIENT PAUSE`-free patterns and request coalescing
  - Request budget: max suggestions, max query length, and a hard timeout per keystroke
  - Ranking suggestions by popularity score, recency, and tenant scope
  - Caching hot prefixes with a short TTL versus computing them per request
- **Hands-on Lab**: Implement a suggestion service over 20,000 real query phrases with weighted suggestions, fuzzy fallback, payload-driven navigation targets, and a p99 budget of 5ms at 2,000 requests per second

### Module 6: Aggregations, Facets, and Analytics (Week 6)

- **The `FT.AGGREGATE` Pipeline**
  - Pipeline mental model: `LOAD`/`APPLY`/`FILTER`/`GROUPBY`/`REDUCE`/`SORTBY`/`LIMIT`
  - Expression syntax: arithmetic, string functions, date functions, and conditional logic in `APPLY`
  - `REDUCE` functions: `COUNT`, `COUNT_DISTINCT`, `SUM`, `AVG`, `MIN`, `MAX`, `STDDEV`, `QUANTILE`, `TOLIST`, `FIRST_VALUE`
  - `FILTER` versus query-side filtering: post-aggregation predicates and their cost
- **Faceted Navigation**
  - Facet counting with `GROUPBY` over `TAG` and `NUMERIC` fields, including `COUNT_DISTINCT`
  - Multi-select facets: intersecting selections without losing counts for the other facets
  - Range facets by bucket and by explicit boundaries
  - Price histogram construction and stat summaries per facet
  - The classic pitfall: facets computed over the full corpus instead of the filtered result set
- **Cursor Paging and Large Result Sets**
  - `WITHCURSOR` with `COUNT` and `MAXIDLE` for streaming aggregations
  - `FT.CURSOR READ` and `FT.CURSOR DEL` lifecycle, and the server-side memory each cursor holds
  - When to page with `LIMIT` (bounded offsets) and when cursors are mandatory
  - Avoiding the deep-offset trap in user-facing pagination
- **Hands-on Lab**: Build the facet panel for the marketplace — category, brand, price buckets, rating ranges, and availability — with multi-select semantics, correct counts under active filters, and cursor-based export of the full result set to CSV

### Module 7: Geo Search and JSON-Native Querying (Week 7)

- **Geo Indexing**
  - `GEO` fields and the geohash-based internal representation
  - Radius and box predicates, unit handling, and distance-ordered results with `SORTBY location`
  - `GEOSEARCH` on sorted sets versus `GEO` fields in the Query Engine: when each is the right tool
  - Combining geo with text and tags: "coffee near me, open now, rated above 4"
- **JSON-Native Patterns**
  - JSONPath as schema: `$.attributes.color AS color TAG`
  - Indexing arrays of primitives as tags and arrays of objects as flattened fields
  - Nested document updates with `JSON.SET` and how they affect index maintenance
  - `JSON.ARRAPPEND`, `JSON.NUMINCRBY`, and partial update cost under heavy indexing
  - Fields that silently fail to index and how to catch them with `FT.INFO` error counters
- **Hands-on Lab**: Add geo discovery to the marketplace — radius search ordered by distance, combined with category tags and an "open now" numeric/time predicate, plus a JSON-native variant of the same index for comparison

### Module 8: Hybrid Retrieval — Text plus Vectors (Week 8)

- **Vector Indexing Refresher**
  - `VECTOR` field declaration: `FLAT` versus `HNSW`, `TYPE FLOAT32`, `DIM`, `DISTANCE_METRIC`
  - HNSW parameters `M`, `EF_CONSTRUCTION`, `EF_RUNTIME` and their memory/latency/recall trade-off
  - KNN (`KNN` clause) versus range queries (`RANGE` with `epsilon`) on vectors
  - Memory math: dimension count times document count, plus HNSW link overhead
- **Hybrid Query Patterns**
  - Pre-filtering with tags and numerics before vector search — the performance-critical ordering
  - Post-filtering and why it silently returns fewer than `k` results
  - Combining a keyword score and a vector distance: application-side fusion with reciprocal rank fusion
  - Cross-encoder reranking on the top 50 candidates as the cheap quality win
  - `DIALECT 2` requirements and the parser behaviours that trip up hybrid queries
- **Choosing the Retrieval Mode**
  - When lexical search wins: exact identifiers, rare terms, SKU lookups, compliance queries
  - When vectors win: paraphrase, cross-lingual, and vague intent
  - When neither is enough and the answer is a reranker or a better chunking strategy
  - Cost control: embedding on write versus on read, caching embeddings, and index rebuild cost
- **Hands-on Lab**: Add embeddings to the marketplace corpus, run lexical, vector, and hybrid retrieval over the same judgment set from Module 4, and report precision at k and p99 latency for all three

### Module 9: Index Performance and Memory Engineering (Week 9)

- **Reading the Execution Plan**
  - `FT.EXPLAIN` to see the parsed query tree and index union/intersection strategy
  - `FT.PROFILE` for per-stage timings: query, search, and aggregation pipelines
  - `FT.PROFILE AGGREGATE` to find the expensive reduce and the unbounded group-by
  - Correlating slow queries with `SLOWLOG` entries and client-side traces
- **Memory Accounting**
  - Per-field memory: text posting lists, sortable copies, tag indexes, numeric trees, vectors
  - `FT.INFO` memory counters and reconciling them with `MEMORY USAGE` on documents
  - The cost of `SORTABLE` on high-cardinality text fields — often the largest single win
  - `NOINDEX`/`NOSAVE` as levers, and the fields that should never have been indexed
  - Document table overhead per document and its effect on small-document indexes
- **Indexing Throughput**
  - `FT.CONFIG SET` indexing parameters: batching, `PAUSE_ON_SUCCESS`, and `PAUSE_BEFORE_RETRY`
  - Write amplification: why a hot index slows the whole instance
  - Bulk backfill strategy versus steady-state indexing
  - `hash_indexing_failures` as the first metric to alert on, and the usual causes
- **Hands-on Lab**: Take the marketplace index from ~400 MB to under 250 MB without losing query capability, then document every change with its measured memory and latency delta

### Module 10: Cluster-Scale Search and Operations (Week 10)

- **Search in Redis Cluster**
  - Index metadata and document sharding: which node owns what
  - Distributed query execution and result merging across shards
  - `FT.AGGREGATE` under sharding: where the reduce happens and what that costs
  - Key hash tags, slot co-location, and the queries that become fan-outs
  - Coordinator behaviour and the failure modes when a shard is unavailable
- **High Availability and Persistence**
  - Indexes in RDB snapshots and AOF: what survives a restart and what must be rebuilt
  - Failover with replicas: index availability during promotion
  - Search on replicas: read scaling, staleness, and the consistency contract
  - Upgrade paths across Redis versions and module versions, including indexes that need rebuilding
- **Observability and SLOs**
  - `INFO search` metrics: query counts, latency histograms, indexing failures, GC stats
  - Alerting on indexing lag, memory growth, and query p99 regression
  - Dashboards that separate search problems from Redis-core problems
  - Defining SLOs for query latency, indexing freshness, and error rate
- **Hands-on Lab**: Stand up a three-shard cluster with one replica each, run the marketplace workload against it, then simulate a shard failure and measure query error rate, latency, and recovery time

### Module 11: Index Migration, Consistency, and Security (Week 11)

- **Zero-Downtime Reindexing**
  - The alias swap pattern: build a new index, backfill, verify, `FT.ALIASUPDATE`, drop the old one
  - Dual-write windows and how to keep both indexes current during the backfill
  - Verification before the swap: document counts, spot-check queries, and a judgment-set run
  - Rollback: keeping the previous index alive long enough to be useful
- **Keeping the Index Consistent**
  - Source of truth versus index: the transactional outbox and dirty-key set patterns
  - Detecting drift with count reconciliation and sampled document comparison
  - Repair jobs that re-index from the relational store without a full rebuild
  - Deletes, TTL expiry, and the documents that linger in the index after the key is gone
- **Security and Privacy**
  - ACLs per index and per command family (`FT.SEARCH`, `FT.AGGREGATE`, `FT.CREATE`)
  - TLS in transit and at rest; key namespaces as a tenancy boundary
  - PII in the index: `NOSAVE` fields, hashed identifiers, and the fields that must never be searchable
  - Query cost as an attack surface: unbounded wildcards, huge `LIMIT`, and cursor exhaustion
  - Auditing search access and retaining query logs responsibly
- **Hands-on Lab**: Perform a live schema change on the running marketplace — add a field, rebuild, swap by alias, and roll back once — while a load generator runs continuously and the error rate stays at zero

### Module 12: Capstone — Multi-Tenant Marketplace Search (Week 12)

- **Requirements and Design Review**
  - Functional requirements: keyword search, filters, facets, autocomplete, geo, hybrid retrieval
  - Non-functional requirements: p99 query latency under 20ms, indexing freshness under 2 seconds, 99.9% availability
  - Tenancy model, index topology, and the sharding plan
  - Failure modes and the runbooks each one needs
- **Build and Harden**
  - Index schema and analyzer decisions, justified against the judgment set
  - Query layer with parameterized queries, bounded result sets, and structured error handling
  - Facet and autocomplete services with their own latency budgets
  - Reindex pipeline with alias swap, verification, and rollback
  - Dashboards, alerts, and SLO documentation
- **Present and Defend**
  - Load test results against the stated SLOs, including the failure injection runs
  - A relevance evaluation comparing the shipped configuration against the Module 4 baseline
  - The memory budget, its growth trajectory, and the capacity plan at 10x documents
  - A one-page runbook another engineer could follow during an incident

## Final Project

Learners build and operate **MarketSearch**, a multi-tenant marketplace search service backed entirely by the Redis Query Engine. The service exposes five endpoints: `/search` (keyword, filters, sorting, pagination), `/suggest` (weighted search-as-you-type), `/facets` (multi-select facet counts under active filters), `/nearby` (geo radius combined with text and tag predicates), and `/semantic` (hybrid lexical plus vector retrieval with application-side fusion and cross-encoder reranking).

The deliverable is a running service, not a repository of scripts. It must ship with: a documented index schema and the reasoning behind each field attribute; a judgment set of at least 30 queries with graded relevance and measured precision at k before and after tuning; a reindex pipeline that performs a full rebuild and alias swap with zero failed requests under continuous load; a dashboard showing query p99, indexing lag, index memory, and `hash_indexing_failures`; and a load test at 2,000 requests per second held for ten minutes within the stated latency SLO.

Tenancy must be real: at least two simulated tenants with isolated data, ACL-scoped access, and a documented answer to "what happens if a tenant's query tries to escape its prefix?" The project is graded on the operational artifacts as heavily as on the search quality — a fast search that cannot be reindexed or rolled back does not pass.

## Assessment Criteria

- **Weekly Labs (40%)**: Twelve hands-on labs, each graded on whether the stated measurement was actually produced. A lab that reports "search is fast" without `FT.PROFILE` timings, index memory numbers, or a before/after comparison earns no credit. Labs 4, 9, and 11 (relevance tuning, memory reduction, zero-downtime migration) carry double weight because they are the skills that distinguish a search engineer from someone who can write queries.
- **Schema and Relevance Design Review (15%)**: A written defence of the final index schema — field types, attributes, analyzers, and tenancy model — each decision justified with a measurement or an explicit trade-off. Reviewers probe for the decisions made by default rather than by choice; "I used `SORTABLE` everywhere" fails the review.
- **Operational Readiness (20%)**: Reindex pipeline correctness under load, alias swap and rollback demonstrated live, alert coverage for indexing lag and memory growth, and a runbook that a reviewer can follow without asking questions. Graded on the demonstration, not the documentation alone.
- **Final Project (20%)**: Functional completeness of all five endpoints, measured precision at k against the judgment set, p99 latency under the stated load, tenancy isolation verified by an attempted escape, and the ability to survive an injected shard failure with the documented degradation rather than an outage.
- **Code and Query Quality (5%)**: Parameterized queries (no string concatenation of user input into query DSL), bounded result sets, no unbounded wildcards in user-facing paths, and clear separation between the search layer and the data layer.

## References

- Redis documentation — Query Engine: <https://redis.io/docs/latest/develop/interact/search-and-query/>
- Redis documentation — Indexing and query commands: `FT.CREATE`, `FT.SEARCH`, `FT.AGGREGATE`, `FT.PROFILE`, `FT.EXPLAIN`
- Redis documentation — Vector sets and vector similarity search
- RediSearch source and module release notes (index internals, GC, indexing threads)
- Manning, *Relevant Search* — Doug Turnbull and John Berryman: relevance tuning and evaluation methodology
- *Introduction to Information Retrieval* — Manning, Raghavan, Schütze: inverted indexes, TF-IDF, BM25
- Elasticsearch and OpenSearch documentation, for comparison of query DSL semantics and aggregation models
- Redis University — RU301 (Redis Streams) and RU203 (Query Engine) course material
- Redis blog — production search case studies and index memory guidance
