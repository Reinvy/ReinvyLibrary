---
title: "Building GraphQL APIs with Express and Apollo Server"
description: "This tutorial introduces GraphQL as a powerful alternative to REST APIs and demonstrates how to integrate it into an Express.js application using Apollo Server."
category: "backend"
technology: "expressjs"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building GraphQL APIs with Express and Apollo Server

## Summary

This tutorial introduces GraphQL as a powerful alternative to REST APIs and demonstrates how to integrate it into an Express.js application using Apollo Server. You will learn the core concepts of GraphQL, how to define schemas and resolvers, and how to execute queries and mutations for efficient data fetching.

---

## Target Audience

* **Target pembaca:** Backend developers who are familiar with Express.js and want to learn how to build and implement GraphQL APIs.
* **Level pembaca:** Intermediate.

---

## Prerequisites

Before reading this material, you should ideally understand:

* Basic concepts of Node.js and Express.js (routing, middleware).
* Familiarity with RESTful API concepts.
* Basic understanding of JavaScript and asynchronous programming.

---

## Learning Objectives

Setelah membaca materi ini, pembaca akan memahami:

* The fundamental differences between GraphQL and REST.
* How to set up an Express.js server with Apollo Server for GraphQL.
* How to define a GraphQL Schema (TypeDefs) using the Schema Definition Language (SDL).
* How to implement Resolvers to handle data fetching for queries and mutations.
* How to interact with a GraphQL API using the Apollo Sandbox.

---

## Context and Motivation

In traditional REST APIs, endpoints often return fixed data structures. This can lead to "over-fetching" (receiving more data than needed) or "under-fetching" (needing to make multiple requests to different endpoints to gather necessary data).

GraphQL solves these problems by providing a flexible query language for your API. It allows clients to request exactly the data they need, no more and no less, in a single request. Understanding GraphQL empowers developers to build highly efficient and scalable APIs, especially for modern applications with complex frontend requirements. Integrating Apollo Server with Express is the standard and most robust way to build GraphQL APIs in the Node.js ecosystem.

---

## Core Content

### 1. What is GraphQL?

GraphQL is a query language for your API and a server-side runtime for executing those queries using a type system you define for your data. Unlike REST, which uses multiple URLs to access different resources, GraphQL typically exposes a single endpoint (e.g., `/graphql`). The client sends a query describing the desired shape of the response, and the server returns exactly that.

### 2. Core Concepts: Schema and Resolvers

A GraphQL server is built around two fundamental components:

* **Schema (TypeDefs):** Written in the GraphQL Schema Definition Language (SDL), the schema defines the structure of your data and the operations clients can perform. It acts as a contract between the client and the server.
* **Resolvers:** Resolvers are JavaScript functions that provide the actual logic for fetching the data described in the schema. When a query is executed, Apollo Server calls the corresponding resolvers to populate the response.

### 3. Setting Up Apollo Server with Express

To use GraphQL in Express, we typically use `@apollo/server` along with its Express middleware. The setup involves creating an instance of Apollo Server with your schema and resolvers, starting it, and attaching it to your Express app.

### 4. Queries vs. Mutations

* **Queries:** Used to fetch or read data (similar to `GET` in REST).
* **Mutations:** Used to modify data, such as creating, updating, or deleting records (similar to `POST`, `PUT`, `PATCH`, `DELETE` in REST).

---

## Code Examples

Here is a complete, minimal example of setting up a GraphQL API with Express and Apollo Server.

### Step 1: Install Dependencies

```bash
npm install express @apollo/server graphql cors
```

### Step 2: Implementation

Create an `index.js` file:

```javascript
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import cors from 'cors';

// Sample data
const books = [
  { id: '1', title: 'The Awakening', author: 'Kate Chopin' },
  { id: '2', title: 'City of Glass', author: 'Paul Auster' },
];

// 1. Define the Schema (TypeDefs)
const typeDefs = `#graphql
  type Book {
    id: ID!
    title: String!
    author: String!
  }

  type Query {
    books: [Book]
    book(id: ID!): Book
  }

  type Mutation {
    addBook(title: String!, author: String!): Book
  }
`;

// 2. Define Resolvers
const resolvers = {
  Query: {
    books: () => books,
    book: (_, args) => books.find(book => book.id === args.id),
  },
  Mutation: {
    addBook: (_, args) => {
      const newBook = { id: String(books.length + 1), title: args.title, author: args.author };
      books.push(newBook);
      return newBook;
    },
  },
};

const app = express();

// 3. Initialize Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// 4. Start the server and apply middleware
await server.start();

app.use(
  '/graphql',
  cors(),
  express.json(),
  expressMiddleware(server)
);

app.listen(4000, () => {
  console.log(\`🚀 Server ready at http://localhost:4000/graphql\`);
});
```

When you start this server and navigate to `http://localhost:4000/graphql`, you can use the Apollo Sandbox to run queries like:

```graphql
query GetBooks {
  books {
    title
    author
  }
}
```

---

## Insight Penting

* **Avoid N+1 Problem:** A common pitfall in GraphQL is the N+1 problem, where a query for a list of items results in N additional database queries to fetch related data. Use tools like `DataLoader` to batch and cache database requests.
* **Security:** Since clients can request deeply nested data, malicious users could send complex queries that overwhelm your server. Implement query depth limiting and complexity analysis to protect your API.
* **Error Handling:** GraphQL handles errors differently than REST. A GraphQL response will always return a `200 OK` status code if the request was parsed correctly, even if there are errors during execution. Errors are returned in a specific `errors` array within the response body.
* **When NOT to use GraphQL:** If your API is very simple, entirely public, or if you heavily rely on standard HTTP caching mechanisms, REST might be a simpler and more efficient choice.

---

## Ringkasan Akhir

* GraphQL provides a flexible, client-driven approach to data fetching, solving over-fetching and under-fetching issues common in REST.
* Apollo Server is the standard tool for integrating GraphQL with an Express.js backend.
* The API is defined by a strongly-typed **Schema** and backed by **Resolvers** that execute the actual logic.
* While powerful, GraphQL introduces new challenges like the N+1 problem and specific security considerations that require careful implementation.

---

## Langkah Belajar Berikutnya

* Explore using **DataLoader** to optimize database queries and solve the N+1 problem.
* Learn about implementing **Authentication and Authorization** within GraphQL resolvers.
* Study how to integrate a database like PostgreSQL or MongoDB using an ORM like Prisma within your GraphQL resolvers.
* Understand GraphQL Subscriptions for real-time data updates.

---

## Metadata

* Level: Intermediate
* Topik utama: Express.js, GraphQL
* Topik terkait: API Design, Apollo Server, Node.js
* Kata kunci: graphql, express, apollo server, schema, resolvers, api
* Estimasi waktu baca: 15 menit
