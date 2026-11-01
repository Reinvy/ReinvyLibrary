---
title: "Building Semantic Search and RAG Pipelines with MongoDB Atlas Vector Search"
description: "Learn how to index embeddings in MongoDB Atlas, query them with $vectorSearch, fuse lexical and semantic retrieval, and feed the results into a retrieval-augmented generation pipeline."
category: "database"
technology: "mongodb"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building Semantic Search and RAG Pipelines with MongoDB Atlas Vector Search

## Summary

This tutorial builds a production-shaped semantic search layer on top of MongoDB Atlas Vector Search. You will store embeddings next to your existing documents, define a vector search index with filter fields, query it with the `$vectorSearch` aggregation stage, fuse the results with a lexical Atlas Search pass, and wire the fused candidates into a retrieval-augmented generation (RAG) endpoint backed by a language model. The final outcome is a working Node.js service that answers questions about your own corpus and cites the documents it used.

## Target Audience

- Backend and data engineers who already operate MongoDB in production and want to add semantic retrieval.
- Application developers building AI features who need to understand what happens between an embedding model and a prompt.
- Platform engineers evaluating whether to keep vectors in MongoDB or bolt on a dedicated vector database.

## Prerequisites

- Working knowledge of MongoDB documents, aggregation pipelines, and indexes.
- Node.js 20 or newer with npm, and a MongoDB Atlas cluster on version 7.0 or later (Vector Search requires Atlas; it is not available in vanilla `mongod`).
- Familiarity with calling an embeddings API (OpenAI, Voyage, Cohere, or a self-hosted model) and comfort reading JSON index definitions.
- An Atlas project where you can create search indexes, plus the connection string for a database user.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Explain how Atlas Vector Search stores and traverses embeddings, and when approximate search is accurate enough.
- Define a vector search index that includes filter fields so you can scope queries by tenant, locale, or visibility.
- Write `$vectorSearch` stages with `numCandidates`, `limit`, and pre-filters, and interpret the returned relevance score.
- Chunk documents at sensible boundaries and store chunk-level embeddings without duplicating source metadata.
- Combine lexical and semantic retrieval into a single ranked candidate set.
- Assemble retrieved chunks into a grounded prompt and return citations from a Node.js API.

## Context and Motivation

Full-text search matches tokens. If a user asks "how do I stop my cluster from timing out during a reindex", a lexical index finds documents containing those exact words and nothing else. A document titled "Connection pool exhaustion during maintenance windows" answers the question perfectly but shares almost no tokens with it. Embeddings close that gap: they map text into a vector space where meaning, not spelling, determines proximity.

The usual first instinct is to add a dedicated vector database next to MongoDB. That introduces a second source of truth, a second backup and access-control story, and a synchronization job that inevitably drifts. Atlas Vector Search keeps vectors in the same collection as the documents they describe, so filters, transactions, and access rules behave exactly as they already do. For most application-scale corpora, that operational simplicity is worth more than the last few percentage points of recall that a specialized engine might offer.

The second motivation is grounding. Large language models hallucinate when they answer from parametric memory alone. Retrieval-augmented generation constrains the model to a candidate set you control, and citations make the answer auditable. Vector search is the retrieval half of that contract; this tutorial treats it as a data problem first and a prompt problem second.

## Core Content

### Why lexical search hits a ceiling

BM25-style scoring rewards rare term overlap. It has no notion of paraphrase, translation, or synonymy unless you hand-maintain those relationships in analyzers and synonym lists. Three failure modes recur in practice:

- Vocabulary mismatch: the user says "timeout", the document says "pool exhaustion".
- Cross-lingual queries: the corpus is in English, the query arrives in Indonesian.
- Conceptual queries: "what should I monitor on a sharded cluster" has no single canonical phrasing in the corpus.

Embeddings address all three because the query and the document are compared in a learned space rather than by token intersection. They introduce their own failure mode, though: embeddings are weak at exact identifiers, error codes, and product names. That asymmetry is why mature systems run both retrievers and fuse the results rather than replacing one with the other.

### How Atlas Vector Search works

Atlas Vector Search builds an index over a field that holds an array of numbers. At query time the `$vectorSearch` stage must be the first stage in the pipeline, and it returns documents annotated with a relevance score.

Two index types matter:

- `vector` (Hierarchical Navigable Small World, or HNSW): approximate nearest neighbor search. Fast and accurate at scale, but it explores a graph rather than every document, so recall is slightly below 100 percent.
- `filter` fields declared alongside the vector: scalar or boolean fields that Atlas indexes so that pre-filtering does not require a full scan.

The approximate nature of HNSW is the single most important mental model to hold. `numCandidates` controls how many candidates the graph traversal collects before ranking; a larger value trades latency for recall. A tiny `numCandidates` with a restrictive filter is the classic cause of "my document exists but never shows up".

### Choosing an embedding model and dimensions

The index has a fixed number of dimensions, and it must match the model that produced your vectors. Changing models later means re-embedding the corpus, so treat the choice as a schema decision:

- Dimensions: 384 to 1536 is the practical range. Larger vectors cost more memory and slow traversal; smaller ones lose nuance.
- Symmetry: some models are trained for symmetric similarity (document to document), others for asymmetric retrieval (short query to long passage). Retrieval models are the correct choice for RAG.
- Cost and latency: hosted APIs are convenient; a self-hosted model keeps data on your infrastructure.
- Normalization: if the model emits normalized vectors, cosine and dot product produce identical rankings.

Store the model name and the embedding version in each chunk document. Without that metadata, a partial re-embedding leaves you unable to tell which vectors are stale.

### Designing the vector index

A vector search index definition is JSON with three parts: the vector field and its dimensions, the similarity function, and the filter fields.

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    },
    { "type": "filter", "path": "tenantId" },
    { "type": "filter", "path": "locale" },
    { "type": "filter", "path": "visibility" },
    { "type": "filter", "path": "sourceType" }
  ]
}
```

Every field you filter on must be declared. Filtering on an undeclared field is not an error, it simply has no index support and degrades into post-filtering that can silently starve your result set.

### Writing the `$vectorSearch` stage

The stage takes the query vector, the index name, the path to the vector field, the candidate pool size, and the number of results.

```javascript
{
  $vectorSearch: {
    index: "chunk_embeddings",
    path: "embedding",
    queryVector: queryEmbedding,
    numCandidates: 200,
    limit: 20,
    filter: { tenantId: "acme", visibility: { $in: ["public", "internal"] } }
  }
}
```

Three rules of thumb govern tuning:

1. `limit` is what you actually return; `numCandidates` is what the graph explores. Keep a ratio around 10 to 20 for a healthy recall and latency balance.
2. Filters are applied inside the index scan, so restrictive filters need larger `numCandidates` to fill the same `limit`.
3. Follow `$vectorSearch` with `$project` or `$set` to drop the raw embedding from the response. Returning 1024 floats per hit wastes bandwidth and leaks model internals.

### Chunking strategy for long documents

Embedding a whole article blurs its content into an average. Chunk first, embed each chunk, and keep a pointer to the parent:

- Target 200 to 500 tokens per chunk with 10 to 20 percent overlap, so a sentence split across a boundary still appears intact somewhere.
- Prefer structural boundaries: headings, list items, function blocks. Falling back to fixed windows only when structure is absent.
- Denormalize what you filter on. Store `tenantId`, `sourceId`, `locale`, and `url` on every chunk so retrieval never needs a lookup before filtering.
- Keep the parent text addressable by `sourceId` and chunk ordinal, so a citation can deep-link to the right section.

Chunking choices dominate retrieval quality more than the choice of embedding model. Teams routinely swap models looking for better answers when the real problem is 4000-token chunks that average five unrelated topics.

### Hybrid retrieval and rank fusion

Lexical and semantic retrievers fail in different directions, which is exactly why fusing them works. Reciprocal rank fusion (RRF) is the pragmatic default because it needs no score calibration between two incomparable scales:

- Each retriever returns an ordered list.
- A document's fused score is the sum over retrievers of one divided by a constant plus its rank.
- The constant, conventionally 60, dampens the influence of top ranks so a single retriever cannot dominate.

MongoDB 8.1 and later also exposes `$rankFusion` in the aggregation framework, which performs the same fusion server-side. Doing it in application code is still a reasonable choice when your retrievers live in different systems or when you want to inspect intermediate lists.

### Wiring retrieval into a RAG prompt

Retrieval produces candidates; a prompt turns them into an answer. Three constraints keep the prompt honest:

- Number the chunks and instruct the model to cite chunk identifiers rather than inventing URLs.
- Cap the context budget explicitly. Ten chunks at 400 tokens is 4000 tokens of context; more is not better when the tail is irrelevant.
- Require an explicit "insufficient context" answer. Without it, models fill gaps from parametric memory and the citations become decorative.

Deduplicate by `sourceId` before assembling context. Five chunks from one document crowd out four other documents and bias the answer toward a single source.

## Code Examples

### Defining the vector search index with the Atlas Admin API

Create the index programmatically so it is reproducible across environments.

```bash
curl -X POST \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${ATLAS_GROUP_ID}/clusters/${CLUSTER_NAME}/search/indexes/${DB_NAME}/${COLLECTION_NAME}" \
  -H "Authorization: Bearer ${ATLAS_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "chunk_embeddings",
    "type": "vectorSearch",
    "definition": {
      "fields": [
        { "type": "vector", "path": "embedding", "numDimensions": 1024, "similarity": "cosine" },
        { "type": "filter", "path": "tenantId" },
        { "type": "filter", "path": "locale" },
        { "type": "filter", "path": "visibility" }
      ]
    }
  }'
```

The index builds asynchronously. Poll the index listing endpoint until the status reports `READY`; queries issued against a building index return errors rather than empty results.

### Ingesting chunks and generating embeddings

This script chunks Markdown by heading, embeds each chunk, and upserts with a deterministic key so re-runs are idempotent.

```javascript
import { MongoClient } from "mongodb";
import crypto from "node:crypto";

const EMBED_MODEL = "voyage-3-large";
const EMBED_VERSION = 1;

function chunkMarkdown(text, maxChars = 1600) {
  const sections = text.split(/\n(?=#{1,3} )/);
  const chunks = [];

  for (const section of sections) {
    if (section.length <= maxChars) {
      chunks.push(section.trim());
      continue;
    }
    const overlap = Math.floor(maxChars * 0.15);
    for (let i = 0; i < section.length; i += maxChars - overlap) {
      chunks.push(section.slice(i, i + maxChars).trim());
    }
  }
  return chunks.filter((chunk) => chunk.length > 80);
}

async function embed(inputs) {
  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs, input_type: "document" })
  });
  const payload = await response.json();
  return payload.data.map((item) => item.embedding);
}

export async function ingest({ client, tenantId, sourceId, url, text, locale = "en" }) {
  const chunks = chunkMarkdown(text);
  const vectors = await embed(chunks);
  const collection = client.db("docs").collection("chunks");

  const operations = chunks.map((chunk, ordinal) => ({
    updateOne: {
      filter: { _id: `${sourceId}#${ordinal}` },
      update: {
        $set: {
          tenantId,
          sourceId,
          url,
          locale,
          ordinal,
          text: chunk,
          visibility: "internal",
          embedding: vectors[ordinal],
          embedModel: EMBED_MODEL,
          embedVersion: EMBED_VERSION,
          updatedAt: new Date()
        }
      },
      upsert: true
    }
  }));

  return collection.bulkWrite(operations, { ordered: false });
}
```

Note that `input_type` differs between documents and queries in asymmetric retrieval models. Embedding queries as documents in one and passages in the other measurably hurts recall, and the failure is silent.

### Querying with filters and a score threshold

```javascript
export async function semanticSearch({ client, tenantId, queryVector, limit = 20 }) {
  const collection = client.db("docs").collection("chunks");
  return collection
    .aggregate([
      {
        $vectorSearch: {
          index: "chunk_embeddings",
          path: "embedding",
          queryVector,
          numCandidates: 200,
          limit,
          filter: { tenantId, visibility: { $in: ["public", "internal"] } }
        }
      },
      {
        $project: {
          _id: 1,
          text: 1,
          url: 1,
          sourceId: 1,
          ordinal: 1,
          score: { $meta: "vectorSearchScore" }
        }
      },
      { $match: { score: { $gte: 0.72 } } },
      { $limit: limit }
    ])
    .toArray();
}
```

The `$meta: "vectorSearchScore"` projection is the only way to read the score. Thresholds are model specific: calibrate on a labeled sample rather than copying a number from a blog post, because a 0.72 cosine score means different things for different models.

### Fusing lexical and semantic results in application code

```javascript
const RRF_K = 60;

function fuseRankings(lists, limit = 10) {
  const scores = new Map();
  const payloads = new Map();

  lists.forEach((list) => {
    list.forEach((doc, index) => {
      const key = doc._id;
      const contribution = 1 / (RRF_K + index + 1);
      scores.set(key, (scores.get(key) ?? 0) + contribution);
      if (!payloads.has(key)) payloads.set(key, doc);
    });
  });

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, score]) => ({ ...payloads.get(key), fusedScore: score }));
}

export async function hybridSearch({ client, tenantId, query, queryVector }) {
  const [semantic, lexical] = await Promise.all([
    semanticSearch({ client, tenantId, queryVector, limit: 40 }),
    client
      .db("docs")
      .collection("chunks")
      .aggregate([
        {
          $search: {
            index: "chunk_lexical",
            compound: {
              must: [{ text: { query, path: "text" } }],
              filter: [{ equals: { path: "tenantId", value: tenantId } }]
            }
          }
        },
        { $limit: 40 },
        { $project: { _id: 1, text: 1, url: 1, sourceId: 1, ordinal: 1 } }
      ])
      .toArray()
  ]);

  return fuseRankings([semantic, lexical]);
}
```

Run the two retrievers concurrently. Sequentially awaiting them doubles latency for no benefit, since neither depends on the other.

### Assembling a grounded prompt and returning citations

```javascript
import express from "express";

const app = express();
app.use(express.json());

function buildContext(chunks, maxChars = 12000) {
  const seen = new Set();
  const blocks = [];
  let used = 0;

  for (const chunk of chunks) {
    if (seen.has(chunk.sourceId)) continue;
    const block = `[${blocks.length + 1}] source: ${chunk.url}\n${chunk.text}`;
    if (used + block.length > maxChars) break;
    seen.add(chunk.sourceId);
    blocks.push(block);
    used += block.length;
  }
  return blocks;
}

app.post("/answer", async (req, res) => {
  const { query, tenantId } = req.body;
  const queryVector = await embedOne(query);
  const candidates = await hybridSearch({ client, tenantId, query, queryVector });
  const blocks = buildContext(candidates);

  if (blocks.length === 0) {
    return res.json({ answer: "No indexed content matched this question.", citations: [] });
  }

  const completion = await chat({
    system:
      "Answer using only the numbered sources. Cite them as [n]. " +
      "If the sources do not contain the answer, say so explicitly.",
    user: `Sources:\n\n${blocks.join("\n\n")}\n\nQuestion: ${query}`
  });

  res.json({
    answer: completion,
    citations: candidates
      .filter((_, index) => index < blocks.length)
      .map((chunk) => ({ url: chunk.url, sourceId: chunk.sourceId, ordinal: chunk.ordinal }))
  });
});

app.listen(3000);
```

The `buildContext` helper both deduplicates by source and enforces the character budget, which keeps the token count predictable as the corpus grows.

## Key Insights

- Retrieval quality is decided at ingestion: chunk size, overlap, and filter-field denormalization matter more than swapping embedding models.
- Declare every filter field in the index definition; undeclared filters degrade into post-filtering that starves result sets without raising an error.
- Tune `numCandidates` against a labeled query set instead of guessing. Restrictive filters need a larger candidate pool to reach the same `limit`.
- Hybrid beats pure semantic on identifiers, error codes, and product names, while pure semantic beats lexical on paraphrase and cross-lingual queries. Keep both.
- Fuse with reciprocal rank fusion rather than adding raw scores. Cosine similarity and BM25 live on incomparable scales, and naive addition lets whichever retriever has larger numbers dominate.
- Version every embedding. Store model name and version per chunk so a partial re-embedding is detectable instead of corrupting recall invisibly.
- Cap the context budget and deduplicate by source, otherwise one verbose document monopolizes the prompt and biases the answer.
- Never strip the "insufficient context" instruction from the system prompt; without it, citations become decoration over hallucinated prose.

## Next Steps

- Evaluate retrieval quality with a labeled query set and measure recall at 10 for each retriever and for the fused result.
- Add an automated re-embedding job keyed on `embedVersion` so a model upgrade rolls out gradually instead of in one risky rewrite.
- Explore `$rankFusion` in MongoDB 8.1 and later to move fusion server-side and shrink the application payload.
- Study the Atlas Search analyzers material to sharpen the lexical half of the hybrid pipeline.
- Read the MongoDB Text Search and Atlas Search tutorial in this repository for the lexical retriever in depth, and the advanced MongoDB syllabus for the broader data-engineering path.

## Conclusion

Atlas Vector Search turns MongoDB into a workable retrieval layer without introducing a second database: embeddings live beside the documents they describe, filters reuse the security model you already have, and `$vectorSearch` composes with the aggregation framework you already know. The parts that decide whether the feature feels intelligent are less glamorous than the model choice — chunk boundaries, declared filter fields, a calibrated candidate pool, and a fused ranking that keeps lexical precision alongside semantic recall. Build retrieval first, measure it against real questions, and only then let the prompt layer take credit for the result.
