---
title: "MongoDB Data Engineering and Analytics Syllabus"
description: "A comprehensive 12-week advanced curriculum for data engineers and analysts covering time series collections, the aggregation pipeline for analytics, Atlas Search, Atlas Vector Search, change data capture, Kafka and Spark integration, Atlas Data Federation, and BI visualization with MongoDB."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# MongoDB Data Engineering and Analytics Syllabus

## Overview

This 12-week advanced syllabus is designed for data engineers, analytics engineers, and developers who already understand MongoDB fundamentals and want to build modern analytical and data-intensive systems on top of the document model. Where general MongoDB curricula focus on CRUD, replication, and cluster operations, this course is dedicated entirely to the data engineering and analytics stack: time series collections for sensor and telemetry data, advanced aggregation for analytical queries, Atlas Search for full-text and hybrid retrieval, Atlas Vector Search for AI and semantic workloads, change data capture pipelines, Kafka and Spark connectors, Atlas Data Federation for querying data lakes, and BI visualization with Atlas Charts and the MongoDB BI Connector.

Each module pairs conceptual foundations with hands-on labs using MongoDB Atlas, the MongoDB shell, and real production tools such as Kafka, Spark, Airflow, and Tableau. The curriculum follows the journey of a real-time analytics platform: ingesting high-velocity event streams, storing them efficiently in time series collections, enriching them with search and vector capabilities, transforming them with continuous pipelines, federating them with data lake storage, and finally exposing them through dashboards and SQL-based BI tools. The course culminates in a capstone project that requires designing, building, and operating an end-to-end real-time analytics platform that serves both streaming and historical analytical workloads.

By the end of this course, learners will be able to model time series data with proper bucket granularity and compression, write analytical aggregation pipelines with window functions, deploy Atlas Search and Atlas Vector Search indexes, build change data capture pipelines with Kafka, process MongoDB data with Spark DataFrames, federate queries across MongoDB and object storage, and publish interactive dashboards for business users.

## Curriculum

### Module 1: Data Engineering Foundations with MongoDB (Week 1)

- **MongoDB's role in the modern data platform**
  - Operational (OLTP) vs. analytical (OLAP) workloads and when MongoDB serves each
  - The document model as a schema-flexible foundation for evolving analytics requirements
  - Lakehouse concepts: data lakes, warehouses, and MongoDB's position in the stack
  - Analytics-ready collection design: denormalization, wide documents, and read-optimized shapes

- **Analytical data modeling**
  - Designing collections for query patterns rather than raw entity relationships
  - Embedding precomputed aggregates versus computing on read
  - Star-schema and fact-table concepts translated into document collections
  - Handling slowly changing dimensions with document versioning and `$lookup`

- **Environment setup**
  - Provisioning a MongoDB Atlas cluster (M10+ for dedicated analytics workloads)
  - Connecting with `mongosh`, drivers, and connection string best practices
  - Loading sample datasets (`sample_analytics`, `sample_training`) for lab work
  - Atlas project organization: teams, access lists, and API keys for automation

### Module 2: Time Series Collections (Week 2)

- **Time series collection fundamentals**
  - `timeField`, `metaField`, and `granularity` options
  - How MongoDB buckets measurements automatically and why it saves storage
  - Bucket compression with delta encoding and subsequent writes
  - Comparing time series collections to regular collections for IoT workloads

- **Designing time series schemas**
  - Choosing the right granularity (`seconds`, `minutes`, `hours`) for your data cadence
  - Cardinality of `metaField`: high-cardinality device IDs versus aggregated groups
  - Secondary indexes on `metaField` and measurement fields
  - Query patterns: range queries, downsampling, and aggregation over buckets

- **Operations and migration**
  - Creating time series collections with `mongosh` and drivers
  - Converting existing regular collections to time series format
  - Retention, expiry, and archival strategies for high-volume telemetry
  - Monitoring bucket statistics and rewrite activity

### Module 3: The Aggregation Pipeline for Analytics (Week 3)

- **Analytical aggregation stages**
  - `$match`, `$group`, `$sort`, and `$project` for analytics-shaped queries
  - `$bucket` and `$bucketAuto` for histogram and distribution analysis
  - `$densify` for filling missing time gaps
  - `$fill` for forward-filling and interpolation of missing values

- **Window functions**
  - `$setWindowFields` with `range` and `documents` windows
  - Rolling averages, moving sums, and running totals
  - Ranking, lead/lag, and cumulative distribution functions
  - `$topN`, `$bottomN`, and partitioned top-N analytics

- **Large analytics queries**
  - `allowDiskUse` for sort and group stages that exceed memory limits
  - Splitting heavy pipelines with `$facet` for parallel sub-pipelines
  - Writing pipeline results into collections with `$out` and `$merge`
  - Pipeline performance: index use inside `$match`, projection discipline

### Module 4: Materialized Views and Continuous Transformations (Week 4)

- **On-demand materialized views**
  - Building reusable aggregate views with `createView` and `$merge`
  - Refreshing materialized views and their cost trade-offs
  - Read isolation and consistency for derived collections

- **Continuous aggregation patterns**
  - Incremental ETL with change streams feeding aggregate collections
  - Lambda architecture: batch layer with cron jobs, speed layer with change streams
  - Kappa architecture: unified streaming with change streams only
  - Idempotent updates and deduplication in derived pipelines

- **Data transformation best practices**
  - Cleaning, normalizing, and enriching documents in the pipeline
  - Schema validation for analytics output collections
  - Handling late-arriving and out-of-order events
  - Backfill strategies when transformation logic changes

### Module 5: Atlas Search (Week 5)

- **Atlas Search fundamentals**
  - Lucene-based search indexes and the `$search` aggregation stage
  - Creating search indexes with the Atlas UI and the search index API
  - Analyzers: standard, custom, and language-specific tokenization
  - Index mappings: dynamic vs. static field mappings

- **Search operators**
  - `text` and `phrase` operators for relevance ranking
  - `autocomplete` for type-ahead suggestions
  - `fuzzy` matching and typo tolerance
  - `compound` queries combining must, should, filter, and mustNot clauses
  - `range` and `geo` operators for hybrid search over structured fields

- **Search relevance and UX**
  - Scoring with `$meta: "searchScore"` and `searchScoreDetails`
  - Synonyms mapping for domain vocabulary
  - Highlighting matched terms in results
  - Integrating search with pagination, facets, and filters

### Module 6: Atlas Vector Search and AI Workloads (Week 6)

- **Vector search fundamentals**
  - Embeddings: how text, image, and audio data become vectors
  - Vector index types: `vector`, `vectorSearch`, and index configuration
  - `$vectorSearch` aggregation stage: querying nearest neighbors
  - Similarity metrics: cosine, Euclidean, and dot product

- **Building search and RAG systems**
  - Semantic search over product, document, and knowledge collections
  - Hybrid search: combining Atlas Search keyword ranking with vector similarity
  - Retrieval-augmented generation (RAG) pipelines with MongoDB as the vector store
  - Filtering vector search by metadata fields (`filter` option)

- **Embedding and indexing strategies**
  - Generating embeddings with OpenAI, Cohere, and Hugging Face models
  - Batch embedding and upsert workflows
  - Quantization and memory trade-offs for large vector collections
  - Monitoring vector index build and query latency

### Module 7: Change Data Capture and Streaming Pipelines (Week 7)

- **Change streams as a CDC backbone**
  - Change stream event types and resume tokens
  - `startAtOperationTime` and `startAfter` for replay control
  - Change streams on sharded clusters and per-shard ordering

- **Kafka integration**
  - MongoDB Kafka connector: source and sink modes
  - Publishing change events to Kafka topics with the source connector
  - Consuming Kafka events into MongoDB with the sink connector
  - Topic partitioning strategies tied to change stream resume tokens

- **Streaming pipeline engineering**
  - Debezium-style CDC vs. native MongoDB Kafka connector trade-offs
  - Exactly-once vs. at-least-once delivery semantics in practice
  - Schema registry and Avro/JSON serialization for downstream consumers
  - Monitoring lag, retries, and dead-letter queues

### Module 8: Atlas Data Federation and Data Lake (Week 8)

- **Federated querying**
  - Atlas Data Federation: querying object storage from MongoDB
  - Federated database instances and data sources (AWS S3, Azure Blob, GCS)
  - Querying multiple sources in a single aggregation pipeline
  - `$external` collections and cross-source `$lookup`

- **Online archives and tiered storage**
  - Moving cold data to online archives with automatic policies
  - Querying archived data transparently through the same interface
  - Data lifecycle: hot, warm, and cold tiering with Atlas
  - Cost optimization and retention for high-volume analytics data

- **Data lake patterns**
  - S3-backed lakehouse design with Parquet and JSON sources
  - Querying raw data lakes versus curated collections
  - Replicating MongoDB collections to object storage for analytics
  - Security: federated access controls and data source credentials

### Module 9: BI Integration and Visualization (Week 9)

- **MongoDB BI Connector**
  - SQL access to MongoDB data via the BI Connector
  - ODBC and JDBC drivers for Tableau, Power BI, and Looker
  - Defining schemas (`sample_analytics`) for relational tools
  - Performance considerations when running SQL workloads

- **Atlas Charts**
  - Building charts and dashboards from MongoDB collections
  - Aggregation-powered visualizations and custom encodings
  - Embedded charts in applications with signed embeddings
  - Dashboards for operational monitoring and business KPI tracking

- **Real-time analytics UX**
  - Combining live query panels with materialized aggregates
  - Drill-down hierarchies from dashboard to document detail
  - Sharing, scheduling, and alerting from dashboards
  - Page performance and caching for dashboard-heavy workloads

### Module 10: Data Pipelines with Apache Spark and Kafka (Week 10)

- **MongoDB Spark Connector**
  - Reading MongoDB collections into Spark DataFrames
  - Writing DataFrames and streaming results back to MongoDB
  - Spark SQL over MongoDB data
  - Partitioning and parallelism for large exports

- **Spark processing patterns**
  - Batch ETL: transforming operational collections into analytics collections
  - Structured streaming with MongoDB as a streaming source and sink
  - Joining MongoDB data with other data sources in a single job
  - Checkpointing and fault tolerance for streaming jobs

- **Pipeline orchestration**
  - Scheduling MongoDB ETL jobs with Apache Airflow
  - Orchestrating Kafka topics, Spark jobs, and MongoDB writes
  - Monitoring pipeline health and data freshness
  - CI/CD for pipeline code with automated tests against sample data

### Module 11: Data Quality, Governance, and Observability (Week 11)

- **Data quality engineering**
  - Schema validation rules for analytics and time series collections
  - Profiling datasets: missing values, cardinality, and distribution checks
  - Validation queries and scheduled quality checks
  - Handling quality failures in streaming pipelines (dead-letter queues)

- **Governance and compliance**
  - Data lineage from source events to derived analytics collections
  - PII handling: field-level encryption for sensitive analytics fields
  - Auditing access to analytics data with MongoDB audit logs
  - Retention policies aligned with regulatory requirements

- **Monitoring analytics workloads**
  - `$indexStats`, `explain()`, and profiling for pipeline queries
  - Atlas monitoring: metrics for time series and search workloads
  - Alerting on query latency, vector index build, and ingestion lag
  - Cost observability: storage, archives, and search node sizing

### Module 12: Capstone Project — Real-Time Analytics Platform (Week 12)

- **Project brief**
  - Build an end-to-end analytics platform for a simulated e-commerce or IoT scenario
  - Ingest high-velocity events through Kafka into time series collections
  - Enrich documents with Atlas Search and vector embeddings
  - Expose analytical views through materialized aggregates and BI dashboards

- **Required deliverables**
  - Ingestion pipeline with Kafka source connector producing live chart updates
  - Time series collection tuned for the event cadence
  - Aggregation pipelines for at least five analytical KPIs
  - Hybrid search endpoint returning both keyword and semantic results
  - Data federation query joining object storage with MongoDB data
  - Atlas Charts dashboard embedded in a simple web application
  - Written documentation of architecture decisions and trade-offs

- **Evaluation focus**
  - Correctness of time series modeling and bucket configuration
  - End-to-end freshness: events visible in dashboards within defined latency
  - Search relevance and vector query quality
  - Code quality, pipeline reliability, and monitoring setup

## Final Project

The final project is a real-time analytics platform built in the last two weeks of the course. Learners design a complete data engineering solution for a scenario of their choice — a telemetry system for connected devices, an e-commerce event stream, or a financial transaction monitor. The platform must ingest events through Kafka into MongoDB time series collections, enrich the data with Atlas Search indexes and vector embeddings, build continuous materialized views for KPIs, federate historical queries with an object storage data lake, and visualize results in an Atlas Charts dashboard embedded in a small web app. Learners present a live demo showing streaming data appearing in dashboards, hybrid search returning relevant results, and a documented architecture diagram explaining each pipeline stage.

## Assessment Criteria

- **Assignments**: Nine hands-on lab assignments (one per module from Week 1-11) evaluated on correctness, use of the specific MongoDB feature taught, and code clarity. Weekly quizzes verify conceptual understanding of pipeline stages, index semantics, and connector configurations.
- **Final Project**: Evaluated on end-to-end functionality (ingestion, storage, enrichment, federation, visualization), correctness of time series and vector index design, data freshness and reliability of streaming pipelines, documentation quality, and the live demonstration.
- **Participation**: Peer review of one other learner's pipeline design, focused on architecture trade-offs and operational considerations.

## References

- MongoDB Documentation: Time Series Collections — https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB Documentation: Aggregation Pipeline — https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB Atlas Search Documentation — https://www.mongodb.com/docs/atlas/atlas-search/
- MongoDB Atlas Vector Search Documentation — https://www.mongodb.com/docs/atlas/atlas-vector-search/
- MongoDB Documentation: Change Streams — https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Kafka Connector — https://www.mongodb.com/docs/kafka-connector/current/
- MongoDB Spark Connector — https://www.mongodb.com/docs/spark-connector/current/
- MongoDB Atlas Data Federation — https://www.mongodb.com/docs/atlas/data-federation/
- MongoDB Atlas Charts — https://www.mongodb.com/docs/charts/
- MongoDB BI Connector — https://www.mongodb.com/docs/bi-connector/current/
- MongoDB University: Data Engineering courses — https://learn.mongodb.com/
