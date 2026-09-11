# REST API Reference Manual

Base URL: `http://localhost:3001/api`

The API is served by the local application and its PostgreSQL operational store (`ontario_economic_intelligence`). This describes API data access only; it is not a deployment-wide claim about all browser assets, infrastructure, or network traffic.

---

## 0. Cloud Infrastructure & Health Probes

### `GET /api/health`
Liveness and readiness probe for cloud orchestration (Kubernetes, AWS ALB, Render, Fly.io).
* **Response `(200 OK)`**:
  ```json
  {
    "status": "healthy",
    "uptime": 128.45,
    "timestamp": "2026-09-09T02:24:23.688Z",
    "database": "connected",
    "version": "1.0.0"
  }
  ```

---

## 1. Geographies, Profiles & Demographics

### `GET /api/geographies`
Lists or searches all 444 Ontario municipalities and Census Subdivisions.
* **Query Parameters**:
  * `q` (string, optional): Search query matching municipality name or normalized alias.
  * `limit` (number, default: 100, max: 500): Maximum results to return.
* **Response**:
  ```json
  {
    "data": [
      {
        "id": "CSD_burlington",
        "name": "Burlington",
        "display_name": "Burlington, City (Halton)",
        "geo_type": "CSD",
        "csd_type": "City",
        "municipal_tier": "LOWER_TIER",
        "population_2021": 186948,
        "population_growth_pct": 2.0,
        "ontario_pop_share_pct": 1.314
      }
    ],
    "total": 444
  }
  ```

### `GET /api/geographies/:id/profile`
Returns full demographic profile, core census indicators, household incomes, and business counts.

### `GET /api/geographies/:id/coverage`
Evaluates empirical data completeness across 8 authentic dimensions with confidence scoring (`HIGH`, `MEDIUM`, `LOW`), with explicit data lineage notices.
* **Dimensions Evaluated**: Population, Demographics, Incomes, Workforce/NOC, Municipal Finance, Commercial Rent, Competitor Ratings, Confirmed Sales.

### `GET /api/geographies/:id/age-profile`
Returns 9 statutory Census age cohorts with exact counts, percentages, and deltas against the Ontario provincial benchmark (`PR_35`), plus Youth (0-14), Working-Age (15-64), and Senior (65+) aggregates.

### `GET /api/geographies/:id/demographics`
Returns Top 20 ethnic origins, visible minority breakdowns, housing stock types (single-detached, apartments), and structural dwelling counts.

### `GET /api/geographies/:id/financials`
Returns median vs. average household income, after-tax income, monthly shelter costs (tenant rent vs. homeowner costs), and Survey of Financial Security net worth benchmarks.

### `GET /api/geographies/:id/spending`
Returns Survey of Household Spending (SHS) consumption estimates across restaurant food, grocery, recreation, transportation, and retail goods.

### `GET /api/geographies/:id/workforce`
Returns Top 20 NOC occupations, Top 20 NAICS industries, labor participation rate, unemployment rate, and empirical Occupational Location Quotient (LQ) calculations.

### `GET /api/geographies/:id/municipal-budget`
Returns Ontario Financial Information Return (FIR) Schedule 10/40 operating revenues, expenditures, taxation levy, and per-capita spending.

### `GET /api/geographies/:id/planning-initiatives`
Returns official municipal plans, secondary growth corridors, urban expansion initiatives, and official bylaw document citations.

### `GET /api/geographies/:id/fuel`
Returns retail gasoline and diesel price monitoring with regional price delta comparisons.

### `GET /api/geographies/:id/housing-rental`
Returns primary rental market vacancy rates and average rents by bedroom count (Bachelor, 1-Bed, 2-Bed, 3-Bed+).

---

## 2. Multi-City Comparison & Similarity

### `GET /api/geographies/compare`
Compares up to 8 municipalities side-by-side across demographics, finances, business counts, and municipal budgets.
* **Query Parameters**:
  * `ids`: Comma-separated list of geography IDs (e.g. `CSD_burlington,CSD_oakville,CSD_milton`).

### `GET /api/geographies/:id/similar`
Calculates multi-dimensional Euclidean distance similarity across population scale, 5-year growth, median income, business density, and median age, returning the Top 5 peer municipalities.
* **Query Parameters**:
  * `popWeight` (default: 0.35)
  * `incomeWeight` (default: 0.25)
  * `densityWeight` (default: 0.20)
  * `growthWeight` (default: 0.20)

---

## 3. Dynamic Category Taxonomy

### `GET /api/taxonomy/categories`
Returns all canonical NAICS 2022 business categories with display names, descriptions, and capital expenditure guidelines.

### `GET /api/taxonomy/search`
Fuzzy prefix and synonym search across colloquial terms (e.g. `pizzeria`, `daycare`, `gym`, `auto body`).
* **Query Parameters**:
  * `q` (string, required): Search query.
  * `limit` (number, default: 8): Max suggestions.

### `GET /api/taxonomy/resolve`
Resolves a colloquial search query or alias to its canonical NAICS business category.
* **Query Parameters**:
  * `q` or `alias` (string, required): Term to resolve.

---

## 4. Opportunity Lab & Rankings

### `GET /api/opportunity/business-search` (Workflow A: "I know the business")
Ranks Ontario municipalities for opening a selected business type with transparent 6-factor weighting:
* **Query Parameters**:
  * `category` (string, required): Category ID or synonym (e.g. `pizza_store`).
  * `demand` (number, default: 0.25): Population & market scale weight.
  * `competition` (number, default: 0.25): Saturation penalty weight.
  * `income` (number, default: 0.20): Purchasing power weight.
  * `growth` (number, default: 0.10): 5-year population growth weight.
  * `cost` (number, default: 0.10): Commercial rent affordability weight.
  * `labor` (number, default: 0.10): Workforce availability weight.
  * `minPopulation` (number, default: 0): Minimum municipality population floor slider.

### `GET /api/opportunity/city-recommendations` (Workflow B: "I know the city")
Ranks business categories for a specific city based on empirical gap indices, Table 33-10-1097 business counts, and peer benchmarks.
* **Query Parameters**:
  * `cityId` (string, required): Target municipality ID (e.g. `CSD_burlington`).

### `GET /api/opportunity/business-detail`
Returns detailed feasibility metrics for a specific city-category pair, including revenue benchmark chains, commercial rent averages, and physical competitor maps.
* **Query Parameters**:
  * `cityId` (string, required)
  * `categoryId` (string, required)

### `GET /api/rankings`
Sortable Ontario league table across all 444 municipalities by metric (e.g. `population_2021`, `income_median_hh`, `businesses_per_1000_pop`).

### `GET /api/analytics/outliers`
Detects statistical outliers using non-parametric Tukey IQR fences ($Q_1 - 1.5 \times \text{IQR}$, $Q_3 + 1.5 \times \text{IQR}$) and Gaussian z-scores (|z| ≥ 2.0).

---

## 5. Location Feasibility Dossier Preview

### `GET /api/dossier/:cityId/:categoryId`
Returns a read-only feasibility-dossier data preview combining:
* Executive Summary & Feasibility Score
* 2021 Census Demographic & Income Profile
* Canadian Business Counts Table 33-10-1097-01 Distribution by Employee Band
* Commercial Real Estate Net & Gross Lease Rates
* Operating Unit Economics & SDE/EBITDA Margin Projections
* Competitive Saturation & Gap Index
* Official Statistics Canada & MMAH Citations

The response can be viewed or printed by the client. It is not a paid product delivery or a lending determination.

### `POST /api/checkout/dossier`
Checkout is currently unavailable and returns `503 Service Unavailable`:
```json
{
  "success": false,
  "error": "Dossier checkout is currently unavailable."
}
```

---

## 6. Alert Registration

### `POST /api/alerts/watches`
Registers an alert-interest record. Public alert queue inspection, evaluation, and delivery are not available.
* **Request Body**:
  ```json
  {
    "subscriber_email": "analyst@example.com",
    "subscriber_name": "Example Analyst",
    "watch_type": "LISTING_WATCH",
    "geography_id": "CSD_burlington",
    "category_id": "pizza_store",
    "radius_km": 25,
    "threshold_pct": 5
  }
  ```
* **Allowed `watch_type` values**: `LISTING_WATCH`, `INDICATOR_WATCH`, `BUDGET_WATCH`.
* **Response `(201 Created)`**:
  ```json
  { "success": true }
  ```

---

## 7. Metadata & Provenance

### `GET /api/meta/dictionary`
Returns canonical metric definitions, units, calculation formulas, and known statistical limitations.

### `GET /api/meta/freshness`
Returns system operational health, total database observations, and the server's instrumented external API-call counter. That counter does not prove a deployment or browser makes no network requests.

### `GET /api/sources`
Returns the authorized registry of all 26 upstream data sources, official catalogue codes, and update frequencies.

### `GET /api/sources/:code`
Returns detailed provenance metadata, release dates, and staleness parameters for a specific dataset code.
