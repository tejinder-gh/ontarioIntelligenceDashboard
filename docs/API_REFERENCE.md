# REST API Reference Manual

Base URL: `http://localhost:3001/api`

All endpoints query the local PostgreSQL relational operational store (`ontario_economic_intelligence`) with **zero external HTTP round trips**.

---

## 1. Geographies & Profiles

### `GET /api/geographies`
Lists or searches Ontario municipalities.
* **Query Parameters**:
  * `q` (string, optional): Search query matching municipality name or normalized alias.
  * `limit` (number, default: 100): Maximum number of results.
* **Response**:
  ```json
  {
    "data": [
      {
        "id": "CSD_burlington",
        "name": "Burlington",
        "display_name": "Burlington (City), Halton",
        "geo_type": "CSD",
        "csd_type": "City",
        "census_division": "Halton",
        "population_2021": 186948,
        "population_growth_pct": 2.0,
        "ontario_pop_share_pct": 1.314
      }
    ],
    "total": 1
  }
  ```

### `GET /api/geographies/:id/profile`
Returns comprehensive demographic profile, observations, and coverage report for a municipality.

### `GET /api/geographies/:id/demographics`
Returns dynamic Top 20 ethnic origins and visible minority breakdowns.

### `GET /api/geographies/:id/financials`
Returns median vs. average household income, skewness indication, shelter costs, and Survey of Financial Security net worth benchmarks.

### `GET /api/geographies/:id/spending`
Returns Survey of Household Spending (SHS) consumption categories with explicit CMA/Provincial resolution tags.

### `GET /api/geographies/:id/workforce`
Returns dynamic Top 20 NOC occupations, Top 20 NAICS industries, labor participation, and unemployment rates.

### `GET /api/geographies/:id/municipal-budget`
Returns Ontario FIR municipal operating and capital budgets, property tax revenue, and departmental expenses.

---

## 2. Multi-City Comparison & Similarity

### `GET /api/geographies/compare`
Compares multiple municipalities side-by-side.
* **Query Parameters**:
  * `ids`: Comma-separated list of geography IDs (e.g. `CSD_burlington,CSD_oakville,CSD_milton`).

### `GET /api/geographies/:id/similar`
Calculates multi-attribute Euclidean distance similarity across population, growth, income, median age, household size, and business density.

---

## 3. Opportunity Lab & Rankings

### `GET /api/opportunity/business-search` (Workflow A)
Ranks Ontario municipalities for opening a selected business category.
* **Query Parameters**:
  * `category`: Business category ID (e.g. `pizza_store`).
  * `demand`: User weight for population/demand (default: 0.20).
  * `competition`: User weight for competition penalty (default: 0.25).
  * `income`: User weight for purchasing power (default: 0.20).
  * `growth`: User weight for growth (default: 0.15).

### `GET /api/opportunity/city-recommendations` (Workflow B)
Ranks business categories for a specific city based on market gap index and peer benchmarks.
* **Query Parameters**:
  * `cityId`: Target municipality ID (e.g. `CSD_burlington`).

### `GET /api/opportunity/business-detail`
Returns verified revenue benchmark chains, commercial real estate lease benchmarks, and OpenStreetMap-listed competitors.

### `GET /api/rankings`
Sortable Ontario league table by metric (e.g. `income_median_hh`, `population_growth_pct`).

### `GET /api/analytics/outliers`
Returns Tukey IQR and z-score statistical anomalies with natural language rationale.

---

## 4. Metadata & Verification

### `GET /api/meta/dictionary`
Returns canonical data dictionary definitions, formulas, and limitations.

### `GET /api/meta/freshness`
Returns system operational health, total persisted records, and verifies zero external API round trips (`externalApiCallCount: 0`).
