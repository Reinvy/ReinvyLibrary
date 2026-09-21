---
title: "PostgreSQL pgvector and AI-Powered Search Guide"
description: "A comprehensive guide to semantic search with pgvector — embedding modeling and storage, HNSW and IVFFlat index strategies, similarity queries, hybrid search with full-text ranking fusion, metadata filtering, and production recall and latency evaluation."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# PostgreSQL pgvector and AI-Powered Search Guide

## Introduction

Traditional keyword search breaks down when users do not type the exact words stored in your database. A query for "cheap wireless headphones" does not match a row describing "affordable Bluetooth earbuds" — no token overlaps, no result. Semantic search solves this by comparing the *meaning* of texts instead of their spelling. Each document and each query is converted into an embedding: a fixed-length vector of floating-point numbers that captures meaning in a high-dimensional space, so that semantically similar texts sit close together in that space.

PostgreSQL's **pgvector** extension brings embedding storage, similarity search, and hybrid retrieval directly into your existing database. Instead of operating a separate vector database, you keep vectors in an ordinary column, filter and join them with regular SQL, back them with the same transactions, backups, roles, and monitoring you already use. This guide covers the full production workflow: choosing an embedding model, modeling the `vector` column, building HNSW or IVFFlat indexes, running similarity queries, fusing vector results with full-text search, filtering by metadata, and evaluating recall and latency before you scale.

## Best Practices

### 1. Choose an Embedding Model That Matches Your Data and Index

The embedding model defines the ceiling for search quality, so pick it before you design the schema. Text models return a fixed number of dimensions — `text-embedding-3-small` returns 1536, `text-embedding-3-large` returns 3072, and local models such as `all-MiniLM-L6-v2` return 384. A smaller model is cheaper to run and produces smaller indexes, while a larger model usually captures nuance better. Whatever you pick, **keep the model fixed for the lifetime of the indexed data**: changing models changes the coordinate space, and old rows become incomparable with new rows until you re-embed everything. For multilingual content, prefer a multilingual model and test it on your actual language mix rather than assuming English quality transfers.

### 2. Decide Between HNSW and IVFFlat Based on Workload

pgvector ships two approximate nearest neighbor (ANN) index types with very different trade-offs:

| Index | Memory profile | Build speed | Query latency | Best for |
|-------|----------------|-------------|---------------|----------|
| HNSW | Larger (graph kept largely in memory) | Slower to build | Fast at high recall | Large datasets, low-latency production queries |
| IVFFlat | Smaller (on disk) | Fast to build | Needs tuning (`probes`) | Memory-constrained servers, smaller datasets, batch workloads |

HNSW is the right default for most production search: it delivers high recall at low latency and needs no training data. IVFFlat requires the table to contain data **before** the index is created (it clusters rows into lists) and typically needs `probes` raised above the default for acceptable recall. If your dataset fits comfortably in memory and query latency matters, choose HNSW; if you cannot afford the memory, choose IVFFlat and benchmark `probes` values.

### 3. Keep Filterable Metadata in Relational Columns, Not Inside Vectors

Embeddings capture meaning, not facts. Category, price, tenant ID, and publish status belong in ordinary columns with their own B-tree indexes, not packed into the vector or stored only inside the embedding. Relational columns give you exact `WHERE` filtering, range scans, and partial-index opportunities that vector distance can never provide. When you filter, PostgreSQL applies your B-tree conditions and the ANN index together — keep the filter column set small and selective to avoid scanning many neighbors.

### 4. Plan for Consistency Between Content and Embeddings

An embedding is derived data: whenever the source text changes, the stored vector goes stale. Decide at design time how updates flow: embed in the application at write time (simple and reliable when the model lives behind an API), or maintain a generated `tsvector` column for text search and a background worker for embeddings. On a model upgrade, schedule a backfill that re-embeds every row in batches and rebuilds the index afterward — never mix vectors from two models in one index and expect meaningful results.

### 5. Combine Vector and Keyword Search for Better Recall

Vectors excel at synonyms, paraphrases, and fuzzy concepts; full-text search excels at exact terms, product codes, proper names, and rare tokens. Production search engines run both and merge the results, because each catches matches the other misses. Use reciprocal rank fusion (RRF) or a weighted sum to combine the two ranked lists. Fall back to keyword search when the query contains a term the model was never trained to handle well (IDs, version strings, brand names).

### 6. Benchmark Recall, Latency, and Memory Before Scaling

Do not infer quality from a handful of demo queries. Build a held-out set of realistic queries with known relevant documents, measure recall at top-k, and time queries with `EXPLAIN (ANALYZE, BUFFERS)` to confirm the ANN index is actually used. Then decide whether to raise `hnsw.ef_search`, increase `ivfflat.probes`, or quantize vectors (`halfvec`, `int8`, binary) to cut memory. Monitor index builds with `pg_stat_progress_create_index` and re-check query plans after large data loads.

## Implementation Steps

### Step 1: Install and Enable pgvector

Install the extension with your operating system's package manager, then enable it in the database:

```bash
# Debian/Ubuntu with the PGDG repository (adjust the version to your PostgreSQL)
sudo apt install postgresql-16-pgvector

# Docker
docker run -d --name pg -e POSTGRES_PASSWORD=secret pgvector/pgvector:pg16
```

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify the installed version
SELECT extversion FROM pg_extension WHERE extname = 'vector';
```

Managed services (Amazon RDS, Google Cloud SQL and AlloyDB, Azure Database for PostgreSQL, Supabase, Neon) ship pgvector preinstalled — check the provider's documentation for the exact version, because indexing features like binary quantization require pgvector 0.7 or newer. The `vector` type supports up to 16,000 dimensions on pgvector 0.5+.

### Step 2: Create a Table with a Vector Column

Model the table so the embedding column holds exactly one vector per row and the metadata lives in scannable columns. The dimension `1536` below must match your embedding model's output:

```sql
CREATE TABLE products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  embedding VECTOR(1536),                                  -- matches the model output
  content_tsv TSVECTOR GENERATED ALWAYS AS
    (to_tsvector('english', description)) STORED           -- for hybrid search (Step 6)
);

-- B-tree index for metadata filtering (Step 7)
CREATE INDEX products_category_idx ON products (category);

-- GIN index for full-text ranking (Step 6)
CREATE INDEX products_content_tsv_idx ON products USING gin (content_tsv);
```

A generated `tsvector` column keeps the full-text side in sync automatically, which the hybrid query in Step 6 relies on. If your data is multilingual, replace `'english'` with the appropriate text search configuration, or a custom one built from multiple dictionaries.

### Step 3: Generate and Store Embeddings

Embedding happens outside PostgreSQL, at ingest time. The application calls the embedding provider, then inserts its vector as a string literal that casts to `vector`:

```javascript
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getEmbeddings(texts) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
  });
  const data = await res.json();
  // Sort by index so results stay aligned with the input array
  return data.data.sort((a, b) => a.index - b.index).map((e) => e.embedding);
}

async function insertProduct(product) {
  const [embedding] = await getEmbeddings([product.description]);
  await pool.query(
    `INSERT INTO products (name, description, category, price, embedding)
     VALUES ($1, $2, $3, $4, $5::vector)`,
    [product.name, product.description, product.category, product.price, JSON.stringify(embedding)]
  );
}
```

For bulk backfills, batch the insert with `unnest` to avoid a round trip per row:

```sql
INSERT INTO products (name, description, category, price, embedding)
SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::numeric[], $5::vector[]);
```

Use parameterized queries as shown — never interpolate embedding arrays into SQL strings. Common embedding providers include OpenAI (`text-embedding-3-small`), Cohere, and local options such as Ollama or `sentence-transformers` when data cannot leave your network.

### Step 4: Build an HNSW Index

Create the HNSW index **after** the initial data load, using the distance operator that matches your queries:

```sql
CREATE INDEX products_embedding_hnsw_idx
  ON products
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

The `vector_cosine_ops` operator class indexes cosine distance (`<=>`), which is the default choice for text embeddings. Use `vector_l2_ops` for Euclidean distance (`<->`) or `vector_ip_ops` for inner product (`<#>`), which equals cosine similarity when every vector is normalized. Tuning knobs: higher `m` improves recall at the cost of memory and build time; higher `ef_construction` improves recall at the cost of build time. Monitor long builds with `pg_stat_progress_create_index` rather than guessing.

If you chose IVFFlat instead (memory-constrained server), the table must already contain data, and you pick the number of lists from the row count:

```sql
CREATE INDEX products_embedding_ivfflat_idx
  ON products
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);   -- rule of thumb: ~sqrt(row count)
```

### Step 5: Run Semantic Similarity Queries

Query with `ORDER BY` on the distance operator and `LIMIT` for the top-k. Convert cosine distance back to a similarity score with `1 - distance`:

```sql
-- $1 is the query embedding, e.g. '[...]'::vector
SELECT name, category, price,
       1 - (embedding <=> $1::vector) AS similarity
FROM products
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

```javascript
const query = 'wireless noise cancelling headphones';
const [queryEmbedding] = await getEmbeddings([query]);

const { rows } = await pool.query(
  `SELECT name, category, price,
          1 - (embedding <=> $1::vector) AS similarity
   FROM products
   ORDER BY embedding <=> $1::vector
   LIMIT 5`,
  [JSON.stringify(queryEmbedding)]
);
```

Approximate searches are tunable per session: raise `hnsw.ef_search` (default 40) or `ivfflat.probes` (default 1) for better recall, and use `SET LOCAL` inside a transaction when the setting should apply to a single query:

```sql
BEGIN;
SET LOCAL hnsw.ef_search = 100;
-- run the query
COMMIT;
```

Verify that the planner actually uses the ANN index — an accidental sequential scan silently destroys latency:

```sql
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
SELECT name FROM products ORDER BY embedding <=> $1::vector LIMIT 5;
-- Look for: Index Scan using products_embedding_hnsw_idx
```

### Step 6: Implement Hybrid Search with Full-Text Ranking Fusion

Vector search misses exact tokens and keyword search misses synonyms — run both and fuse the ranked lists with reciprocal rank fusion. This query computes a rank for each candidate in each retrieval path, then sums `1 / (60 + rank)` per document so high positions in either list win:

```sql
WITH vector_hits AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) AS rank
  FROM products
  ORDER BY embedding <=> $1::vector
  LIMIT 100
), text_hits AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank(content_tsv, plainto_tsquery('english', $2)) DESC) AS rank
  FROM products
  WHERE content_tsv @@ plainto_tsquery('english', $2)
  LIMIT 100
), fused AS (
  SELECT id, SUM(1.0 / (60.0 + rank)) AS score
  FROM (
    SELECT id, rank FROM vector_hits
    UNION ALL
    SELECT id, rank FROM text_hits
  ) combined
  GROUP BY id
)
SELECT p.id, p.name, p.category, f.score
FROM fused f
JOIN products p ON p.id = f.id
ORDER BY f.score DESC
LIMIT 10;
```

The constant 60 (the RRF `k`) dampens the influence of low ranks; tune it against your recall evaluation. This query uses the GIN `content_tsv` index and the HNSW index side by side, so both paths stay fast. If one path is clearly dominant for your data, a weighted-sum fusion (`0.6 * vector_score + 0.4 * text_score`) is a simpler, cheaper alternative.

### Step 7: Add Metadata Filtering and Tenant Isolation

Combine ANN search with `WHERE` conditions to scope results — the planner applies the B-tree filter against the candidates the index returns:

```sql
SELECT name, category, price,
       1 - (embedding <=> $1::vector) AS similarity
FROM products
WHERE category = $2
  AND price BETWEEN $3 AND $4
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

For multi-tenant systems, enforce the tenant scope the same way you would for any PostgreSQL query: include `tenant_id` in every predicate (preferably through Row-Level Security) so a missing filter cannot leak data across tenants:

```sql
CREATE POLICY tenant_isolation ON products
  USING (tenant_id = current_setting('app.tenant_id')::bigint);
```

Keep filter selectivity in mind: HNSW traverses the graph and then checks filters, so filters that match only a tiny fraction of rows still scan many neighbors. If one filter combination dominates your workload (for example, "search only in category X"), consider a partial index per hot filter value:

```sql
CREATE INDEX products_hnsw_electronics_idx
  ON products USING hnsw (embedding vector_cosine_ops)
  WHERE category = 'Electronics';
```

### Step 8: Evaluate Recall, Latency, and Tune Indexes

Before going to production, quantify quality and speed:

1. Assemble a test set of 50–100 real user queries with known relevant document IDs.
2. Run each query through the pipeline and compute **recall@k**: the fraction of relevant documents present in the top-k results.
3. Measure p95 latency with `EXPLAIN (ANALYZE, BUFFERS)` under load; confirm index usage and check buffer hit ratios.
4. Raise `hnsw.ef_search` (or `ivfflat.probes`) until recall@10 stops improving, then fix that value as your production setting.

If memory is the bottleneck, shrink the index before adding hardware. pgvector offers quantized storage types that trade a little recall for large memory savings:

```sql
-- halfvec: half-precision floats, roughly half the memory (pgvector >= 0.5)
ALTER TABLE products ADD COLUMN embedding_half halfvec(1536);

-- int8 quantization with binary_quantize() to 1 bit per dimension (pgvector >= 0.7)
CREATE INDEX products_embedding_binary_idx
  ON products USING hnsw ((binary_quantize(embedding)::bit(1536)) bit_hamming_ops);
```

Re-run the recall evaluation after any quantization change — the acceptable recall drop is usually 1–3%, but only measurement confirms it. Finally, schedule the operational loop that keeps search healthy: monitor index bloat, re-embed and rebuild after model upgrades, and alert when p95 latency drifts upward as the dataset grows.
