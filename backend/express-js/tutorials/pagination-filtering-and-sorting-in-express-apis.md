---
title: "Judul"
description: "This tutorial covers how to implement pagination, filtering, and sorting in Express.js REST APIs. You will learn techniques to manage large datasets by limiting"
category: "backend"
technology: "express-js"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Judul

Pagination, Filtering, and Sorting in Express APIs

## Summary

This tutorial covers how to implement pagination, filtering, and sorting in Express.js REST APIs. You will learn techniques to manage large datasets by limiting the amount of data sent per request, allowing clients to search for specific records, and organizing the output systematically.

## Target Audience

- **Target Audience:** Intermediate back-end developers building RESTful APIs.
- **Level:** Intermediate.

## Prerequisites

- Solid understanding of Node.js and Express.js basics.
- Experience with REST API design principles.
- Familiarity with retrieving data from a database (SQL or NoSQL).
- Basic understanding of HTTP Query Parameters.

## Learning Objectives

After completing this material, you will be able to:

- Implement pagination using query parameters (`page` and `limit`).
- Add filtering mechanisms to allow clients to query specific subsets of data.
- Enable sorting functionality to order results based on multiple fields.
- Combine pagination, filtering, and sorting into a clean, reusable API structure.
- Understand the performance implications of large datasets and how to optimize database queries.

## Context and Motivation

When your application grows and the database collects thousands or millions of records, returning all that data in a single API response becomes impractical. It consumes excessive memory, bandwidth, and processing time, leading to slow response times and a poor user experience.

By implementing pagination, filtering, and sorting, you give clients the power to fetch exactly what they need in manageable chunks. These features are standard requirements for any robust, production-ready API (like e-commerce product listings or data dashboards).

## Core Content

### 1. Extracting Query Parameters

In Express, query parameters are accessed via the `req.query` object. When a client makes a request like `GET /api/products?page=2&limit=10&sort=price&category=electronics`, Express parses this into a JavaScript object:

```javascript
{
  page: '2',
  limit: '10',
  sort: 'price',
  category: 'electronics'
}
```

### 2. Implementing Pagination

Pagination limits the number of results returned per request. There are two common approaches: Offset-based and Cursor-based. We will focus on Offset-based pagination as it is the most common.

You need two parameters:

- `page`: The current page number (default: 1).
- `limit`: The number of items per page (default: 10).

From these, you calculate the `skip` (or `offset`) value for your database query:
`skip = (page - 1) * limit`

### 3. Implementing Filtering

Filtering allows clients to restrict results based on specific criteria. For instance, filtering products by category or price range.
You iterate over the query parameters and build a query object that your database ORM or driver understands. It is crucial to ignore structural parameters like `page`, `limit`, and `sort` when building the filter.

### 4. Implementing Sorting

Sorting orders the data based on one or more fields. A common pattern is to pass the field name, optionally prefixed with a `-` for descending order (e.g., `sort=-price` or `sort=createdAt`). You parse this parameter and convert it into the format required by your database.

## Code Examples

Here is an example using Express and Mongoose (MongoDB) demonstrating how to combine all three concepts.

```javascript
const express = require('express');
const router = express.Router();
const Product = require('../models/Product'); // Assuming a Mongoose model

router.get('/products', async (req, res) => {
  try {
    // 1. Filtering
    // Copy req.query to avoid mutating the original object
    const queryObj = { ...req.query };

    // Remove structural fields from the filter query
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering (e.g., converting gte, gt, lte, lt to MongoDB operators like $gte)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    let query = Product.find(JSON.parse(queryStr));

    // 2. Sorting
    if (req.query.sort) {
      // Convert 'price,-createdAt' to 'price -createdAt' for Mongoose
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      // Default sorting
      query = query.sort('-createdAt');
    }

    // 3. Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    // Execute the query
    const products = await query;

    // Optional: Get total count for frontend pagination controls
    const total = await Product.countDocuments(JSON.parse(queryStr));

    res.status(200).json({
      success: true,
      count: products.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: products
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
```

## Insight Penting

- **Always Validate Input:** Query parameters are strings. Ensure you parse them to integers for `limit` and `page`, and validate that sorting/filtering fields actually exist in your database schema to prevent injection attacks or errors.
- **Set Maximum Limits:** Never allow clients to request an unlimited number of items (e.g., `limit=10000`). Always enforce a hard maximum limit on the server side to protect your database from resource exhaustion.
- **Cursor vs. Offset:** Offset pagination (`skip`/`limit`) can become slow on very large datasets because the database still has to count and skip the preceding rows. For massive datasets or infinite scroll features, consider Cursor-based pagination.
- **Index Your Database:** Filtering and sorting are expensive operations. Ensure you create database indexes on fields that are frequently used for filtering or sorting.

## Ringkasan Akhir

- `req.query` is used to capture parameters for pagination, filtering, and sorting.
- **Pagination** divides data into manageable chunks using `page` and `limit`.
- **Filtering** dynamically builds database queries to retrieve specific records.
- **Sorting** orders the response data based on client preference.
- Combining these features makes your APIs flexible, performant, and ready for production use.

## Langkah Belajar Berikutnya

- Explore **Cursor-based Pagination** for high-performance applications.
- Learn about caching strategies (like Redis) to store frequently requested, paginated data.
- Read up on [Data Validation and Error Handling in Express](Data%20Validation%20and%20Error%20Handling%20in%20Express.md) to secure your query parameters.

## Metadata

- Level: Intermediate
- Topik utama: Express.js, API Design
- Topik terkait: Database Queries, Pagination, RESTful APIs
- Kata kunci: Express, pagination, filtering, sorting, REST API, query parameters
- Estimasi waktu baca: 10 menit
