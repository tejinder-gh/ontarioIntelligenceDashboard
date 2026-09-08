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

The database consists of 22 normalized relational tables applied to PostgreSQL 16 (`ontario_economic_intelligence`):

1. `geographies`: Primary spatial units (CSDs, Census Divisions, CMAs, Province of Ontario).
2. `geographic_aliases`: Comprehensive search index supporting alternative spellings and administrative prefixes.
3. `sources`: Authoritative organizations (Statistics Canada, Ontario MMAH, OpenStreetMap, SEDAR+).
4. `source_capabilities`: Explicit authorized scopes and geographic resolutions per source.
5. `datasets`: Audited catalogue tables, release dates, and staleness parameters.
6. `ingestion_runs`: Execution logs tracking bootstrap and sync runs.
7. `raw_ingestion_records`: Raw payload store preserving original responses.
8. `metrics_definitions`: Canonical dictionary of economic, demographic, and fiscal indicators.
9. `observations`: Unified entity-attribute-value time series records.
10. `census_demographics`: Disaggregated ethnocultural and visible minority populations.
11. `census_workforce`: NOC occupations and NAICS industry employment counts.
12. `municipal_finances`: Ontario FIR operating and capital budget statements.
13. `household_expenditures`: Survey of Household Spending (SHS) consumption categories.
14. `wealth_benchmarks`: Survey of Financial Security (SFS) balance sheet indicators.
15. `business_categories`: 2-digit to 6-digit NAICS business opportunity taxonomy.
16. `businesses`: Physical commercial locations from OpenStreetMap with element IDs.
17. `business_reviews`: Independent review ratings and sentiment store.
18. `business_listings`: Commercial business acquisition and broker listings.
19. `commercial_real_estate`: Retail and office lease rates, NNN costs, and vacancy.
20. `revenue_benchmark_chains`: Verifiable revenue unit economics and public filing links.
21. `derived_analytics`: Precomputed cross-sectional percentiles, z-scores, and rankings.
22. `data_coverage_reports`: Statistical completeness evaluations per municipality.

---

## 4. Geographic Resolution Hierarchy

To prevent erroneous conclusions, the system enforces a strict hierarchy:
* `CSD` (Census Subdivision): Municipality, City, Town, Township.
* `CD` (Census Division): Regional Municipality, County, District.
* `CMA` (Census Metropolitan Area): Large urban economic agglomerations.
* `PROVINCE`: Ontario provincial totals (`PR_35`).

Whenever a metric is unavailable at the `CSD` level (e.g. Survey of Household Spending or Survey of Financial Security), the system displays the `CMA` or `PROVINCE` benchmark with an explicit, high-visibility resolution badge and disclaimer.
