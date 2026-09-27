---
title: "PostgreSQL Geospatial Syllabus"
description: "A 12-week specialized curriculum for building location-aware applications and spatial analytics platforms on PostgreSQL with PostGIS — spatial types and indexes, coordinate systems, geocoding, raster and terrain analysis, routing, vector tiles, and production geospatial architecture."
category: "database"
technology: "postgres"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# PostgreSQL Geospatial Syllabus

## Overview

Location is everywhere — ride-hailing, logistics, retail analytics, environmental monitoring, urban planning, and mapping applications all depend on storing, querying, and visualizing spatial data. PostgreSQL, with the PostGIS extension, is the most mature open-source spatial database in existence: it brings the full power of SQL, transactional integrity, and a rich extension ecosystem to geometry and geography processing, and it can serve everything from a GeoJSON API to a global vector-tile map.

This 12-week specialization teaches learners how to design, build, and operate a production-grade geospatial platform on PostgreSQL. It assumes solid PostgreSQL fundamentals and focuses on the spatial side of the stack: modeling geometry and geography types, indexing with GiST, expressing spatial relationships with SQL, working across coordinate reference systems, ingesting real-world datasets such as OpenStreetMap, analyzing raster and elevation data, computing routes with pgRouting, and serving maps through vector tiles. The curriculum is intentionally distinct from generic database courses — every week builds toward the capstone, a location-intelligence platform with a documented architecture and operational runbook.

## Curriculum

### Week 1: Spatial Data Fundamentals and PostGIS Setup
- **The spatial data landscape**
  - Points, lines, and polygons as first-class data types
  - Vector vs raster data models
  - GeoJSON, WKT/WKB, and Shapefile as exchange formats
- **Installing and configuring PostGIS**
  - Enabling the extension and checking the version
  - Spatial database creation and template databases
  - PostGIS configuration parameters (memory, parallel workers)

### Week 2: Geometry and Geography Types
- **The geometry type system**
  - Point, LineString, Polygon, Multi\* and GeometryCollection
  - Z and M dimensions, and when to use them
  - Well-Known Text and Well-Known Binary representations
- **Geometry vs geography**
  - Planar (Euclidean) vs spherical (geodetic) computations
  - Accuracy and performance trade-offs
  - Choosing the right type for a workload

### Week 3: Spatial Indexing and Query Performance
- **How GiST indexes work**
  - Bounding-box approximation and the SP-GiST alternative
  - Indexed vs non-indexed spatial predicates
  - `EXPLAIN` plans for spatial queries
- **Indexing strategies for real workloads**
  - Indexing only the columns used in filters
  - Covering indexes and clustered spatial data
  - Tunables: fill factor, operator classes, and maintenance

### Week 4: Spatial Relationships and Predicates
- **Fundamental spatial predicates**
  - `ST_Intersects`, `ST_Contains`, `ST_Within`, `ST_DWithin`
  - The Dimensionally Extended 9-Intersection Model (DE-9IM)
  - `ST_Relate` and custom relationship matrices
- **Distance and proximity queries**
  - `ST_Distance` and `ST_DWithin` for geofencing
  - Nearest-neighbor searches with `ORDER BY geom <-> point`
  - KNN index acceleration patterns

### Week 5: Advanced Spatial Operations and Analysis
- **Geometric construction and transformation**
  - Buffers, convex hulls, and generated shapes
  - `ST_Union`, `ST_Collect`, and dissolve patterns
  - Clipping with `ST_Intersection` and `ST_Difference`
- **Geometry quality and simplification**
  - `ST_IsValid` and validity repair
  - `ST_Simplify` and topology-aware simplification
  - Snap tolerance and precision reduction

### Week 6: Coordinate Reference Systems and Projections
- **Understanding CRS and SRIDs**
  - Geographic vs projected coordinate systems
  - EPSG codes: WGS84 (4326), Web Mercator (3857), UTM zones
  - Storing and converting with `ST_SRID` and `ST_Transform`
- **Projection decisions in production**
  - When Web Mercator is acceptable and when it is not
  - Area and distance distortion across projections
  - Handling data from mixed sources with different SRIDs

### Week 7: Geocoding and Location Data Ingestion
- **Geocoding and reverse geocoding**
  - PostGIS geocoder and address normalization
  - Parsing street addresses with `normalize_address`
  - Building a geocoding service on top of SQL functions
- **Ingesting real-world datasets**
  - OpenStreetMap extraction with `osm2pgsql` and `osm2pgsql-flex`
  - Loading Shapefile and GeoJSON with GDAL/OGR (`ogr2ogr`)
  - Quality checks: duplicates, null geometries, and out-of-range coordinates

### Week 8: Raster Data and Terrain Analysis
- **The raster type and raster algebra**
  - Loading GeoTIFF rasters and inspecting bands
  - Raster resampling, clipping, and reprojection
  - `ST_MapAlgebra` for pixel-level computation
- **Terrain and elevation analysis**
  - Slope, aspect, and hillshade from elevation models
  - `ST_Clip` and `ST_Reclass` for area extraction
  - Combining raster and vector analysis in one query

### Week 9: Routing and Network Analysis with pgRouting
- **Modeling road networks as graphs**
  - Preparing topologically clean edge tables
  - The `pgr_*` function family overview
  - Dijkstra, A\*, and contraction hierarchies
- **Practical routing applications**
  - Shortest-path and driving-distance queries
  - Isochrones and service-area analysis
  - Turn restrictions, costs, and weights on edges

### Week 10: Vector Tiles and Web Map Integration
- **Generating vector tiles from SQL**
  - `ST_AsMVT` and the MVT tile specification
  - Centerlines, generalized geometries, and tile clipping
  - Caching and tile serving strategies
- **Building the map stack**
  - Serving tiles to MapLibre, Leaflet, or Mapbox GL
  - Database-driven styling and feature attributes
  - Performance budgets: tile sizes, counts, and latency

### Week 11: Geospatial Application Architecture at Scale
- **Spatial patterns for application backends**
  - Geofencing, proximity search, and location clustering
  - Spatiotemporal queries combining time and space
  - Spatial joins at scale and incremental refresh
- **Operations and observability**
  - Vacuum, bloat, and GiST maintenance routines
  - Monitoring spatial query performance
  - Backups, replication, and extension version pinning

### Week 12: Capstone — Location Intelligence Platform
- **Designing an end-to-end location platform**
  - Ingesting a real city-scale dataset (e.g., OpenStreetMap extracts)
  - Building geocoding, geofencing, and proximity APIs
  - Adding a routing service and a vector-tile map layer
- **Delivering and documenting**
  - Load testing spatial endpoints and tuning indexes
  - Writing the architecture and operations runbook
  - Presenting the system design and measured metrics

## Final Project

Learners build a location-intelligence platform for a city of their choice. The platform must ingest a real OpenStreetMap extract, provide a geocoding API (forward and reverse), support geofencing and proximity queries over points of interest, compute driving routes between arbitrary addresses, and render a web map from server-generated vector tiles.

The project is delivered as a working PostgreSQL database with PostGIS and pgRouting extensions, a documented schema and index design, a set of SQL functions or a thin API layer exposing the spatial endpoints, the web map client, performance measurements from load testing, and an operations runbook covering maintenance, backup, and monitoring. Weekly labs feed directly into the capstone, so learners accumulate the components incrementally rather than starting from scratch at the end.

## Assessment Criteria

- **Assignments**: Weekly hands-on labs graded on correctness of SQL spatial queries, appropriate type and SRID choices, index usage visible in query plans, and clear written explanations of design decisions (individual projects, plus short quizzes on spatial fundamentals such as the DE-9IM model and CRS behavior).
- **Final Project**: Evaluated on functional completeness (all specified endpoints and the map layer work end-to-end), technical quality (proper use of GiST indexes, sensible geometry vs geography choices, correct reprojection), performance (documented query latencies under load with evidence of tuning), and documentation quality (schema, runbook, and system-design write-up).

## References

- [PostGIS documentation](https://postgis.net/documentation/)
- [PostGIS workshop](https://postgis.net/workshops/postgis-intro/)
- [pgRouting documentation](https://docs.pgrouting.org/)
- [OpenStreetMap data extracts and tools](https://www.openstreetmap.org/)
- [MapLibre GL JS documentation](https://maplibre.org/maplibre-gl-js/docs/)
- [GDAL/OGR documentation](https://gdal.org/)
