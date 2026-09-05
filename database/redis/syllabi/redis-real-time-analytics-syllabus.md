---
title: "Redis Real-Time Analytics Syllabus"
description: "A comprehensive 12-week advanced curriculum for building real-time analytics platforms with RedisTimeSeries, covering time-series data modeling, streaming ingestion pipelines, aggregation and query patterns, live dashboards, anomaly detection, forecasting, observability, multi-tenancy, scaling, and capacity planning."
category: "database"
technology: "redis"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Redis Real-Time Analytics Syllabus

## Overview

This 12-week advanced syllabus is designed for data engineers, backend developers, and platform engineers who want to master real-time analytics with Redis. Where general Redis courses treat RedisTimeSeries as one module among many, this curriculum goes deep on the entire real-time analytics stack: designing time-series data models that scale to millions of series, building streaming ingestion pipelines from Kafka, MQTT, and Redis Streams, writing expressive aggregation and cross-series queries, and powering live dashboards with sub-second refresh. The course also covers the operational realities of analytics workloads — anomaly detection and forecasting on streaming metrics, multi-tenant security and data retention, high availability and scaling for time-series data, and capacity planning so your Redis analytics platform stays fast as cardinality grows.

Each module combines deep theoretical foundations with hands-on labs that use the Redis CLI, Node.js clients, and real production tooling such as Grafana and RedisInsight. Learners build progressively: starting with a single time series, then ingestion pipelines, then dashboards, then detection and forecasting layers, and finally a complete real-time analytics platform as the capstone project. By the end of this course, learners will be able to architect, build, deploy, and operate a production-grade real-time analytics system on Redis serving live metrics, alerts, and business KPIs at sub-millisecond latencies.

## Curriculum

### Module 1: Foundations of Real-Time Analytics with Redis (Week 1)

- **Why Real-Time Analytics**
  - Batch versus streaming analytics: latency budgets, freshness, and decision windows
  - Real-time use cases: IoT telemetry, financial tick data, e-commerce KPIs, observability
  - The analytics pipeline: ingest, store, aggregate, visualize, alert
- **Redis as an Analytics Substrate**
  - In-memory performance versus disk-based analytics engines
  - RedisTimeSeries and Redis Stack: installation options (`redis-stack-server`, Docker images, managed cloud)
  - When Redis is the right analytics store and when it is not
- **Time-Series Data Model Fundamentals**
  - Series key, timestamp, value, and labels
  - `TS.CREATE` with retention, chunk size, and duplicate policy
  - Writing points with `TS.ADD`, `TS.MADD`, `TS.INCRBY`, `TS.DECRBY`
  - Reading points with `TS.GET`, `TS.RANGE`, `TS.REVRANGE`
- **Lab Setup**
  - Starting Redis Stack locally with Docker Compose
  - Connecting with `redis-cli` and a Node.js client (node-redis with Redis Stack commands)
- **Hands-on Lab**: Create your first time series, write 1,000 points with `TS.MADD`, and query them back with range and filter queries

### Module 2: Time-Series Data Modeling with RedisTimeSeries (Week 2)

- **Series Key Design**
  - Naming conventions: `metric:entity:dimension` patterns
  - One series per metric versus multi-dimensional label design
  - Label cardinality: what makes filters fast and what explodes memory
- **Labels and Filtering**
  - Adding labels at creation and with `TS.ALTER`
  - Cross-series lookup with `TS.MGET`, `TS.MRANGE`, and `TS.QUERYINDEX`
  - Filter operators: equality, `!=`, and set membership
- **Retention and Compaction**
  - Raw retention windows and hot/warm/cold data tiers
  - Downsampling rules with `TS.CREATERULE` and `TS.DELETERULE`
  - Aggregation buckets for compaction: `AVG`, `SUM`, `MIN`, `MAX`, `COUNT`, `FIRST`, `LAST`
- **Chunk Size and Duplicate Policies**
  - Chunk size tuning: memory per series versus query latency
  - Duplicate policies: `BLOCK`, `FIRST`, `LAST`, `MIN`, `MAX`, `SUM`
  - Altering retention and policies after creation
- **Hands-on Lab**: Design a multi-dimensional metrics schema for an e-commerce platform with raw 1-second series and 1-minute compaction rules, then query across dimensions with label filters

### Module 3: Streaming Ingestion Pipelines (Week 3)

- **Ingestion Architecture**
  - Producer patterns: agents, SDKs, exporters, and edge devices
  - Batch writes with `TS.MADD` for throughput
  - Backpressure handling and retry semantics
- **Redis Streams as an Intake Bus**
  - `XADD` ingestion with consumer groups for parallel processing
  - Stream-to-time-series fan-out: consumers that parse and write `TS.ADD`
  - Idempotent ingestion and exactly-once approximation
- **External Sources**
  - Kafka to Redis: Kafka Connect, mirroring, and bridge services
  - MQTT to Redis for IoT telemetry and sensor data
  - Prometheus remote write into RedisTimeSeries
  - Backfilling historical data from object storage or OLTP databases
- **Failure Handling**
  - Dead-letter streams for unparseable events
  - Duplicate suppression with idempotency keys and time-based deduplication
- **Hands-on Lab**: Build a Node.js ingestion pipeline that consumes a Redis Stream, validates events, and writes aggregates to time series with batching and a dead-letter stream

### Module 4: Aggregation and Query Patterns (Week 4)

- **Range Queries Across Series**
  - `TS.RANGE` and `TS.REVRANGE` with time-bucket alignment
  - `TS.MRANGE` with label filters and `GROUPBY`/`REDUCE`
  - Querying by label sets with `TS.QUERYINDEX`
- **Aggregation Buckets**
  - Time-bucket aggregation: `AVG`, `SUM`, `MIN`, `MAX`, `COUNT`, `STD.P`, `STD.S`, `VAR.P`, `VAR.S`, `RANGE`, `FIRST`, `LAST`, `TWAP`
  - Aligned buckets, empty buckets, and gap handling
- **Cross-Series Analytics**
  - Reducing many series into one with `GROUPBY` and reducers
  - Comparing series: ratios, deltas, and correlation at query time
  - Paging large result sets and limiting output with `COUNT` and `ALIGN`
- **Query Performance**
  - Reading from compaction rules instead of raw series
  - Filter pushdown and index usage (`TS.INFO`)
  - Caching hot query results with short TTLs
- **Hands-on Lab**: Implement a "top-N products by revenue in the last hour" query with `TS.MRANGE`, `GROUPBY`, and `REDUCE SUM`, then optimize it with a compaction rule

### Module 5: Real-Time Dashboards and Visualization (Week 5)

- **Visualization Options**
  - Grafana with the Redis Data Source plugin
  - RedisInsight for exploration and ad-hoc queries
  - Custom web dashboards with WebSockets and Node.js
- **Live Dashboard Patterns**
  - Sub-second refresh loops and query batching
  - Time-bucket alignment for stable chart rendering
  - Streaming updates with server-sent events and WebSocket feeds
- **Grafana Integration**
  - Configuring the Redis data source, variables, and templated queries
  - Multi-panel dashboards with mixed series sources
  - Annotations for deployments and incidents
- **Dashboard Performance**
  - Limiting query scope with `LAST` and time windows
  - Pre-aggregated views for commonly used panels
  - Concurrency control and connection pooling
- **Hands-on Lab**: Build a live Grafana dashboard for ingestion rate, error rate, and p99 latency fed by a RedisTimeSeries backend, and compare it with a custom WebSocket dashboard

### Module 6: Anomaly Detection and Forecasting (Week 6)

- **Anomaly Detection Fundamentals**
  - Static thresholds versus dynamic baselines
  - Statistical methods: z-scores, rolling mean, and rolling standard deviation
  - Seasonal baselines for periodic metrics
- **Detectors on Redis**
  - Computing baselines with range queries and aggregation
  - Streaming anomaly scores written back to time series
  - Implementing detectors in Node.js, Lua, or Redis Functions
- **Forecasting Techniques**
  - Linear regression and exponential smoothing on historical series
  - Simple seasonality models with daily/weekly buckets
  - Confidence bands and upper/lower bounds as series
- **Alerting**
  - Threshold-based alerts with hysteresis to avoid flapping
  - Combining metrics: anomaly score + business-context rules
  - Alert routing and deduplication
- **Hands-on Lab**: Implement a rolling-baseline anomaly detector for a latency metric, persist anomaly scores to a time series, and wire Grafana alerts with hysteresis

### Module 7: Real-Time Product and Business Analytics (Week 7)

- **Event Tracking**
  - Instrumenting page views, clicks, conversions, and feature usage
  - Event schemas and required labels for downstream queries
  - Client-side versus server-side tracking events
- **Real-Time KPIs**
  - DAU/WAU/MAU counters with HyperLogLog combined with time-series snapshots
  - Revenue, order, and funnel metrics streamed into series
  - Sessionization: session start/end from raw event streams
- **Funnel and Cohort Analytics**
  - Step-wise funnel queries with sorted sets and time series
  - Cohort retention over time buckets
  - A/B test telemetry: splitting series by variant label
- **Geo Analytics**
  - Event streams enriched with geospatial data
  - Region-based aggregation with label filters
- **Hands-on Lab**: Build a real-time KPI pipeline for an e-commerce demo — event intake, hourly revenue series, DAU counters, and a conversion funnel visualized live

### Module 8: Observability and Metrics Engineering (Week 8)

- **Metrics for Your Applications**
  - RED (Rate, Errors, Duration) and USE (Utilization, Saturation, Errors) methods
  - Instrumenting Node.js, Python, and Go services to write metrics into Redis
  - Structured logs versus metrics: when events become series
- **Prometheus Integration**
  - `redis_exporter` for Redis's own metrics
  - Remote write from Prometheus to RedisTimeSeries
  - Scrape-based ingestion with custom exporters
- **SLOs and Error Budgets**
  - Defining SLOs from series data
  - Error budget burn-rate alerts
  - Tracking reliability over time windows
- **Distributed Tracing Correlation**
  - Trace IDs in stream events and latency series
  - Correlating spikes with deployments via annotations
- **Hands-on Lab**: Instrument a sample microservice, collect RED metrics into time series, define an SLO with a burn-rate alert, and build an observability dashboard

### Module 9: Security and Multi-Tenancy for Analytics Workloads (Week 9)

- **Access Control with ACLs**
  - Read-only roles for dashboards and analysts
  - Per-team users with key-pattern permissions
  - Restricting commands to the time-series subset (`TS.` commands) and streams
- **Encryption and Network Hardening**
  - TLS for ingestion endpoints and dashboard connections
  - Network segmentation between producers, Redis, and visualization tools
  - Authentication for Grafana and RedisInsight
- **Data Retention and Privacy**
  - Retention policies as a privacy control (GDPR-style data minimization)
  - PII handling in event streams: pseudonymization before ingestion
  - TTL and deletion strategies for request-level data
- **Audit and Compliance**
  - Audit trails with append-only streams
  - Immutable series for billing or regulatory metrics
  - Least-privilege configuration checklist
- **Hands-on Lab**: Harden a Redis analytics deployment — create read-only ACL users, enable TLS for ingestion, apply retention policies for privacy, and verify command restrictions

### Module 10: High Availability and Scaling for Time-Series Data (Week 10)

- **Scaling Models for Series Data**
  - Sharding by metric namespace across Redis Cluster slots
  - Partitioning high-cardinality metrics across multiple databases
  - Fan-out ingestion to multiple replicas for read scaling
- **High Availability Topologies**
  - Redis Sentinel for failover of analytics instances
  - Redis Cluster for sharded time-series workloads
  - Hybrid storage (RAM + flash) for large retention windows
- **Replication Considerations**
  - Replica reads for dashboard queries
  - `wait` and consistency trade-offs for ingestion
  - Failover behavior and duplicate re-ingestion after promotion
- **Disaster Recovery**
  - Backup strategies for series data and compaction rules
  - Restore drills and point-in-time recovery of analytics state
  - Multi-region considerations with Redis Enterprise Active-Active
- **Hands-on Lab**: Deploy a three-node Redis Cluster with time-series data, shard a high-cardinality metric set, simulate a node failure, and verify dashboard continuity during failover

### Module 11: Capacity Planning and Performance Tuning (Week 11)

- **Write Throughput Engineering**
  - Estimating events-per-second and samples-per-second budgets
  - `TS.MADD` batching and pipeline usage with Node.js clients
  - Avoiding per-point round trips: aggregation at the producer
- **Memory Budgeting**
  - Samples per series × chunk efficiency × retention
  - Estimating footprint with `TS.INFO` and `MEMORY USAGE`
  - Compaction rules as a memory lever
- **Latency Tuning**
  - Chunk size and its effect on write/read latency
  - Network coalescing, TCP settings, and client pooling
  - Slow-query detection with `SLOWLOG`
- **Benchmarking**
  - Load testing with custom Node.js or Go writers
  - Validating p99 latency and throughput against targets
  - Observing `INFO` metrics during load
- **Hands-on Lab**: Given a target workload (100K samples/sec, 90-day retention, 10K series), produce a memory and capacity plan, then validate it with a load test and tune chunk sizes

### Module 12: Capstone Project — Real-Time Analytics Platform (Week 12)

- **Project Scope**
  - Choose a domain: e-commerce real-time analytics, IoT telemetry monitoring, or financial tick analytics
  - Requirements: streaming ingestion, multi-dimensional modeling, live dashboards, anomaly detection, multi-tenant access
- **Architecture**
  - End-to-end design: producers → ingestion bus (Redis Streams) → RedisTimeSeries → query API → dashboard
  - Compaction, retention, and alerting strategy
  - Capacity plan and high-availability topology
- **Implementation**
  - Build the ingestion pipeline, data model, and query layer
  - Implement live dashboards (Grafana and/or custom WebSocket)
  - Add anomaly detection and alert routing
- **Delivery**
  - Architecture document, runbook, and capacity plan
  - Load-test results and performance validation
- **Hands-on Lab**: Present the completed platform with a live demo, defend design decisions, and run a failure drill

## Final Project

Learners build a production-grade real-time analytics platform on RedisTimeSeries. The platform must ingest streaming events (from a Redis Stream, Kafka, or MQTT source), model multi-dimensional time-series data with retention and compaction rules, expose a query API, and render live dashboards with sub-second freshness. The system must include at least one anomaly detector or forecast layer with alerting, enforce multi-tenant access control with ACLs, and ship with a documented capacity plan and high-availability topology. Suggested domains include a real-time e-commerce sales and engagement dashboard, an IoT telemetry monitoring system, or a financial tick-data analytics service. The capstone is assessed on architectural soundness, correctness of the time-series model, performance under load, security hardening, and operational documentation.

## Assessment Criteria

- **Assignments**: Weekly hands-on labs (40%) — graded on correctness of Redis commands, data-model design, and working ingestion/query pipelines; two written design exercises (10%) covering schema design and capacity planning.
- **Final Project**: Capstone platform (50%) — evaluated on end-to-end functionality, time-series modeling quality, dashboard freshness and performance, anomaly detection effectiveness, security configuration, and the quality of the capacity plan and runbook. A live demo and failure drill are required.

## References

- RedisTimeSeries official documentation: https://redis.io/docs/latest/develop/data-types/timeseries/
- Redis University course on RedisTimeSeries and Redis Stack: https://university.redis.com/
- Redis Data Source for Grafana plugin documentation: https://grafana.com/grafana/plugins/redis-datasource/
- RedisInsight documentation: https://redis.io/insight/
- Redis blog on time-series and real-time analytics use cases: https://redis.io/blog/
- "Designing Data-Intensive Applications" by Martin Kleppmann (streaming systems reference)
- Prometheus documentation on remote write and metrics naming: https://prometheus.io/docs/
