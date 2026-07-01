---
title: "PostgreSQL Full-Text Search Tutorial"
description: "A comprehensive tutorial covering PostgreSQL's built-in full-text search engine — from tsvector and tsquery fundamentals to ranking, weighted search, and production deployment."
category: "database"
technology: "postgres"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# PostgreSQL Full-Text Search Tutorial

## Summary

PostgreSQL ships with a powerful, production-grade full-text search engine that can power search features without external dependencies like Elasticsearch or Algolia. This tutorial covers the complete stack — from text normalization with tsvector and query matching with tsquery to ranking relevance, weighted search fields, highlighting, and performance optimization with GIN indexes. You will build a searchable document repository and learn patterns that scale from small blogs to enterprise content systems.

## Target Audience

- Backend developers and database administrators building search features for applications.
- Developers with basic PostgreSQL knowledge who want to replace naive `LIKE` or `ILIKE` queries with proper full-text search.

## Prerequisites

- PostgreSQL 12 or later installed and running.
- Basic familiarity with SQL (CREATE TABLE, INSERT, SELECT).
- Access to a PostgreSQL instance with psql or any SQL client.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Understand the tsvector and tsquery data types and how they model text for search.
- Create GIN indexes to accelerate full-text queries.
- Write search queries using `@@`, `to_tsvector`, and `to_tsquery`.
- Rank search results by relevance with `ts_rank` and `ts_rank_cd`.
- Implement weighted search across multiple fields (title vs body).
- Use `ts_headline` to highlight matching terms in result excerpts.
- Configure language-specific text search dictionaries and thesauri.
- Compare full-text search performance against `ILIKE` pattern matching.

## Context and Motivation

Application search is one of those features that starts simple — a `WHERE title LIKE '%keyword%'` — and quickly becomes a performance and accuracy nightmare. `ILIKE` queries cannot use indexes efficiently with leading wildcards, they can't understand word variants (searching for "run" won't match "running" or "ran"), and they offer no way to rank results by relevance.

PostgreSQL's full-text search (FTS) solves all of these problems natively. It normalizes words to their root forms (lexemes), supports ranked results with weighted fields, and leverages GIN indexes for sub-millisecond search across millions of documents. For many applications — blogs, documentation sites, e-commerce catalogs, knowledge bases — PostgreSQL FTS eliminates the need for a separate search service, reducing operational complexity and cost.

## Core Content

### Understanding tsvector and tsquery

PostgreSQL full-text search is built on two specialized data types:

**tsvector** — A text document broken into normalized tokens (lexemes) with positional information. The input text is parsed, lowercased, stripped of stop words, and each word is reduced to its linguistic root (stemming).

```text
Input:  "The quick brown foxes are jumping over lazy dogs"
Output: 'brown':3 'dog':8 'fox':4 'jump':6 'lazi':7 'quick':2
```

Notice: "foxes" became "fox", "jumping" became "jump", "lazy" became "lazi" (Porter stemming), and stop words like "the" and "are" were removed entirely. Each entry records the word position in the original text.

**tsquery** — A normalized search query expression combining lexemes with boolean operators:
- `&` — AND (both terms must match)
- `|` — OR (either term may match)
- `!` — NOT (term must not match)
- `<->` — FOLLOWED BY (terms appear adjacent in order)
- `<N>` — DISTANCE (terms appear within N words)

```text
Query:  'quick & fox'
Query:  'quick <-> fox'        -- "quick" immediately followed by "fox"
Query:  'quick <2> fox'        -- "quick" within 2 words of "fox"
```

The match operator `@@` tests whether a tsvector satisfies a tsquery:

```sql
SELECT to_tsvector('english', 'The quick brown fox') @@ to_tsquery('english', 'quick & fox');
-- true

SELECT to_tsvector('english', 'The quick brown fox') @@ to_tsquery('english', 'slow | turtle');
-- false
```

### Setting Up a Searchable Document Repository

Let's build a searchable knowledge-base system. Start with a table and populate it with sample articles:

```sql
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'Anonymous',
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    search_vector tsvector
);

INSERT INTO articles (title, body, author) VALUES
('Getting Started with PostgreSQL',
 'PostgreSQL is a powerful open-source relational database system. It supports advanced data types, indexing, and full-text search capabilities.',
 'Alice'),
('Advanced Indexing Strategies',
 'Indexing is crucial for database performance. B-tree, Hash, GiST, GIN, and BRIN indexes each serve different use cases. Understanding when to use each type dramatically improves query performance.',
 'Bob'),
('Full-Text Search in PostgreSQL',
 'PostgreSQL provides built-in full-text search through tsvector and tsquery data types. This feature allows you to implement sophisticated search without external dependencies.',
 'Alice'),
('Database Performance Optimization',
 'Query optimization involves understanding execution plans, proper indexing, connection pooling, and configuration tuning. Regular maintenance like VACUUM and ANALYZE is essential.',
 'Charlie'),
('Introduction to JSON in PostgreSQL',
 'PostgreSQL offers robust JSON support with JSON and JSONB data types. JSONB provides efficient indexing and querying of semi-structured data.',
 'Bob');
```

### Generating the tsvector Column

Manually maintaining the `search_vector` column is error-prone. The recommended approach is a trigger that updates it automatically on every insert or update:

```sql
CREATE OR REPLACE FUNCTION articles_search_update()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_articles_search
    BEFORE INSERT OR UPDATE
    ON articles
    FOR EACH ROW
    EXECUTE FUNCTION articles_search_update();
```

**Why weighted search?** The `setweight` function assigns a weight label (`A`, `B`, `C`, or `D`) to each tsvector fragment. When we query later, matches in the title (weight A) can be ranked higher than matches in the body (weight B). This produces more relevant results.

Apply the trigger to existing rows:

```sql
UPDATE articles SET title = title WHERE search_vector IS NULL;
-- The trigger fires and populates search_vector for every row

SELECT id, title, search_vector FROM articles LIMIT 3;
```

### Creating a GIN Index

Without an index, every full-text search performs a sequential scan. A GIN (Generalized Inverted Index) accelerates `@@` queries dramatically:

```sql
CREATE INDEX idx_articles_search
    ON articles
    USING GIN (search_vector);
```

GIN indexes store each lexeme as a key with pointers to the rows containing it — the same core data structure used by search engines. Queries that previously took tens of milliseconds can complete in sub-millisecond times on properly indexed tables with millions of rows.

### Writing Full-Text Search Queries

Now let's search our articles:

```sql
-- Simple match: find articles containing "indexing"
SELECT id, title
FROM articles
WHERE search_vector @@ to_tsquery('english', 'indexing');

-- Boolean combination: "indexing" AND "performance"
SELECT id, title
FROM articles
WHERE search_vector @@ to_tsquery('english', 'indexing & performance');

-- OR: "database" OR "json"
SELECT id, title
FROM articles
WHERE search_vector @@ to_tsquery('english', 'database | json');

-- Negation: "search" but NOT "json"
SELECT id, title
FROM articles
WHERE search_vector @@ to_tsquery('english', 'search & !json');
```

**Different tsquery constructors:**

```sql
-- to_tsquery: requires pre-processed input with operators
SELECT to_tsquery('english', 'indexing & performance');
-- 'index' & 'perform'

-- plainto_tsquery: converts plain text to tsquery (AND between words)
SELECT plainto_tsquery('english', 'indexing performance');
-- 'index' & 'perform'

-- phraseto_tsquery: converts plain text to phrase search
SELECT phraseto_tsquery('english', 'full text search');
-- 'full' <-> 'text' <-> 'search'
```

For most user-facing search boxes, `plainto_tsquery` is the safest choice because users naturally type space-separated keywords:

```sql
SELECT id, title
FROM articles
WHERE search_vector @@ plainto_tsquery('english', 'database indexing');
```

### Ranking Search Results

Relevance ranking determines which results appear first. PostgreSQL provides two ranking functions:

**`ts_rank`** — Ranks based on term frequency (TF) and inverse document frequency (IDF). Matches in short documents rank higher than matches in long documents.

**`ts_rank_cd`** — Ranks based on cover density: how close the matching terms are to each other. Results where terms appear clustered rank higher.

```sql
SELECT
    id,
    title,
    ts_rank(search_vector, query) AS rank
FROM articles, plainto_tsquery('english', 'database indexing') AS query
WHERE search_vector @@ query
ORDER BY rank DESC;

-- Include body snippet for context
SELECT
    id,
    title,
    ts_rank(search_vector, query) AS rank
FROM articles, to_tsquery('english', 'indexing & performance') AS query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

Because we used `setweight` (title weight A, body weight B), title matches naturally contribute more to the rank. You can also pass normalization options:

```sql
-- Normalize rank by document length (1=divide by length)
SELECT
    id,
    title,
    ts_rank(search_vector, query, 1) AS rank_normalized
FROM articles, plainto_tsquery('english', 'database') AS query
WHERE search_vector @@ query
ORDER BY rank_normalized DESC;
```

### Highlighting Search Matches with ts_headline

Displaying search results with highlighted matching terms improves user experience. The `ts_headline` function generates an excerpt with matching terms wrapped in `<b>` tags:

```sql
SELECT
    id,
    title,
    ts_headline('english', body, query,
        'StartSel = <mark>, StopSel = </mark>,
         MaxWords = 50, MinWords = 20'
    ) AS excerpt
FROM articles, plainto_tsquery('english', 'performance indexing') AS query
WHERE search_vector @@ query
ORDER BY ts_rank(search_vector, query) DESC;
```

Example output for the "Advanced Indexing Strategies" article:

> **Indexing** is crucial for database **performance**. B-tree, Hash, GiST, GIN, and BRIN indexes each serve different use cases. Understanding when to use each type dramatically improves query **performance**.

Customize the highlight markers using the `StartSel` and `StopSel` options. The `MaxWords` and `MinWords` parameters control the excerpt length around the match.

### Prefix Matching and Wildcard Search

Sometimes users type partial words. PostgreSQL full-text search supports prefix matching using the `:*` operator:

```sql
-- Match any word starting with "post"
SELECT id, title
FROM articles
WHERE search_vector @@ to_tsquery('english', 'post:*');

-- Find "performance", "perform", "performing" etc.
SELECT id, title
FROM articles
WHERE search_vector @@ to_tsquery('english', 'perf:*');
```

Note that suffix matching (e.g., `*formance`) is not supported in tsquery. For substring matching you would still need `ILIKE` or trigram indexes with `pg_trgm`.

## Code Examples

### Complete Search Application (Node.js + pg)

This example integrates PostgreSQL full-text search into a Node.js application:

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://user:password@localhost:5432/searchdb'
});

async function searchArticles(keywords, options = {}) {
    const {
        limit = 20,
        offset = 0,
        highlight = true
    } = options;

    const query = `
        SELECT
            id,
            title,
            author,
            published_at,
            ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank
            ${highlight ? `,
            ts_headline('english', body, plainto_tsquery('english', $1),
                'StartSel=<mark>, StopSel=</mark>, MaxWords=60, MinWords=25'
            ) AS excerpt` : ''}
        FROM articles
        WHERE search_vector @@ plainto_tsquery('english', $1)
        ORDER BY rank DESC
        LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [keywords, limit, offset]);
    return result.rows;
}

// Usage
async function main() {
    const results = await searchArticles('database indexing', { limit: 5 });
    console.log(`Found ${results.length} results:`);
    for (const row of results) {
        console.log(`\n  [${row.rank.toFixed(3)}] ${row.title}`);
        if (row.excerpt) console.log(`  > ${row.excerpt}`);
    }
    await pool.end();
}

main().catch(console.error);
```

### Performance Comparison: FTS vs ILIKE

```sql
-- Naive LIKE approach (sequential scan, no index possible with leading %)
EXPLAIN ANALYZE
SELECT * FROM articles
WHERE title ILIKE '%indexing%' OR body ILIKE '%indexing%';

-- Full-text search with GIN index
EXPLAIN ANALYZE
SELECT * FROM articles
WHERE search_vector @@ plainto_tsquery('english', 'indexing');
```

On a table with one million documents, the FTS query with a GIN index typically completes in under 2 milliseconds. The `ILIKE` query with a leading `%` wildcard requires a full sequential scan and can take tens of seconds.

### Language-Specific Search Configurations

PostgreSQL supports many languages out of the box. Each language has its own stemming rules and stop words:

```sql
-- Create a table with language-specific search
CREATE TABLE multilingual_docs (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    lang TEXT NOT NULL DEFAULT 'english',
    search_vector tsvector
);

-- Trigger supporting multiple languages
CREATE OR REPLACE FUNCTION multilingual_search_update()
RETURNS trigger AS $$
DECLARE
    config regconfig := NEW.lang::regconfig;
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector(config, COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector(config, COALESCE(NEW.content, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Query with language-appropriate stemming
SELECT id, title, lang
FROM multilingual_docs
WHERE search_vector @@ plainto_tsquery('indonesian', 'optimasi basis data');
```

Available language configurations include: `english`, `indonesian`, `simple`, `french`, `german`, `spanish`, `dutch`, `italian`, `russian`, `arabic`, `turkish`, `hindi`, `japanese`, `korean`, and many more.

## Key Insights

- **GIN indexes are essential** for full-text search performance at scale. Without them, every query does a sequential scan. Create a GIN index on the tsvector column as soon as you add full-text search to a table.

- **Weighted search dramatically improves result quality.** Assign weight A to titles, weight B to headings or summaries, and weight C to body text. This ensures that a title match appears above a body match.

- **Use `plainto_tsquery` for user-facing search boxes.** It handles raw user input safely and converts it to a tsquery with AND operators between all terms. Using `to_tsquery` directly risks errors when users type special characters or boolean operators.

- **Separate search_vector storage is the norm.** While you can compute `to_tsvector()` on the fly in queries, storing the precomputed vector in a column with a trigger is faster for write-heavy workloads and avoids recomputation on every search.

- **Combine FTS with other PostgreSQL features.** Use `ts_headline` for result highlighting, materialized views for aggregated search indexes across joined tables, and partial GIN indexes to filter searches by tenant or category.

- **Monitor index size.** GIN indexes on tsvector columns can grow large (30-50% of the source text size). Factor this into your storage planning for large datasets.

## Next Steps

- Explore the [PostgreSQL Performance Tuning Guide](../guides/postgresql-performance-tuning-guide.md) to optimize your search queries further.
- Learn about [PostgreSQL Table Partitioning](../tutorials/postgresql-table-partitioning-and-lifecycle-management.md) to manage large-scale search indexes.
- Consider the [PostgreSQL Syllabus](../syllabi/postgresql-syllabus.md) for a structured learning path covering all major PostgreSQL features.
- For very high-throughput search requirements, investigate Elasticsearch or Meilisearch as dedicated search engines.

## Conclusion

PostgreSQL's built-in full-text search is a powerful, production-ready feature that eliminates the need for external search services in many applications. By mastering tsvector/tsquery data types, GIN indexing, weighted ranking, and result highlighting, you can implement sophisticated search functionality entirely within your database. This reduces architectural complexity, operational overhead, and cost while leveraging PostgreSQL's reliability and ACID guarantees.
