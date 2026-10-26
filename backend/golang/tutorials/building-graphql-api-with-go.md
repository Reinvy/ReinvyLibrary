---
title: "Building a GraphQL API with Go"
description: "Build a schema-first GraphQL API in Go with gqlgen: generated resolvers, dataloaders that remove N+1 queries, JWT identity in the request context, cancellable WebSocket subscriptions, and resolver tests that need no database."
category: "backend"
technology: "golang"
difficulty: "intermediate"
type: "tutorial"
locale: "en"
---

# Building a GraphQL API with Go

## Summary

This tutorial builds a bookstore GraphQL API in Go with gqlgen, starting from `schema.graphqls` and ending with queries, mutations, and WebSocket subscriptions served over `net/http`. You will add per-request dataloaders so nested authors cost one query instead of fifty, gate writes behind JWT identity carried in `context.Context`, and test resolvers with no database running.

## Target Audience

- Backend developers comfortable with `net/http` and `context` who want a typed alternative to REST, plus intermediate developers who have only consumed GraphQL as a client.

## Prerequisites

- Go 1.22 or newer, plus working knowledge of interfaces, goroutines, and `context.Context`.
- GraphQL basics (types, queries, mutations, variables) and `curl` for manual checks.

## Learning Objectives

By the end of this tutorial, you will be able to:

- Generate a type-safe Go server from a schema and explain which generated files you may edit.
- Implement resolvers that delegate to a GraphQL-agnostic service layer.
- Collapse nested reads into batched queries with a per-request dataloader.
- Propagate authenticated identity through context and test without a database.

## Context and Motivation

REST fixes response shapes at design time, so clients either over-fetch or stitch several round trips together. GraphQL lets one request describe exactly the fields needed, including nested relationships: a book list with author names becomes one query, not three calls. The cost is server complexity, and Go's answer is code generation — gqlgen reads your schema, generates an interface your code must satisfy, and refuses to compile when a resolver drifts from the contract. You trade a learning curve for compile-time safety instead of runtime nulls. The pitfall that bites almost every first implementation is the N+1 fan-out below.

## Core Content

### Schema first, and what the generator owns

Design `graph/schema.graphqls` around what the client renders: few root fields, structure in the types. A `gqlgen.yml` maps the schema glob to `graph/generated.go` and resolver stubs, and gqlgen also emits `models_gen.go` for unbound types. Edit only the resolver files; run `go run github.com/99designs/gqlgen generate` after each schema change and commit the output so CI builds do not depend on generator versions.

### Thin resolvers over a service layer

A resolver translates GraphQL arguments into a service call and returns. Business rules live in a `service` package that knows nothing about GraphQL, so the same code can back REST or a CLI. Past roughly fifteen lines, the logic is in the wrong layer.

### Dataloaders and the N+1 trap

`books { author { name } }` resolves `books` once, then `author` once per row. A dataloader collects the IDs requested within one execution tick, issues a single `WHERE id = ANY($1)`, and fans results back out. It must be per-request: a global loader mixes tenants and leaks data across users.

### Auth and subscriptions

HTTP middleware verifies the JWT and stores the user in the request context; resolvers read it, including the subscription resolver before it opens a stream. Skip directive-only authorization, since a directive is easy to forget on a new field. A subscription channel lives as long as the socket, so producers must select on `ctx.Done()` or leak a goroutine per disconnect.

## Code Examples

```graphql
# graph/schema.graphqls
type Query {
    books(first: Int = 20): [Book!]!
}
type Mutation {
    createBook(input: CreateBookInput!): Book!
}
type Subscription {
    bookAdded: Book!
}
type Book {
    id: ID!
    title: String!
    author: Author!
}
type Author {
    id: ID!
    name: String!
}
input CreateBookInput {
    title: String!
    authorID: ID!
}
```

```go
func (r *queryResolver) Books(ctx context.Context, first *int) ([]*model.Book, error) {
    limit := 20
    if first != nil {
        limit = *first
    }
    if limit < 1 || limit > 100 {
        return nil, fmt.Errorf("first must be between 1 and 100, got %d", limit)
    }
    books, err := r.Books.List(ctx, limit)
    if err != nil {
        return nil, fmt.Errorf("list books: %w", err)
    }
    return books, nil
}
```

```go
// graph/loaders.go — one batched query per execution tick
func NewAuthorLoader(repo AuthorRepo) *dataloader.Loader[string, *model.Author] {
    return dataloader.NewBatchedLoader(func(ctx context.Context, ids []string) []*dataloader.Result[*model.Author] {
        authors, err := repo.ByIDs(ctx, ids)
        out := make([]*dataloader.Result[*model.Author], len(ids))
        for i, id := range ids {
            out[i] = &dataloader.Result[*model.Author]{Data: authors[id], Error: err}
        }
        return out
    })
}
```

```go
func (r *subscriptionResolver) BookAdded(ctx context.Context) (<-chan *model.Book, error) {
    events := make(chan *model.Book, 1)
    sub := r.Broker.Subscribe()
    go func() {
        defer close(events)
        defer sub.Close()
        for {
            select {
            case <-ctx.Done():
                return
            case book, ok := <-sub.C():
                if !ok {
                    return
                }
                events <- book
            }
        }
    }()
    return events, nil
}
```

```go
func TestBooksQuery(t *testing.T) {
    srv := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{
        Resolvers: &graph.Resolver{Books: fakeBookRepo{rows: 2}},
    }))
    body := `{"query":"{ books(first: 2) { title } }"}`
    req := httptest.NewRequest(http.MethodPost, "/query", strings.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    rec := httptest.NewRecorder()
    srv.ServeHTTP(rec, req)
    if rec.Code != http.StatusOK {
        t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
    }
}
```

## Key Insights

- Commit generated code. Regenerating in CI hides schema drift inside a failed pipeline instead of a reviewable diff.
- Dataloaders belong in the request context and nowhere else; a shared loader is a cross-tenant data leak, not a cache.
- Clamp `first` in the resolver and add depth and cost limits before launch — GraphQL's flexibility is an amplification vector.
- Check identity where data is exposed, not only in middleware, so new fields cannot bypass authorization.

## Next Steps

- Add persisted queries to shrink payloads and reject arbitrary query shapes.
- Implement cursor pagination once lists outgrow a simple `first` limit.
- Add per-field OpenTelemetry spans and read the Go testing guide for table-driven resolver suites.

## Conclusion

You now have a schema-first GraphQL API where the compiler enforces the contract, nested reads collapse into one batched query, identity flows through context, and subscriptions terminate cleanly on disconnect. Next is the operational layer: cost limits, tracing, and caching — do that before adding more types.
