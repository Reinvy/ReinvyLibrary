---
title: "MongoDB Atlas Cheatsheet"
description: "A quick reference for MongoDB Atlas — cluster lifecycle, database users, network access, cloud backups, monitoring and alerts, Atlas Search, and the Data API using the Atlas CLI, mongosh, and HTTPS."
category: "database"
technology: "mongodb"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# MongoDB Atlas Cheatsheet

## Quick Reference Table

| Action | Command / Code | Description |
|--------|----------------|-------------|
| Log in to the Atlas CLI | `atlas auth login` | Authenticate the CLI against your Atlas organization |
| Verify the active account | `atlas auth whoami` | Show the logged-in user and current project |
| Create a free cluster | `atlas clusters create demo --tier M0 --provider AWS --region ap-southeast-1` | Provision a shared M0 replica set |
| Create a sharded cluster | `atlas clusters create app --tier M30 --shards 3 --type SHARDED` | Deploy a sharded cluster for high scale |
| Get the connection string | `atlas clusters connectionStrings describe demo` | Print the SRV URI for drivers and mongosh |
| Create a database user | `atlas dbusers create --username app --password s3cure --role readWriteAnyDatabase` | Add an application user with a minimal role |
| Allow an IP address | `atlas accessLists create --ip 203.0.113.10` | Whitelist an IP for cluster access |
| List cloud backups | `atlas backups snapshots list demo` | Show available point-in-time snapshots |
| Restore a snapshot | `atlas backups restores start --clusterName demo --deliveryType DOWNLOAD` | Trigger a restore job |
| Create a search index | `atlas search indexes create --clusterName demo --file index.json` | Deploy an Atlas Search index from a JSON definition |
| Inspect cluster metrics | `atlas metrics demo --period PT1H` | View CPU, memory, and connection statistics |
| Configure an alert | `atlas alerts settings create --file alert.json` | Apply a threshold-based alert rule |

## Common Commands

### Project and Organization Management

```bash
# List every project you can access
atlas projects list

# Create a new project
atlas projects create reinvy-prod

# Switch the project context used by later commands
atlas config set project_id 5f7b3c2e9d1a4b6c8d0e1f2a

# Show the current configuration
atlas config list
```

### Cluster Lifecycle

```bash
# Create a shared (M0, M2, or M5) cluster
atlas clusters create atlas-demo --tier M0 --provider AWS --region ap-southeast-1

# Create a dedicated cluster with a custom instance size
atlas clusters create prod-app --tier M30 --provider AWS --region us-east-1 --diskSizeGB 40

# Create a sharded cluster with three shards
atlas clusters create sharded-app --tier M30 --provider AWS --region eu-west-1 --shards 3 --type SHARDED

# List clusters in the current project
atlas clusters list

# Pause and resume a dedicated cluster to control cost
atlas clusters pause prod-app
atlas clusters start prod-app

# Fetch the connection strings for a cluster
atlas clusters connectionStrings describe prod-app

# Delete a cluster (irreversible)
atlas clusters delete prod-app --force
```

### Database Users

```bash
# Create an application user with read/write access
atlas dbusers create --username app --password 's3cure!' --role readWriteAnyDatabase

# Create a read-only user for reporting tools
atlas dbusers create --username reporter --password 'r3ad0nly' --role readAnyDatabase

# Create a user limited to a single database
atlas dbusers create --username shop-api --password 'p4ssw0rd' --role readWrite --database shop

# List, update, and delete users
atlas dbusers list
atlas dbusers update app --password 'n3wpass!'
atlas dbusers delete reporter --force
```

### Network Access (IP Access Lists)

```bash
# Allow access from a single IP address
atlas accessLists create --ip 203.0.113.10 --comment production-server

# Allow a CIDR block
atlas accessLists create --ip 203.0.113.0/24 --comment office-vpn

# Allow access from anywhere (development only — never for production)
atlas accessLists create --ip 0.0.0.0/0 --comment sandbox

# List entries and remove one
atlas accessLists list
atlas accessLists delete 203.0.113.10 --force
```

### Cloud Backups

```bash
# List snapshots for a cluster
atlas backups snapshots list prod-app

# Describe a single snapshot
atlas backups snapshots describe 5f7b3c2e9d1a4b6c8d0e1f2a --clusterName prod-app

# Start a restore job
atlas backups restores start --clusterName prod-app --deliveryType DOWNLOAD

# List current restore jobs
atlas backups restores list prod-app
```

### Monitoring and Alerts

```bash
# Query metrics for the past hour
atlas metrics prod-app --period PT1H

# List all active alerts
atlas alerts list

# Create an alert from a JSON definition (see Code Snippets)
atlas alerts settings create --file alert.json

# List alert configuration rules
atlas alerts settings list
```

### Atlas Search

```bash
# List search indexes for a collection
atlas search indexes list --clusterName atlas-demo --database sample_mflix --collection movies

# Create an index from a JSON definition
atlas search indexes create --clusterName atlas-demo --database sample_mflix --collection movies --file index.json

# Update an index by ID
atlas search indexes update 65f1a2b3c4d5e6f7a8b9c0d1 --clusterName atlas-demo --database sample_mflix --collection movies --file index.json

# Delete an index
atlas search indexes delete 65f1a2b3c4d5e6f7a8b9c0d1 --clusterName atlas-demo --database sample_mflix --collection movies --force
```

## Code Snippets

### Connecting with mongosh

```bash
# Always prefer the SRV connection string
mongosh "mongodb+srv://app:s3cure!@atlas-demo.xxxxx.mongodb.net/shop?retryWrites=true&w=majority"

# Or pass the URI through an environment variable
MONGODB_URI="mongodb+srv://app:s3cure!@atlas-demo.xxxxx.mongodb.net"
MONGODB_URI="$MONGODB_URI/?retryWrites=true&w=majority"
mongosh "$MONGODB_URI"
```

### Atlas Search Index Definition

```json
{
  "name": "movie-autocomplete",
  "searchAnalyzer": "lucene.standard",
  "analyzer": "lucene.standard",
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": { "type": "string", "analyzer": "lucene.english" },
      "year": { "type": "number" }
    }
  }
}
```

### Querying Atlas Search from a Driver

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();

const movies = client.db("sample_mflix").collection("movies");

// Atlas Search runs as the first stage of an aggregation pipeline
const results = await movies
  .aggregate([
    {
      $search: {
        index: "movie-autocomplete",
        autocomplete: { query: "interstel", path: "title" }
      }
    },
    { $limit: 5 }
  ])
  .toArray();

console.log(results.map((m) => m.title));
await client.close();
```

### Writing an Alert Definition

```json
{
  "type": "OUTSIDE_METRIC_THRESHOLD",
  "enabled": true,
  "metricThreshold": {
    "metricName": "CONNECTIONS",
    "operator": "GREATER_THAN",
    "threshold": 500,
    "units": "RAW"
  },
  "notifications": [
    {
      "typeName": "GROUP",
      "intervalMin": 10,
      "emailEnabled": true
    }
  ]
}
```

### Calling the Atlas Data API over HTTPS

```bash
# The Data API exposes REST-style endpoints for each action
curl -X POST "https://ap-southeast-1.aws.data.mongodb-api.com/app/<app-id>/endpoint/data/v1/action/find" \
  -H "Content-Type: application/json" \
  -H "api-key: <data-api-key>" \
  -d '{
    "dataSource": "atlas-demo",
    "database": "shop",
    "collection": "products",
    "filter": { "price": { "$lt": 50 } },
    "sort": { "price": 1 },
    "limit": 10
  }'
```
