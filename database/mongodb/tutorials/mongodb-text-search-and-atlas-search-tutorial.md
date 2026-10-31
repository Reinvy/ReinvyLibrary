---
title: "MongoDB Text Search and Atlas Search Tutorial"
description: "Build full-text search in MongoDB using $text indexes with field weights and relevance scoring, then move to Atlas Search for analyzers, autocomplete, and faceting."
category: "database"
technology: "mongodb"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# MongoDB Text Search and Atlas Search Tutorial

## Summary

This tutorial compares MongoDB's two search engines: the built-in `$text` operator backed by a weighted text index, and Atlas Search, a Lucene engine exposed as the `$search` aggregation stage. You will build relevance-ranked, typo-tolerant product search with autocomplete and facet counts.

## Target Audience

- Backend developers and database engineers adding a search feature to an application running on MongoDB.
- Intermediate level: you already write queries, aggregations, and indexes in `mongosh` and from a driver.

## Prerequisites

- MongoDB 6.0+ locally, or an Atlas cluster (the free M0 tier supports Atlas Search).
- `mongosh` connected to the cluster, plus Node.js 20+ with the `mongodb` driver v6.
- A `shop.products` collection with `name`, `description`, `category`, and `price` fields.

## Learning Objectives

By the end of this tutorial you will be able to:

- Create a compound text index with per-field weights and an explicit language.
- Write `$text` queries with phrases, negation, and relevance sorting via `$meta: "textScore"`.
- Explain why `$text` cannot do fuzzy or prefix matching, and when to switch engines.
- Define an Atlas Search index with explicit field mappings and analyzers.
- Run autocomplete and faceted queries with `$search` and `$searchMeta`.

## Context and Motivation

The usual first attempt at search is a case-insensitive regex, `{ name: /laptop/i }`. It cannot use a B-tree index efficiently, so every request scans the collection, and it has no notion of relevance: a document mentioning "laptop" once ranks the same as one that says it twelve times in the title.

`$text` solves the cheap half of the problem: it tokenizes text, removes stop words, stems terms, and stores an inverted index, so a query matches index terms instead of raw strings — and it returns a score you can sort by. The catch is that it is deliberately simple: no fuzzy matching, no prefix search, no synonyms, no per-query analyzer control. The moment the search box must survive a typo or suggest results while the user types, you need Atlas Search. Knowing where that boundary sits stops you from over-engineering a filter or shipping a search box that fails on the first misspelling.

## Core Content

### How the text index works

A text index stores stemmed, lowercased tokens mapped to document IDs. You may have exactly one text index per collection, but it can cover many fields, including arrays of strings. Tokenization follows `default_language`: `english` drops stop words and stems, while `none` keeps raw tokens — the right choice for SKUs, identifiers, and Indonesian text, where English stemming produces wrong roots. Field weights bias relevance: a match in `title` weighted 10 outranks the same match in `body` weighted 1. Values are integers from 1 to 99,999 and live inside the index, so changing them means a rebuild — settle the weighting before indexing millions of documents.

### Querying with $text

`$text` accepts implicit OR between terms, `"quoted phrases"`, and `-negation`. The options `$language`, `$caseSensitive`, and `$diacriticSensitive` tune matching per query. The predicate must sit at the top level of the filter — never inside `$or` branches — and `hint()` is rejected alongside it. `{ $meta: "textScore" }` projects the relevance score, and sorting by that same expression returns the best matches first.

### Where $text stops

`$text` matches whole tokens. "lap" will not match "laptop", "laptpo" will not match "laptop", and there is no per-clause boost or synonym. The common workaround — application-maintained n-gram fields — multiplies storage and write cost and still ranks worse. That is the point where Atlas Search pays for itself.

### Atlas Search architecture

Atlas Search maintains a separate Lucene index that replicates continuously from the cluster oplog. You query it with `$search` (documents) and `$searchMeta` (counts and facets) as the **first** stage of a pipeline; later stages filter, sort, and project the enriched documents. Because the index is declarative, changing an analyzer is a re-index rather than a code change.

### Analyzers, autocomplete, and faceting

An analyzer decides how text is split and normalized. `lucene.standard` lowercases and splits on word boundaries, `lucene.english` also stems, `lucene.keyword` keeps a value as one token (ideal for tags), and `edgeGram` produces prefixes for type-ahead. Index and search analyzers may differ — an `edgeGram` index with a standard search analyzer is the canonical autocomplete pair. The `autocomplete` operator then provides `tokenOrder: "sequential"` for precision, `"any"` for recall, and `fuzzy: { maxEdits: 1 }` for a single typo. For filters, `$searchMeta` with a `facet` block returns total hits and per-bucket counts in one round trip: string facets need the `stringFacet` index type, numeric facets take explicit boundaries.

## Code Examples

### Weighted text index and $text query

```javascript
// One text index per collection; weights are fixed at build time.
db.products.createIndex(
    { name: "text", description: "text", tags: "text" },
    { weights: { name: 10, tags: 5, description: 1 }, default_language: "english" }
);

// Phrase match, exclude a term, sort by relevance.
db.products.find(
    { $text: { $search: "\"mechanical keyboard\" -refurbished" } },
    { name: 1, price: 1, score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } }).limit(5);

// The winning stage must be TEXT_MATCH, not COLLSCAN.
db.products.find({ $text: { $search: "keyboard" } }).explain("executionStats");
```

### Declaring an Atlas Search index

```json
{
    "mappings": {
        "dynamic": false,
        "fields": {
            "name": [{ "type": "autocomplete", "tokenization": "edgeGram", "minGrams": 3, "maxGrams": 15 }],
            "description": { "type": "string", "analyzer": "lucene.english" },
            "category": { "type": "stringFacet" },
            "price": { "type": "number" }
        }
    }
}
```

Applied with `db.products.createSearchIndex({ name: "default", definition: <body> })`; poll `$listSearchIndexes` until the status is `READY` before querying.

### Autocomplete with filters from Node.js

```javascript
const { MongoClient } = require("mongodb");

async function searchProducts(query, { category, maxPrice = 500, limit = 10 } = {}) {
    const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

    try {
        await client.connect();
        const products = client.db("shop").collection("products");
        // Clauses go in an array: compound must never carry duplicate keys.
        const filters = [{ range: { path: "price", lte: maxPrice } }];
        if (category) {
            filters.push({ equals: { path: "category", value: category } });
        }

        return await products.aggregate([
            { $search: { index: "default", compound: {
                must: [{ autocomplete: {
                    query, path: "name", tokenOrder: "sequential",
                    fuzzy: { maxEdits: 1, prefixLength: 2 }
                } }],
                filter: filters
            } } },
            { $limit: limit },
            { $project: { _id: 0, name: 1, price: 1, score: { $meta: "searchScore" } } }
        ]).toArray();
    } catch (error) {
        console.error("Atlas Search query failed:", error.message);
        throw error;
    } finally {
        await client.close();
    }
}

module.exports = { searchProducts };
```

## Key Insights

- **One text index per collection, many fields inside it.** Weights live in the index, so settle the weighting before the collection grows.
- **`$text` has no prefix or fuzzy matching.** Treat any "search as you type" requirement as an Atlas Search requirement from day one.
- **Check `explain()` for `TEXT_MATCH`.** A regex filter ahead of `$text` forces a collection scan; filter on an indexed scalar field instead.
- **Match the analyzer to the language.** English stemming over Indonesian text destroys recall — use `none` or an ICU analyzer.
- **Keep `minGrams` at 2–3.** Single-character edge grams multiply index size for negligible recall gain.
- **Never start a `$search` pipeline with `$match`.** Atlas Search must come first; scalar filters belong in `compound.filter`.

## Next Steps

- Read the [MongoDB Indexing Strategies tutorial](/database/mongodb/tutorials/mongodb-indexing-strategies) for the structures behind both engines.
- Study the [MongoDB Aggregation Pipeline tutorial](/database/mongodb/tutorials/mongodb-aggregation-pipeline), since `$search` composes with every later stage.
- Explore Atlas synonyms, ICU folding analyzers, and `$vectorSearch` for semantic retrieval.

## Conclusion

You now have both halves of MongoDB search working. The `$text` index gives you cheap, well-ranked keyword search with no extra infrastructure; Atlas Search gives you analyzers, typo tolerance, autocomplete, and faceting through ordinary aggregation stages. Choose `$text` when exact tokens are enough and the cluster is self-managed, and Atlas Search when search is a product feature. Either way the ranking is only as good as the index definition, so version the analyzer and weight configuration with your application code.
