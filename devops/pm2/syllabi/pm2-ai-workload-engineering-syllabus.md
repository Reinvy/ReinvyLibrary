---
title: "PM2 AI Workload Engineering Syllabus"
description: "A comprehensive 12-week advanced curriculum for engineers who run AI application workloads on PM2: LLM gateways and proxies, embedding and vector ingestion workers, RAG pipeline services, streaming token endpoints, batch inference jobs, GPU fleet orchestration, AI-specific observability and cost tracking, secrets management, and canary model deployment."
category: "devops"
technology: "pm2"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# PM2 AI Workload Engineering Syllabus

## Overview

This 12-week advanced syllabus teaches engineers how to design, operate, and scale AI application workloads entirely with PM2. AI backends have a distinct operational profile: long-lived stateless gateways that proxy to external model providers, queue-driven workers that embed text and ingest vectors, streaming endpoints that hold connections open while tokens stream back, batch jobs that reprocess corpora overnight, and scheduled tasks that retrain or reindex. These workloads fail differently from traditional web apps — memory spikes from large payloads, upstream timeouts from model providers, partial writes to vector stores, and connection churn on streaming endpoints — and PM2's process supervision model is the tool most AI production stacks actually use to keep them alive.

Where the introductory PM2 curriculum teaches general process management and the advanced syllabus dissects PM2 internals, this course is organized around the AI workload itself. Weeks 1–4 build the core services: the model gateway, embedding workers, and RAG pipeline stages. Weeks 5–8 make them production-grade: streaming workloads, memory and resource engineering, batch and scheduled AI jobs, and multi-host GPU fleets. Weeks 9–12 add the operational discipline unique to AI: custom metrics for tokens, latency, and queue depth; secrets handling for model providers; canary and shadow model deployment; and a capstone that assembles everything into a self-healing AI platform.

Each module pairs the operational concepts with hands-on labs that run real services: proxying actual model-provider traffic, hammering an embedding worker with a large corpus, streaming responses through a cluster reload, and running failure drills against a live gateway. By the end of this course, learners will be able to architect an AI backend as a set of PM2-managed services, keep model-provider dependencies from taking the platform down, track AI-specific costs and latency in real time, and ship new model versions without user-visible downtime.

## Curriculum

### Module 1: The AI Application Workload Landscape (Week 1)

- **What makes AI backends different**
  - External dependency on model providers: latency, rate limits, and outages you do not control
  - High payload variance: prompts, documents, and images that make memory unpredictable
  - Long-lived streaming connections versus short request/response cycles
  - Idempotency and partial-failure semantics unique to embedding and generation pipelines
- **The AI service taxonomy**
  - LLM gateways and proxies: the thin, stateless, always-on layer in front of model providers
  - Embedding and vector ingestion workers: queue consumers that batch and write to vector stores
  - RAG pipeline services: multi-stage document intake, chunking, embedding, and indexing
  - Batch inference and scheduled jobs: nightly reprocessing, reindexing, and retraining
- **Where PM2 fits in the AI stack**
  - Why Kubernetes is often overkill for a gateway fleet, and why PM2 remains the standard for single-host AI services
  - PM2 as the supervisor between the app and the init system: restarts, log capture, and state tracking
  - Complementing container runtimes with `pm2-runtime` inside AI service containers
- **Polyglot stacks with the interpreter option**
  - Running Node.js gateways and Python workers under one daemon: `pm2 start worker.py --interpreter python3`
  - Pinning interpreter versions and venvs per process
  - When a mixed-language AI stack is simpler than a microservice split
- **Hands-on Lab**: Deploy a minimal LLM gateway plus an embedding worker as two PM2 processes, verify both restart independently, and trace their logs through one `pm2 logs` stream

### Module 2: Running LLM Gateways and Proxies under PM2 (Week 2)

- **Gateway architecture**
  - The OpenAI-compatible proxy pattern: one internal endpoint, many upstream providers
  - Environment-based provider selection: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and custom providers
  - Connection pooling and keep-alive tuning for high-throughput gateway processes
- **Resilience to provider failure**
  - Retry with exponential backoff for 429 and 5xx upstream responses
  - Provider failover and fallback routing when the primary model is degraded
  - Circuit breaking: failing fast instead of queuing requests against a dead upstream
- **Rate limiting and tenant isolation**
  - Token-bucket rate limiting per API key or per tenant
  - Queue depth control: bounded request queues so a burst cannot exhaust memory
  - Mistral/OpenAI-compatible headers for streaming, usage, and request IDs
- **Graceful shutdown for in-flight requests**
  - Draining active generation requests before the process exits on restart
  - `kill_timeout` tuned for long generations and streamed responses
  - `wait_ready` and readiness probes so a reload never cuts off a request mid-stream
- **Hands-on Lab**: Run a gateway under PM2, artificially fail the primary provider, verify automatic failover, and confirm a rolling `pm2 reload` completes without dropping a single in-flight request

### Module 3: Embedding and Vector Ingestion Workers (Week 3)

- **Queue-driven ingestion**
  - Redis queues (BullMQ/Bull) and how PM2 supervises the consuming workers
  - Fan-out: one ingestion queue, multiple workers, distributed processing
  - Backpressure: worker concurrency limits that match embedding API rate limits
- **Batching for cost and latency**
  - Batching embedding requests (OpenAI embeddings, Cohere, local ONNX models)
  - Retry and dead-letter handling for failed chunks
  - Rate-limit-aware pacing so the worker never trips upstream limits
- **Vector store write patterns**
  - Batching upserts into pgvector, Qdrant, or Pinecone
  - Ordering guarantees: embeddings must be written after their chunks
  - Index health monitoring: vector counts versus source document counts
- **Singleton workers and leader election**
  - Exactly-once ingestion with a single worker instance
  - Distributed locking so two hosts never process the same queue shard
- **Hands-on Lab**: Build an embedding worker that drains a Redis queue, batches chunk embeddings, upserts to a vector store, and recovers cleanly when the worker is killed mid-batch

### Module 4: RAG Pipeline Services and Retrieval Orchestration (Week 4)

- **The RAG pipeline as a process graph**
  - Stage 1: document intake and format normalization
  - Stage 2: chunking with overlap and metadata preservation
  - Stage 3: embedding and vector upsert
  - Stage 4: index refresh and retrieval validation
- **Running pipeline stages as PM2 services**
  - One ecosystem file, four services, explicit dependency ordering
  - Health-check wait loops between stages
  - Per-stage restart policies: limited retries for intake, aggressive restarts for consumers
- **Checkpointing and idempotent reprocessing**
  - Storing per-document processing state so a crash does not re-embed everything
  - Idempotent upserts: re-running a stage changes nothing
  - `pm2 startOrReload` for idempotent pipeline automation
- **Dead-letter and retry semantics**
  - Poison chunks: documents that permanently fail embedding
  - Dead-letter queues and alerting when a stage underproduces
- **Hands-on Lab**: Stand up a four-stage RAG pipeline, kill the embedding stage mid-run, restart it, and verify that only the abandoned chunk batch is reprocessed — not the whole corpus

### Module 5: Streaming AI Workloads (Week 5)

- **SSE and WebSocket token streaming**
  - How streaming endpoints hold responses open while tokens arrive
  - PM2's signal forwarding and what a restart does to an open stream
  - Client disconnect handling: cancel upstream generation to save cost
- **Cluster mode for stateless streaming endpoints**
  - Scaling streaming gateways with cluster mode and explicit instance counts
  - Sticky sessions: keeping a streamed response on one worker
  - Reload semantics for long-lived connections: drain before restart
- **Tuning timeouts for streaming**
  - `kill_timeout` above the longest expected generation
  - `listen_timeout` and `wait_ready` for gateways that take time to hydrate caches
  - Idle connection reaping to prevent socket leaks
- **Backpressure end to end**
  - Slow clients: throttling token emission without blocking upstream
  - Buffer limits so a slow consumer cannot balloon memory
- **Hands-on Lab**: Stream tokens through a clustered gateway, perform a rolling reload mid-stream, and prove that active streams survive while new traffic lands on fresh workers

### Module 6: Memory and Resource Engineering for Model Services (Week 6)

- **Memory profiles of AI workloads**
  - Large prompt and document payloads driving V8 heap growth
  - Peak memory in embedding workers versus steady-state memory in gateways
  - Token buffers and stream buffers: memory that scales with conversation length
- **Memory limits and auto-restart**
  - `max_memory_restart` as a self-healing mechanism for leaky workers
  - `NODE_OPTIONS=--max-old-space-size` caps for V8
  - Python worker memory caps with `PYTHONMALLOC` and RSS limits
- **Profiling and diagnosis**
  - Heap snapshots and `pm2 monit` memory curves
  - Identifying the leak: per-request retention versus global caches
  - When to restart proactively: scheduled recycles for long-running workers
- **CPU and concurrency control**
  - Worker thread pool sizing versus cluster instances
  - `instances` and `max_memory_restart` interplay in cluster mode
  - Preventing one greedy worker from starving the gateway
- **Hands-on Lab**: Load-test an embedding worker with a large corpus, set a realistic `max_memory_restart`, and observe PM2 recycle memory-bloated workers while the queue drains

### Module 7: Batch Inference and Scheduled AI Jobs (Week 7)

- **Scheduled jobs with PM2 cron**
  - `cron_restart` for nightly reindexing, retraining, and evaluation jobs
  - One-shot jobs with `--no-autorestart` and `stop_exit_codes`
  - Cron versus in-app schedulers: why PM2-level scheduling survives app crashes
- **Batch inference patterns**
  - Chunked batch processing with checkpoint/resume
  - Cost controls: batch size caps, model tier selection for bulk work
  - Progress reporting from a batch job into the metrics stack
- **Retry semantics for batch work**
  - Idempotent batch consumers: processing the same shard twice is harmless
  - `min_uptime` and `max_restarts` to contain a crash-looping batch job
  - Distributed locking so overlapping cron runs never double-process
- **Graceful interruption of batch jobs**
  - SIGTERM handling: finish the current chunk, checkpoint, exit
  - Resuming from the last checkpoint on the next scheduled run
- **Hands-on Lab**: Schedule a nightly embedding-cache rebuild with `cron_restart`, kill it mid-run, and verify the next run resumes from the checkpoint instead of redoing the corpus

### Module 8: Multi-Host and GPU Fleet Orchestration (Week 8)

- **Fleet-wide process management**
  - Pushing ecosystem files to multiple hosts with `pm2 deploy`
  - Per-host service variants: gateway everywhere, ingestion workers on data hosts
  - Health-gated restarts: only restart a host's services when the host is healthy
- **GPU-aware scheduling**
  - `CUDA_VISIBLE_DEVICES` isolation on multi-GPU machines
  - Local model services on GPU hosts supervised by PM2
  - Matching instance counts to GPU memory: one LLM process per GPU
- **Capacity planning for AI fleets**
  - Gateway CPU requirements versus embedding GPU requirements
  - Throughput math: tokens per second per instance, instances per host
  - Headroom for failover when one host drains its model
- **Hybrid local and cloud models**
  - Routing: local model for low-latency work, cloud provider for overflow
  - Consistency: same interface, different upstreams, one PM2-managed fleet
- **Hands-on Lab**: Define a two-tier fleet (gateway hosts + GPU ingestion hosts) in one deploy configuration, drain a GPU host, and verify the fleet rebalances while PM2 keeps every surviving service online

### Module 9: Observability for AI Workloads (Week 9)

- **AI-specific metrics with @pm2/io**
  - Custom metrics: tokens per second, requests in flight, provider latency percentiles
  - Queue depth and embedding backlog as first-class gauges
  - Cost-per-request tracking: model, tokens, and price in one metric
- **Structured logging for AI services**
  - Log shape: request ID, model, provider, tokens in/out, duration, cost
  - Seeding logs with prompt metadata without leaking sensitive content
  - Centralized aggregation: `pm2 logs` streaming into a log pipeline
- **Prometheus and Grafana integration**
  - Exposing @pm2/io metrics to Prometheus
  - Dashboards: gateway health, provider error rates, token throughput, queue depth
  - Alerting on provider failures, memory blowups, and backlog growth
- **Tracing AI calls end to end**
  - OpenTelemetry spans across gateway → worker → vector store
  - Correlating a user question with its retrieval and generation traces
- **Hands-on Lab**: Instrument a gateway and an embedding worker with custom @pm2/io metrics, stream them to Prometheus, and build a Grafana panel that shows tokens per second, provider error rate, and queue depth on one screen

### Module 10: Security and Secrets for AI Services (Week 10)

- **Secrets management for model providers**
  - Keeping `OPENAI_API_KEY` and friends out of ecosystem files and process lists
  - Environment injection from 0600 secret files and the deploy environment
  - Rotating provider keys without restarting the fleet: reload after secret swap
- **Hardening the gateway boundary**
  - Per-tenant keys with usage caps to contain abuse
  - Request validation before any token is spent: prompt size, schema, and allowlists
  - Prompt injection guardrails at the gateway: system-prompt isolation and output checks
- **Least-privilege daemon operations**
  - Dedicated service account for the PM2 daemon and its AI processes
  - Network isolation: the gateway host talks only to providers and the vector store
  - Protecting the IPC socket from other users on the host
- **Audit and compliance**
  - Logging who called which model with what payload size and cost
  - Data residency: routing tenant requests to region-scoped providers
  - Retention and redaction of sensitive prompt content in logs
- **Hands-on Lab**: Harden a gateway's secret handling, run an abuse simulation with a stolen tenant key, and verify per-tenant rate limits contain the blast radius while audits record every call

### Module 11: Model Versioning and Deployment Strategies (Week 11)

- **Canary model deployment**
  - Routing a small traffic percentage to a new model version
  - Comparing quality and latency before full rollout
  - `pm2 deploy` release trains with model-version-tagged ecosystem files
- **Shadow traffic and A/B evaluation**
  - Shadow mode: duplicate requests to a candidate model without serving its output
  - Offline evaluation jobs scored by the metrics stack
  - Rollback triggers: quality regression, latency regression, cost blowup
- **Zero-downtime model swaps**
  - Reloading a gateway whose config points at a new model
  - Cache invalidation on model change: prompt caches must not mix versions
  - Coordinated swaps: gateway, embedding model, and vector index move together
- **Feature flags for model selection**
  - Routing by tenant, by feature, or by prompt category
  - Killing a bad model instantly via flag flip instead of a redeploy
- **Hands-on Lab**: Canary a new LLM version behind a gateway, route 10 percent of traffic to it, evaluate quality on the metrics dashboard, and roll back in under a minute when the canary regresses

### Module 12: Capstone — Self-Healing AI Platform (Week 12)

- **Platform design**
  - Gateway tier: clustered, rate-limited, provider-failover LLM proxy
  - Ingestion tier: queue-driven embedding workers with dead-letter handling
  - RAG tier: four-stage pipeline with checkpointing and idempotent reprocessing
  - Batch tier: nightly reindex and evaluation jobs on cron
- **Reliability engineering**
  - Chaos drills: kill the gateway, starve a worker, fail the primary provider
  - Runbook: every failure mode with detection, response, and verification steps
  - Load test: sustained token throughput with memory and latency SLOs
- **Observability and cost center**
  - One Grafana dashboard: tokens, latency, queue depth, provider errors, spend
  - Cost tracking per tenant and per model
  - Alerting with clear severity tiers
- **Delivery requirements**
  - Everything managed by PM2: one ecosystem file, one deploy script
  - Zero-downtime reloads proven during the presentation
  - A runbook that a night-shift engineer can follow without context
- **Hands-on Lab**: Run the full failure drill — provider outage, worker crash, memory leak — and demonstrate the platform self-healing within the SLOs, with every recovery visible in the metrics

## Final Project

Learners design, build, and operate a self-healing AI application platform managed entirely by PM2. The platform must include: an LLM gateway with provider failover and per-tenant rate limiting; a queue-driven embedding and vector ingestion pipeline with dead-letter handling; a four-stage RAG pipeline that resumes from checkpoints after crashes; a nightly scheduled reindex job; custom @pm2/io metrics for tokens, latency, queue depth, and cost; a Prometheus/Grafana dashboard and alerting stack; and a canary model deployment with a measured rollback. Teams present a live failure drill — provider outage, worker crash, and memory leak — demonstrating that the platform recovers within its written SLOs, and hand over a runbook a new operator can follow.

## Assessment Criteria

- **Weekly Labs**: Each module ends with a hands-on lab scored on correct process configuration, resilience under injected failures, and clean observability output (logs and metrics) — 40% of the final grade.
- **Pipeline Design Review**: A mid-course review of the RAG pipeline architecture, evaluated on stage separation, checkpointing, idempotency, and dead-letter handling — 20%.
- **Metrics and Cost Dashboard**: The Grafana dashboard must show tokens per second, provider error rate, queue depth, and spend, with alerts wired to real failure conditions — 15%.
- **Final Project**: The live capstone demonstration is passed only if the platform self-heals from all three injected failures within the stated SLOs, the canary rollback completes in under a minute, and the runbook lets a fresh operator recover a simmed outage unassisted — 25%.

## References

- [PM2 Process Manager Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [PM2 Ecosystem File Reference](https://pm2.keymetrics.io/docs/usage/application-declaration/)
- [PM2 Deployment Documentation](https://pm2.keymetrics.io/docs/usage/deployment/)
- [PM2 Programmatic API Documentation](https://pm2.keymetrics.io/docs/usage/pm2-api/)
- [@pm2/io Custom Metrics Documentation](https://github.com/keymetrics/pm2-io-apm)
- [BullMQ — Redis Queue for Node.js](https://docs.bullmq.io/)
- [OpenAI Platform Documentation](https://platform.openai.com/docs)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [OpenTelemetry JavaScript Documentation](https://opentelemetry.io/docs/languages/js/)
- [Prometheus Documentation](https://prometheus.io/docs/)
