---
title: "Next.js AI Applications Syllabus"
description: "A comprehensive 12-week advanced curriculum for building AI-powered applications with Next.js, covering LLM integration with the Vercel AI SDK, streaming user interfaces, retrieval-augmented generation with vector databases, tool calling and agents, rate limiting and cost control, AI safety, evaluation, observability, and production deployment."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Next.js AI Applications Syllabus

## Overview

This 12-week advanced syllabus is designed for Next.js developers who want to specialize in building AI-powered applications. Where general Next.js courses treat AI features as an afterthought and generic LLM courses ignore the framework layer, this curriculum goes deep on the full AI web stack: integrating large language models through the Vercel AI SDK, designing streaming user interfaces that feel instant, and connecting RAG pipelines with vector databases for grounded, domain-specific answers. The course also covers the engineering realities that separate demos from products — structured output and tool calling, agentic loops, per-user rate limiting and cost control, prompt injection defense, evaluation harnesses, tracing, and deployment decisions that keep AI features fast and reliable in production.

Each module combines strong theoretical foundations with hands-on labs built on the Next.js App Router, React Server Components, TypeScript, and real tooling such as the AI SDK, OpenAI and Anthropic models, pgvector, Langfuse, and Redis. Learners build progressively: starting with a single streaming chat, then retrieval augmentation, then agents with tools, then production hardenings such as quotas and evals, and finally a complete AI assistant platform as the capstone project. By the end of this course, learners will be able to architect, build, evaluate, and operate production-grade AI features in Next.js — from streaming chat and copilots to RAG-powered knowledge bases and autonomous task agents.

## Curriculum

### Module 1: Foundations of AI-Powered Web Applications (Week 1)

- **How LLMs Work, from the Web Developer's Perspective**
  - Tokens, context windows, temperature, and why streaming changes perceived latency
  - Completion versus chat interfaces: system prompts, user turns, and assistant messages
  - Model providers and interchangeability: OpenAI, Anthropic, Google, and open-weight models
- **The Shape of an AI Web App**
  - The request flow: user input, model call, streamed tokens, rendered UI
  - Where AI logic belongs: server-side versus client-side model calls
  - Common feature types: chat assistants, copilots, summarizers, search, and agents
- **Streaming Fundamentals**
  - Server-Sent Events (SSE): `text/event-stream`, `Content-Type`, and chunked responses
  - WebSocket versus SSE for AI workloads, and when each wins
  - Reading a stream in the browser with `ReadableStream` and `getReader()`
- **Environment and Tooling Setup**
  - Creating a Next.js App Router project with TypeScript and Tailwind CSS
  - Managing API keys with environment variables and `.env.local`
  - Installing the `ai` package and a model provider package (`@ai-sdk/openai`)
- **Hands-on Lab**: Build a minimal route handler that streams a model response and render it in a chat box with plain `fetch` and a streaming reader

### Module 2: LLM Integration with the Vercel AI SDK (Week 2)

- **The AI SDK Abstraction Layer**
  - Unified `generateText` and `streamText` APIs across model providers
  - Model objects, provider configuration, and model selection per feature
  - How the AI SDK normalizes tool calls, stop reasons, and usage metadata
- **`useChat` and `useCompletion` Hooks**
  - Wiring `useChat` to a route handler: `POST` with messages, streamed delta protocol
  - Maintaining conversation state: message lists, roles, and content parts
  - The `onFinish`, `onError`, and `onToolCall` callbacks
- **Server-Side Generation**
  - Calling `streamText` inside Route Handlers and Server Actions
  - Passing tool definitions and parameters from server to client
  - Error handling: provider timeouts, rate limit errors, and malformed responses
- **Multi-Provider Strategy**
  - Switching models per feature and geography
  - Fallback chains when a provider is degraded
  - Cost and latency profiles: small versus large models
- **Hands-on Lab**: Convert the Module 1 chat to the AI SDK with `useChat`, add model selection, and render markdown responses with `react-markdown`

### Module 3: Streaming User Interfaces (Week 3)

- **Designing for Tokens, Not Pages**
  - Progressive rendering: thinking indicators, partial answers, and incremental updates
  - The streamed-response UX pattern: token-by-token reveal versus slide-in cards
  - Cancelation, regeneration, and editing mid-stream
- **React Server Components and AI**
  - Passing streamed content through RSC boundaries
  - `streamText` with `onChunk` feeding Server Components via the `AI` SDK's RSC mode
  - When to use RSC streaming versus client-side `useChat`
- **SSE and Edge Compatibility**
  - Streaming from the Edge runtime: constraints and supported patterns
  - Buffering pitfalls in proxies, load balancers, and CDNs
  - Compression and chunk delivery settings
- **Skeleton, Progress, and Fallback Patterns**
  - Placeholder shells for streaming cards and code blocks
  - Stream health: heartbeat timeouts, stalled-stream detection, and retry UX
  - Accessibility: `aria-live` regions and announcing assistant turns
- **Hands-on Lab**: Build a streaming report generator that streams markdown sections incrementally with per-section skeletons and a cancel button

### Module 4: Retrieval-Augmented Generation Foundations (Week 4)

- **Why RAG: Knowledge, Hallucination, and Grounding**
  - Failure modes of pure parametric memory and where RAG helps
  - The retrieval pipeline: chunk, embed, index, retrieve, synthesize
- **Embeddings**
  - What embeddings are and how cosine similarity ranks relevance
  - Generating embeddings with `embed` and `embedMany` from the AI SDK
  - Embedding models, dimensions, and multilingual considerations
- **Vector Storage Options**
  - pgvector with PostgreSQL: tables, indexes, and SQL queries
  - Managed vector databases: Pinecone, Upstash Vector, and Supabase
  - Storing metadata alongside vectors for filtering
- **Chunking Strategies**
  - Fixed-size, overlap, semantic, and structure-aware chunking
  - Chunk size versus retrieval precision and token cost
  - Handling documents with structure: headings, tables, and code blocks
- **Hands-on Lab**: Ingest a set of markdown documents, chunk them, embed them with `embedMany`, and store them in pgvector

### Module 5: Building a RAG Pipeline in Next.js (Week 5)

- **Ingestion and Indexing**
  - A Server Action or background job pipeline: read, parse, chunk, embed, upsert
  - Idempotent ingestion with document IDs and vector deduplication
  - Re-indexing strategies when documents change
- **Retrieval**
  - Similarity search with metadata filters: `WHERE` on source, category, and date
  - Top-K selection and score thresholds for relevance
  - Hybrid search: combining keyword and vector retrieval
- **Synthesis and Grounding**
  - Prompt templates that inject retrieved context with citations
  - Instructing the model to answer from context only and say "I don't know"
  - Returning source references to the UI for verification
- **Reranking**
  - Why top-K by distance is not enough
  - Cross-encoder reranking and model-graded relevance
  - Latency and cost trade-offs of reranking
- **Hands-on Lab**: Build a RAG-powered Q&A feature with a chat UI, grounded answers, and clickable source citations

### Module 6: Structured Output, Tool Calling, and Agents (Week 6)

- **Structured Output with Zod**
  - `generateObject` and `streamObject` for typed, validated responses
  - Zod schemas as the contract between the model and the application
  - Fixing invalid output: retry policies and schema repair
- **Tool Calling**
  - Defining tools with typed inputs and outputs
  - `toolCall` and `toolResult` parts in the streamed conversation
  - Tools that run server code: database queries, API calls, and utilities
- **Agent Loops**
  - The reason-act-observe loop: model decides, tool executes, result returns
  - Max-steps guardrails, termination conditions, and loop budgets
  - Sequential agents versus parallel tool execution
- **Multi-Step Tasks**
  - Planning: having the model break a task into steps before acting
  - Verifying: model checks its own output against constraints
  - Human-in-the-loop checkpoints for destructive actions
- **Hands-on Lab**: Build an assistant that searches a database, reads the help center, and performs actions when asked, with a max-steps guard

### Module 7: AI UX Patterns and Product Polish (Week 7)

- **Conversation Design**
  - System prompts that set behavior, tone, and constraints
  - Suggested prompts, empty states, and quick actions
  - Follow-up suggestions after each answer
- **Rich Content Rendering**
  - Streaming markdown, syntax-highlighted code, and tables
  - Tool-call visualizations: showing "Searching…" and "Reading file…" states
  - Rendering structured cards from `streamObject` JSON
- **Optimistic and Instant Feedback**
  - Immediate echo of user input and streaming-first rendering
  - Local message history with `localStorage` and seed data
  - Copy, share, and export actions for AI responses
- **Guardrails and Limits on the Client**
  - Input validation: length limits, content-type checks, and empty states
  - Disabling actions while a stream is running
  - Graceful degradation when the model is unavailable
- **Hands-on Lab**: Polish the RAG assistant into a product-ready chat experience with suggestions, tool-call visualizations, and shared conversations

### Module 8: Authentication, Rate Limiting, and Cost Control (Week 8)

- **Authenticating AI Features**
  - Auth.js sessions and route protection for AI endpoints
  - Passing the authenticated user into prompts and retrieval filters
  - Per-tenant retrieval: isolating knowledge bases by user or team
- **Rate Limiting and Quotas**
  - Per-user token budgets with Redis counters
  - Sliding-window and token-bucket strategies for request limits
  - Enforcing limits in the route handler before the model call
- **Usage Accounting**
  - Reading token usage from AI SDK responses and storing it per user
  - Model-level cost estimation and budget alerts
  - Free-tier limits and upgrade prompts
- **Caching and Cost Reduction**
  - Caching identical prompts and completions with `unstable_cache`
  - Semantic caching: reusing answers for similar questions
  - Prompt compression and smaller models for simple tasks
- **Hands-on Lab**: Add per-user rate limits with Redis, persist usage records, and cache repeated questions to cut token spend

### Module 9: AI Safety, Prompt Injection, and Content Moderation (Week 9)

- **Prompt Injection Defense**
  - How injected instructions travel through retrieved documents and user input
  - Separating instructions from data in system prompts
  - Output verification: checking for instruction-following anomalies
- **Input Sanitization and PII**
  - Redacting emails, phone numbers, and API keys before model calls
  - Allow-listing external content in retrieval pipelines
  - Data retention for prompts and completions
- **Output Filtering and Moderation**
  - Classifying model output with moderation endpoints
  - Topic allow-lists and disallowed-action detection
  - Fallbacks: refusal responses and blocklists for policy violations
- **Secure Tooling and Escalation**
  - Restricting tool access by user role and scope
  - Auditing tool calls: logs, approvals, and revert paths
  - Escalating risky requests to human review
- **Hands-on Lab**: Harden the assistant against injected instructions in documents, redact PII from prompts, and add moderation checks on output

### Module 10: Evaluation and Observability (Week 10)

- **Why Evals Matter for AI Products**
  - Regression testing prompts, models, and retrieval changes
  - Golden datasets: input, expected output, and scoring rubric
  - Manual review queues versus automated scorers
- **Automated Evaluation**
  - Model-graded evals: correctness, faithfulness, and safety scores
  - Retrieval evals: hit rate, mean reciprocal rank, and precision at K
  - Running eval suites in CI with deterministic seeds
- **Tracing and Observability**
  - OpenTelemetry spans for model calls, retrievals, and tools
  - Langfuse and LangSmith for prompt, trace, and cost analytics
  - Session replay and latency breakdowns for slow streams
- **Monitoring in Production**
  - Dashboards: tokens per day, cost per user, error rate, and stream latency
  - Alerting on provider errors, quota exhaustion, and degraded quality signals
  - Choosing model versions deliberately with canary rollouts
- **Hands-on Lab**: Create a golden dataset, add a model-graded eval script, wire tracing with Langfuse, and build a cost-and-latency dashboard

### Module 11: Production Deployment and Scaling (Week 11)

- **Runtime Selection for AI Workloads**
  - Edge versus Node.js runtime for model calls and SDK features
  - Long-running streams, buffering, and platform timeouts
  - Self-hosting versus managed platforms: Vercel, Fly.io, and bare metal
- **Queues and Background Processing**
  - Moving ingestion and batch generation to background workers
  - Queue-based jobs with Redis and the Vercel Background Functions model
  - Debouncing retries and backoff for provider outages
- **Streaming Through the Stack**
  - CDN and proxy behavior for SSE: buffering, compression, and timeouts
  - Keep-alive signals and idle connection handling
  - Load testing streams and planning concurrency limits
- **Security and Compliance Hardening**
  - Secrets management for provider keys
  - Audit logs, retention policies, and regional data residency
  - Abuse detection: anomalous usage patterns and IP-based throttling
- **Hands-on Lab**: Deploy the assistant to production, move ingestion to a queue, verify SSE flows through the CDN, and run a load test

### Module 12: Advanced Patterns and Future Directions (Week 12)

- **Multimodal Applications**
  - Image inputs with vision models and file uploads
  - Generating images and handling audio transcripts
  - Streaming long-form generation with progress tracking
- **RAG at Scale**
  - RAG versus long-context windows: when each wins
  - Multi-stage retrieval: query rewriting, expansion, and routing
  - Cache-augmented generation and embedding caching
- **Fine-Tuning Versus Prompting**
  - When fine-tuning beats prompt engineering
  - Collecting training data from production traces
  - Evaluating fine-tuned models against baselines
- **Agentic Systems in Production**
  - Multi-agent orchestration and task delegation
  - Self-correction loops with bounded retries
  - Governance: permissions, budgets, and kill switches for autonomous agents
- **Capstone Preparation**
  - Reviewing the full stack: streaming, RAG, tools, safety, evals, and operations
  - Choosing the capstone scope and architecture
  - Milestones, checkpoints, and grading rubric walkthrough
- **Hands-on Lab**: Add one advanced capability from this module to the capstone project and document its evaluation results

## Final Project

Learners build a **production-grade AI assistant platform** in Next.js. The capstone combines every module: a streaming chat interface with the AI SDK, a RAG knowledge base over the learner's own documents with pgvector, tool calling and an agent loop for real actions, per-user authentication with quotas and usage tracking, prompt-injection defenses and moderation, an evaluation suite with a golden dataset, tracing and cost observability, and a deployment with queue-based ingestion and monitored streams.

Suggested capstones include a customer support copilot for a SaaS product, a team knowledge assistant with per-workspace retrieval, or an operations assistant that answers questions and executes safe, user-approved actions against internal systems. The project must serve real streaming responses with grounded citations, enforce per-user limits, survive prompt-injection attempts, and include a documented evaluation report showing quality and cost metrics.

## Assessment Criteria

- **Assignments**: One hands-on lab per module (12 total), each assessed on a correct, runnable implementation that demonstrates the module's core techniques — for example, a working streamed chat by Week 2 and a validated RAG pipeline by Week 5.
- **Weekly Quizzes**: Short quizzes covering streaming protocols, AI SDK APIs, retrieval mechanics, safety principles, and operational concepts to confirm conceptual understanding.
- **Final Project**: Graded on architecture (clean separation of AI logic, retrieval, and UI), streaming quality and UX polish, grounding and citation correctness, robustness to injection and abuse, presence of automated evals and tracing, cost and latency controls, and production readiness of the deployment. A passing grade also requires a written evaluation report with measurable quality and cost metrics.

## References

- [Vercel AI SDK Documentation](https://ai-sdk.dev/) — generation, streaming, tool calling, and RSC integration
- [Next.js Documentation — Data Fetching, Streaming, and Server Components](https://nextjs.org/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs) and [Anthropic Documentation](https://docs.anthropic.com/) — model capabilities, messages API, and best practices
- [pgvector README](https://github.com/pgvector/pgvector) — vector storage and similarity search in PostgreSQL
- [Langfuse Documentation](https://langfuse.com/docs) — LLM tracing and evaluation
- [Pinecone Documentation](https://docs.pinecone.io/) and [Upstash Vector Documentation](https://upstash.com/docs/vector) — managed vector databases
- [Redis Documentation](https://redis.io/docs/) — rate limiting and caching primitives
- [Understanding RAG: Retrieval-Augmented Generation Guide](https://www.pinecone.io/learn/retrieval-augmented-generation/) — retrieval pipeline fundamentals
- [Prompt Injection: OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/) — AI security guidance
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/) — tracing and observability standards
