# Architecture & System Design Document

## 1. Architectural Philosophy: Ingestion-First & Database-First

A fundamental design requirement of the **Ontario Economic & Business Intelligence Platform** is strict isolation of operational read paths from external upstream services. 

### Why Database-First?
1. **Zero Runtime Upstream Latency**: External government statistical portals (Statistics Canada SDMX API, Ontario Open Data, SEDAR+) can experience rate limits, intermittent downtime, or slow multi-second response times.
2. **Immutable Reproducibility**: Economic and feasibility analyses require consistent datasets. Dynamic upstream changes must be controlled via deterministic, logged ingestion jobs (`ingestion_runs`), not ad-hoc per-request scraping.
3. **Complex Analytical Joins**: Calculating multi-attribute similarity distances, cross-municipal percentiles, and opportunity scores across 444 municipalities requires relational joins and SQL indexes that cannot be performed over REST APIs.

---

## 2. 3-Layer Data Architecture

```
Layer 1: Raw Ingestion Layer
  ├── External Adapters (SDMX, CSV, GeoJSON, Overpass)
  ├── raw_ingestion_records (JSONB payloads, checksums, HTTP ETags)
  └── ingestion_runs (execution duration, status, records processed)
         │
         ▼
Layer 2: Normalized Relational Core
  ├── geographies (444 CSDs, CDs, CMAs, PROVINCE)
  ├── geographic_aliases (normalized search aliases, accents, CSD types)
  ├── sources & source_capabilities (authorized scopes and resolutions)
  ├── datasets (catalog codes, release dates, stale thresholds)
  ├── metrics_definitions (metadata, formulas, units, limitations)
  ├── observations (normalized EAV structure with resolutions and confidence)
  ├── census_demographics (ethnic origins & visible minorities)
  ├── census_workforce (NOC occupations & NAICS industries)
  ├── municipal_finances (Ontario FIR departmental schedules)
  ├── household_expenditures (SHS consumption categories)
  ├── wealth_benchmarks (SFS assets, debts, net worth)
  ├── business_categories & businesses (OSM physical locations)
  ├── business_listings (commercial transactions & repeated listing detection)
  └── commercial_real_estate (lease rates & vacancy)
         │
         ▼
Layer 3: Derived Analytics & Simulation
  ├── derived_analytics (precomputed means, medians, IQR bounds, z-scores, percentiles)
  ├── data_coverage_reports (attribute completeness and confidence rationale)
  └── revenue_benchmark_chains (lineage traces linking to SEDAR and StatCan)
```

---

## 3. Database Schema Structure

The database consists of **33 normalized relational tables** applied to PostgreSQL 16 (`ontario_economic_intelligence`):

1. `geographies`: Primary spatial units (444 CSDs, Census Divisions, CMAs, Province of Ontario `PR_35`).
2. `geographic_aliases`: Comprehensive search index supporting alternative spellings and administrative prefixes.
3. `sources`: Authoritative organizations (Statistics Canada, Ontario MMAH, OpenStreetMap, SEDAR+).
4. `source_capabilities`: Explicit authorized scopes and geographic resolutions per source.
5. `datasets`: Audited catalogue tables, release dates, and staleness parameters.
6. `ingestion_runs`: Execution logs tracking bootstrap and sync runs.
7. `raw_ingestion_records`: Raw payload store preserving original responses.
8. `metrics_definitions`: Canonical dictionary of economic, demographic, and fiscal indicators.
9. `observations`: Unified entity-attribute-value time series records with confidence labels.
10. `observation_history`: Temporal change ledger preserving previous values and delta timestamps.
11. `census_demographics`: Disaggregated ethnocultural, housing stock, and 9 statutory age cohorts.
12. `census_workforce`: NOC occupations, NAICS industry counts, and Location Quotient (LQ) benchmarks.
13. `municipal_finances`: Ontario FIR Schedule 10/40 operating and capital budget statements.
14. `household_expenditures`: Survey of Household Spending (SHS) consumption categories.
15. `wealth_benchmarks`: Survey of Financial Security (SFS) balance sheet indicators.
16. `business_categories`: 2-digit to 6-digit NAICS business opportunity taxonomy.
17. `category_aliases`: 245+ colloquial business synonyms and provider mappings.
18. `businesses`: Physical commercial locations from OpenStreetMap with element IDs.
19. `business_reviews`: Independent review ratings and sentiment store.
20. `business_listings`: Commercial listings with strict separation of asking vs. confirmed sale price.
21. `business_listing_price_history`: Temporal tracking of asking price reductions and relisting events.
22. `commercial_real_estate`: Retail and office lease rates, NNN costs, and vacancy.
23. `revenue_benchmark_chains`: Verifiable revenue unit economics and public filing links.
24. `derived_analytics`: Precomputed cross-sectional percentiles, z-scores, and rankings.
25. `data_coverage_reports`: 8-dimension statistical completeness evaluations per municipality.
26. `audit_events`: Temporal change detection ledger recording listings, budgets, and dataset updates.
27. `subscriber_watches`: Automated watch criteria with spatial radius and threshold preferences.
28. `watch_notifications`: Single-pass evaluated alert notifications for subscribers.
29. `fuel_prices`: Retail fuel and diesel price monitoring across Ontario market regions.
30. `property_ownership`: Residential and commercial property ownership concentration.
31. `rental_market`: CMHC Rental Market Survey (RMS) vacancy and average rents by bedroom.
32. `requested_insights`: Formal ledger tracking unobserved municipality intelligence requests.
33. `municipal_planning_initiatives`: Official plans, growth corridors, and planning bylaws.

---

## 4. Geographic Resolution Hierarchy

To prevent erroneous conclusions, the system enforces a strict hierarchy:
* `CSD` (Census Subdivision): Municipality, City, Town, Township (444 in Ontario).
* `CD` (Census Division): Regional Municipality, County, District.
* `CMA` (Census Metropolitan Area): Large urban economic agglomerations.
* `PROVINCE`: Ontario provincial totals (`PR_35`).

Whenever a metric is unavailable at the `CSD` level (e.g. Survey of Household Spending or Survey of Financial Security), the system displays the `CMA` or `PROVINCE` benchmark with an explicit, high-visibility resolution badge and disclaimer.

---

## 5. Subsystem Architecture

### 5.1 Streaming Ingestion Benchmark Subsystem
* **StatCan 98-401-X2021001**: Streams bulk municipal census profiles sequentially with `crlfDelay` reader.
* **Throughput**: >400,000 rows/sec with peak RAM capped at 114 MB.
* **Query Performance**: Individual municipal queries resolve in **0.005 ms** (p50); full 444-city ranking queries execute in **0.58 ms** (p50).

### 5.2 Alert Diff & Change Detection Engine
* **Ledger (`audit_events`)**: Records price changes, relistings, and budget updates.
* **Single-Pass Evaluator (`watch-evaluator.ts`)**: Evaluates active `subscriber_watches` against new audit events in a single SQL pass with Haversine spatial radius filtering.

### 5.3 Production Container & Health Lifecycle
* **Multi-Stage Container**: Docker builder compiles React SPA; lightweight Bun runner serves client and API.
* **Liveness Probe**: `GET /api/health` reports status, uptime, and database connection state.
* **Graceful Shutdown**: Intercepts `SIGTERM`/`SIGINT` signals to cleanly drain active PostgreSQL connection pools.
