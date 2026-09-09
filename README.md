# Ontario Economic & Business Intelligence Platform

A production-grade, authoritative **Economic & Business Intelligence Platform** built to empower entrepreneurs, investors, franchisees, municipal economic development officers, and market analysts with empirical, zero-guesswork location feasibility intelligence across Ontario municipalities.

---

## 🌟 Executive Summary & Core Value Proposition

When entrepreneurs and investors seek answers to critical commercial questions:
* *"What city in Ontario is best for opening a pizza store, coffee shop, or tutoring centre?"*
* *"What businesses have the highest probability of succeeding in Burlington?"*
* *"Which Ontario municipalities are underserved across retail, automotive, and personal services?"*
* *"How wealthy are residents of a municipality and what do they spend money on?"*
* *"What is the commercial rent overhead, employee payroll baseline, and unit economics benchmark?"*

Most web tools either make fragile runtime web-scraping calls, hallucinate numbers, or silently substitute provincial averages as municipal numbers.

This platform operates on an **Ingestion-First, Database-First Architecture**:
1. **Zero Runtime Upstream Round Trips**: 100% of dashboard views, comparative charts, and simulation workflows query a local persistent PostgreSQL relational operational store (`ontario_economic_intelligence`) running on Docker.
2. **Audited Data Sources**: Ingests official Statistics Canada tables (including the latest **Table 33-10-1097-01** released March 4, 2026 with Dec 2025 reference), Ontario Financial Information Returns (FIR), and OpenStreetMap geographic features.
3. **Strict Geographic Resolution Enforcement**: Explicitly labels data at `CSD` (Census Subdivision), `CMA` (Census Metropolitan Area), or `PROVINCE` resolution. Provincial or CMA benchmarks are never conflated with municipal observations.
4. **Strict Transactional Pricing Separation**: Commercial business listings strictly separate aspirational `asking_price` from `confirmed_sale_price` (kept NULL unless officially verified via registry/escrow), with automated repeated listing detection confidence.
5. **Verifiable Revenue Benchmark Chains**: Traced to Statistics Canada 21-10-0171-01 and SEDAR+ public franchise royalty filings (Pizza Pizza Royalty Corp, Boston Pizza, Domino's).

---

## 🏛️ System Architecture

The system utilizes a 3-layer data architecture:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       3-LAYER DATA ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────┘

 [ Layer 1: Raw Ingestion Layer ]
 ├── StatCan SDMX API / Bulk CSVs (Profile 98-316-X2021001, Table 33-10-1097-01)
 ├── MMAH Municipal Catalogue (All 444 Ontario Municipalities)
 ├── Ontario Financial Information Returns (FIR Schedule 40)
 ├── StatCan SHS (11-10-0222-01) & SFS (11-10-0016-01)
 └── OpenStreetMap Overpass API (Physical Commercial Footprints)
                               │
                               ▼
 [ Layer 2: Normalized Persistent PostgreSQL Store ]
 ├── Database: ontario_economic_intelligence (Docker PostgreSQL 16 on port 5432)
 ├── 33 Relational Tables (geographies, observations, metrics_definitions, etc.)
 ├── Strict geographic hierarchy (PROVINCE -> CD -> CMA -> CSD)
 └── Immutable provenance, reference periods, confidence, and ETag tracking
                               │
                               ▼
 [ Layer 3: Analytical Engine & Opportunity Lab ]
 ├── Gaussian z-scores, percentile ranks, Tukey IQR outlier fences
 ├── Multi-attribute Euclidean distance city similarity engine
 ├── Dual-Workflow Opportunity Engine:
 │   ├── Workflow A: "I know the business" -> Ranks Ontario cities for business type
 │   └── Workflow B: "I know the city" -> Ranks business categories with gap index
 └── Precomputed analytics served with zero external round-trips
```

---

## 📊 Audited Official Data Sources

| Source Entity | Dataset Code | Reference Period | Ingested Geography | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Statistics Canada** | `98-401-X2021001` | 2021 Census of Population | 444 CSDs + PR_35 | Verified |
| **Statistics Canada** | `33-10-1097-01` | Dec 2025 (Released Mar 4, 2026) | All CSDs | Audited & Verified |
| **Ontario MMAH** | `MMAH-MUN-REG-2026` | 2026 Registry | All 444 Municipalities | Complete |
| **Ontario MMAH** | `FIR-2023-2024` | 2023–2024 Filings | Municipalities | Verified |
| **Statistics Canada** | `11-10-0222-01` | Survey of Household Spending | CMA / Provincial Benchmark | Verified & Tagged |
| **Statistics Canada** | `11-10-0016-01` | Survey of Financial Security | CMA / Provincial Benchmark | Verified & Tagged |
| **OpenStreetMap** | `OSM-OVERPASS-ON` | 2026 Geospatial Extract | Physical Locations | Verified & Tagged |
| **SEDAR+ / Public** | `COMM-BENCH-2026` | 2024–2025 Filings | Provincial Benchmarks | Verified & Tagged |

---

## 🚀 Key Features & 15 Intelligence Views

1. **Overview View (`OverviewView`)**: Executive municipal dashboard, Core KPIs (Population, 5-yr growth, Ontario population share, median income, business counts, density), 8-dimension empirical data coverage card, and 1-click **$199 Location Feasibility Dossier** generator.
2. **City Intelligence View (`CityIntelligenceView`)**: Comprehensive census demographics, population density, occupancy rates, structural dwelling types, household sizes, and municipal planning growth corridor cards.
3. **Demographics View (`DemographicsView`)**: 9 statutory Census age cohorts (youth, working age, seniors), housing stock composition, and Top 20 ethnocultural communities with provincial benchmarks.
4. **Financial Profile View (`FinancialProfileView`)**: Mean vs. Median household income delta, skewness analysis, monthly tenant rent vs. owner payments, and strictly labeled SFS net worth benchmarks.
5. **Consumer Spending View (`ConsumerSpendingView`)**: StatCan SHS household spending across food (restaurant vs grocery), recreation, transportation, and retail categories with mandatory resolution notices.
6. **Workforce View (`WorkforceView`)**: Top 20 NOC occupations with median earnings, Occupational Location Quotient (LQ) vs provincial average, Top 20 NAICS industries, labor participation, and unemployment rates.
7. **Business Landscape View (`BusinessLandscapeView`)**: Table 33-10-1097-01 employer business counts by employee size bands (1-4, 5-9, 10-19, 20-49, 50-99, 100+), density, and sector distributions with decision drill-downs.
8. **Municipality Finances View (`MunicipalityFinancesView`)**: Ontario FIR statements, municipal operating/capital budgets, property taxation revenue, and per-capita spending across municipal departments.
9. **City Rankings View (`CityRankingsView`)**: Interactive multi-metric sortable league table comparing Ontario municipalities with population filters, percentile rankings, and outlier alerts.
10. **Opportunity Lab View (`OpportunityLabView`)**:
    * **Workflow A**: "I know the business" — Transparent 6-factor multi-criteria opportunity scoring across Demand (25%), Saturation (25%), Purchasing Power (20%), Growth (10%), Operating Costs (10%), and Labour Availability (10%).
    * **Workflow B**: "I know the city" (e.g. Burlington) — Dynamic NAICS business recommendations, gap indices, audited Table 33-10-1097 counts, verified revenue benchmark chains, and competitor maps.
    * **Visual Domain Matrix**: Dynamic keyword search, category synonyms, and image-rich domain tiles.
11. **Competition View (`CompetitionView`)**: OpenStreetMap-listed commercial competitors with exact lat/long coordinates, chain vs. independent ratios, and unconfigured review provider notice.
12. **Business Listings View (`BusinessListingsView`)**: Commercial listings with strict separation of asking vs confirmed sale price, price drops, relistings, days on market, and automated subscriber watch creation.
13. **Outliers View (`OutliersView`)**: Non-parametric Tukey IQR fences and Gaussian z-scores (|z| ≥ 2.0) identifying extreme divergences with natural language explanations.
14. **Data Explorer View (`DataExplorerView`)**: SQL queryable observation store with multi-attribute filtering, search, confidence badges, and 1-click CSV/JSON export.
15. **Methodology & Sources View (`MethodologySourcesView`)**: Complete Data Dictionary, Source Capabilities Registry, freshness metadata, and live Zero-Round-Trip verification counter.

---

## 🏛️ Major Engines & Commercial Features

* **$199 CAD Location Feasibility Dossier Generator**: Generates comprehensive lender-ready commercial feasibility PDF reports combining 2021 Census profiles, Canadian Business Counts, municipal finances, and commercial real estate rent baselines (`GET /api/dossier/:cityId/:categoryId`).
* **Alert & Diff Change Detection Ledger**: Automated temporal tracking of listing price drops, relistings, and municipal budget updates (`audit_events` and `subscriber_watches`).
* **Empirical Data Coverage Engine**: Real-time evaluation of data completeness across 8 authentic dimensions with explicit confidence levels (HIGH / MEDIUM / LOW), completely eliminating synthetic fallbacks (`GET /api/geographies/:id/coverage`).
* **Comparable Peer Cities Engine**: Multi-dimensional Euclidean distance similarity calculation across population, growth, median income, density, and age cohort distributions (`GET /api/geographies/:id/similar`).
* **Dynamic Business Category Taxonomy**: NAICS 2022 taxonomy service supporting colloquial synonym autocomplete (e.g. `pizza`, `pizzeria`, `daycare`, `gym`) mapped to canonical sector definitions (`GET /api/taxonomy/...`).

---

## 🛠️ Technology Stack

* **Backend Runtime**: [Bun 1.3](https://bun.sh/) (native TypeScript, high performance)
* **Database**: [PostgreSQL 16](https://www.postgresql.org/) (33 normalized relational tables, zero external HTTP round-trips)
* **API Framework**: [Express 5.2](https://expressjs.com/) with health probes, graceful shutdown, and CORS
* **Frontend Framework**: [React 19.2](https://react.dev/) + [Vite 8.2](https://vitejs.dev/) (Rolldown engine) + [Tailwind CSS 4.3](https://tailwindcss.com/)
* **Visualization**: [Recharts 3.10](https://recharts.org/) + [Lucide Icons](https://lucide.dev/)
* **Testing**: [Vitest](https://vitest.dev/) / `bun test` (99 tests across 23 test suites)
* **Design System**: Dark-mode Apple HIG specular glass materials, accessible inputs, and bilingual (en-CA / fr-CA) scaffolding

---

## ⚡ Quick Start & Development Guide

### Prerequisites
* Docker running with PostgreSQL (`shared-postgres` container on port 5432)
* Bun installed (`curl -fsSL https://bun.sh/install | bash`)

### 1. Ingest Data & Initialize PostgreSQL Store
```bash
# Bootstrap the database, apply schema, and ingest all audited data layers
bun run data:bootstrap
```

### 2. Run Test Suite
Verify that all 99 automated tests pass across 23 test suites:
```bash
bun test
```

### 3. Build Production Bundle
```bash
bun run build
```

### 4. Start Production Server
```bash
bun start
```
The server will be live at `http://localhost:3001` (serving both API endpoints, cloud health checks at `/api/health`, and the compiled React SPA).

For independent Vite frontend development:
```bash
# Terminal 1: Backend API
bun run server

# Terminal 2: Vite Dev Server with HMR
bun run dev
```
Navigate to `http://localhost:3000`.

---

## 🐳 Containerized Production Deployment (Docker)

A multi-stage production [`Dockerfile`](./Dockerfile) is provided:

```bash
# Build production container
docker build -t ontario-economic-intelligence:latest .

# Run container with external PostgreSQL
docker run -d \
  -p 3001:3001 \
  -e PORT=3001 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/ontario_economic_intelligence" \
  --name ontario-intelligence \
  ontario-economic-intelligence:latest
```

### Cloud Health Check Probes
Orchestration systems (Kubernetes, AWS ALB, Render, Fly.io) can poll:
* `GET http://localhost:3001/api/health` — Returns JSON with database connection state, uptime, and version.

---

## 📋 Acceptance Verification Highlights

* **Dynamic Pop Share Calculation**: Burlington's population share of Ontario is dynamically computed as `(186,948 / 14,223,942) * 100 = 1.314%`.
* **Zero External Round Trips**: Confirmed with live counter `externalApiCallCount === 0`.
* **All 444 Municipalities Stored**: All 444 Ontario Census Subdivisions are indexed, normalized, and searchable.
* **Table 33-10-1097-01**: Ingests December 2025 reference counts across employee size bands and NAICS sectors.
* **Pricing Separation**: Asking prices are strictly separated from confirmed transaction closing prices.

---

## 📄 License & Attribution
Contains information licenced under the Open Government Licence – Canada (Statistics Canada) and Open Government Licence – Ontario (Ministry of Municipal Affairs and Housing). Geospatial data © OpenStreetMap contributors under ODbL.
