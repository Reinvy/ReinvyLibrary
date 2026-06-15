---
title: "MongoDB Query Cheatsheet"
description: "A quick reference guide for MongoDB queries, CRUD operations, aggregation pipelines, indexes, and shell commands."
category: "database"
technology: "mongodb"
difficulty: "beginner"
type: "cheatsheet"
locale: "en"
---

# MongoDB Query Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Connect to database | `mongosh` | Opens the MongoDB shell connected to localhost |
| Connect with URI | `mongosh "mongodb://host:port/db"` | Connects to a specific host and database |
| Show databases | `show dbs` | Lists all databases on the server |
| Use database | `use mydb` | Switches to (or creates) a database |
| Show collections | `show collections` | Lists all collections in the current database |
| Insert one document | `db.collection.insertOne({...})` | Inserts a single document |
| Insert many documents | `db.collection.insertMany([...])` | Inserts multiple documents in an array |
| Find all documents | `db.collection.find()` | Returns all documents in a collection |
| Find with filter | `db.collection.find({ field: value })` | Returns documents matching the filter |
| Find one document | `db.collection.findOne({...})` | Returns the first matching document |
| Update one document | `db.collection.updateOne({filter}, {$set: {...}})` | Updates the first matching document |
| Update many documents | `db.collection.updateMany({filter}, {$set: {...}})` | Updates all matching documents |
| Replace document | `db.collection.replaceOne({filter}, {...})` | Replaces the entire document |
| Delete one document | `db.collection.deleteOne({...})` | Deletes the first matching document |
| Delete many documents | `db.collection.deleteMany({...})` | Deletes all matching documents |
| Count documents | `db.collection.countDocuments({...})` | Returns the count of matching documents |
| Create index | `db.collection.createIndex({field: 1})` | Creates an ascending index on a field |
| Drop collection | `db.collection.drop()` | Removes the entire collection |
| Drop database | `db.dropDatabase()` | Removes the current database |

## Common Commands

### Connecting and Shell Basics

```bash
# Start MongoDB shell
mongosh

# Connect to a remote cluster (Atlas)
mongosh "mongodb+srv://cluster0.xxxxx.mongodb.net/myDB" --username admin

# Run a script file from the shell
mongosh mydb script.js

# Exit the shell
exit
```

### CRUD Operations

```bash
# Create - Insert documents
use bookstore

db.books.insertOne({
  title: "The Great Gatsby",
  author: "F. Scott Fitzgerald",
  year: 1925,
  genres: ["novel", "fiction"],
  inStock: true
})

db.books.insertMany([
  { title: "1984", author: "George Orwell", year: 1949, genres: ["dystopian", "fiction"], inStock: true },
  { title: "To Kill a Mockingbird", author: "Harper Lee", year: 1960, genres: ["fiction", "classic"], inStock: true },
  { title: "Moby Dick", author: "Herman Melville", year: 1851, genres: ["adventure", "classic"], inStock: false }
])
```

```bash
# Read - Query documents

# Find all books
db.books.find()

# Find with equality filter
db.books.find({ author: "George Orwell" })

# Find with projection (only return specific fields)
db.books.find({}, { title: 1, year: 1, _id: 0 })

# Find with comparison operators
db.books.find({ year: { $gt: 1900 } })          # Greater than
db.books.find({ year: { $gte: 1920, $lte: 1960 } })  # Range query

# Find with logical operators
db.books.find({ $or: [{ author: "Orwell" }, { year: { $gt: 1950 } }] })
db.books.find({ $and: [{ inStock: true }, { year: { $lt: 1930 } }] })

# Find with array operators
db.books.find({ genres: { $in: ["dystopian", "adventure"] } })
db.books.find({ genres: { $all: ["fiction", "classic"] } })

# Sort, skip, limit
db.books.find().sort({ year: -1 }).skip(1).limit(2)
```

```bash
# Update - Modify documents

# Update one - set fields
db.books.updateOne(
  { title: "Moby Dick" },
  { $set: { inStock: true, updatedAt: new Date() } }
)

# Update many - increment numeric fields
db.books.updateMany(
  {},
  { $inc: { timesQueried: 1 } }
)

# Push to an array
db.books.updateOne(
  { title: "1984" },
  { $push: { genres: "political" } }
)

# Rename a field
db.books.updateMany(
  {},
  { $rename: { "author": "authorName" } }
)
```

```bash
# Delete - Remove documents

# Delete one document
db.books.deleteOne({ title: "Moby Dick" })

# Delete many documents
db.books.deleteMany({ inStock: false })

# Delete all documents (keep collection)
db.books.deleteMany({})
```

### Indexing

```bash
# Create single field index
db.books.createIndex({ title: 1 })        # Ascending
db.books.createIndex({ year: -1 })        # Descending

# Create compound index
db.books.createIndex({ author: 1, year: -1 })

# Create unique index
db.books.createIndex({ isbn: 1 }, { unique: true })

# Create text index for full-text search
db.books.createIndex({ title: "text", description: "text" })

# List all indexes
db.books.getIndexes()

# Drop a specific index
db.books.dropIndex("title_1")

# Explain query execution
db.books.find({ author: "Orwell" }).explain("executionStats")
```

## Code Snippets

### Aggregation Pipeline

```javascript
// Pipeline stages: $match, $group, $sort, $project
db.books.aggregate([
  { $match: { inStock: true } },
  { $group: { _id: "$authorName", bookCount: { $sum: 1 }, avgYear: { $avg: "$year" } } },
  { $sort: { bookCount: -1 } },
  { $project: { authorName: "$_id", bookCount: 1, avgYear: 1, _id: 0 } }
])

// Using $lookup for joins (MongoDB 3.2+)
db.orders.aggregate([
  {
    $lookup: {
      from: "books",
      localField: "bookId",
      foreignField: "_id",
      as: "bookDetails"
    }
  },
  { $unwind: "$bookDetails" },
  {
    $project: {
      orderId: 1,
      bookTitle: "$bookDetails.title",
      quantity: 1,
      totalPrice: { $multiply: ["$quantity", "$bookDetails.price"] }
    }
  }
])

// $addFields and $out example
db.books.aggregate([
  { $addFields: { decade: { $floor: { $divide: ["$year", 10] } } } },
  { $group: { _id: "$decade", titles: { $push: "$title" } } },
  { $sort: { _id: 1 } },
  { $out: "books_by_decade" }
])
```

### Node.js Driver (Mongoose) Connection

```javascript
const mongoose = require('mongoose');

// Connect to MongoDB
await mongoose.connect('mongodb://localhost:27017/bookstore', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define a schema
const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  author: { type: String, required: true },
  year: { type: Number, min: 0 },
  genres: [String],
  inStock: { type: Boolean, default: true },
  price: { type: Number, min: 0 }
}, { timestamps: true });

// Create a model
const Book = mongoose.model('Book', bookSchema);

// CRUD with Mongoose
const book = await Book.create({ title: 'Dune', author: 'Frank Herbert', year: 1965 });
const books = await Book.find({ year: { $gt: 1900 } }).sort({ year: -1 }).limit(10);
const updated = await Book.findOneAndUpdate(
  { title: 'Dune' },
  { $set: { price: 15.99 } },
  { new: true }
);
await Book.deleteMany({ inStock: false });

// Aggregation with Mongoose
const stats = await Book.aggregate([
  { $group: { _id: '$author', totalBooks: { $sum: 1 }, avgYear: { $avg: '$year' } } },
  { $sort: { totalBooks: -1 } }
]);
```

### Indexing Best Practices

```javascript
// Explain query to check index usage
db.books.find({ author: "Orwell", year: { $gt: 1940 } }).explain("executionStats")

// Create indexes for common query patterns
db.books.createIndex({ author: 1, year: -1 })  // Supports {author: X} and {author: X, year: ...}

// Create TTL index (auto-expire documents)
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 })

// Create geospatial index
db.places.createIndex({ location: "2dsphere" })
db.places.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [-73.97, 40.77] },
      $maxDistance: 1000
    }
  }
})
```
