# FIX PLAN — Ontario Economic & Business Intelligence Platform
**Approved by User:** September 8, 2026  
**Pipeline:** Auto-Fix (Staff Engineer Plan & Backlog)  
**Status:** ACTIVE IMPLEMENTATION

---

## Requirements of Record (User Amendments to Audit)

1. **Explicit Geography Model:** Maintain strict separation between Province, Census Division (CD), Census Subdivision (CSD), upper-tier, lower-tier, single-tier municipalities, and CMAs/CAs. Do not equate 444 municipalities with 444 CSDs without validation.
2. **Current StatCan 2021 Census Profile:** Replace outdated 98-316 references with current 2021 Census Profile source discovered from Statistics Canada.
3. **Ingestion & Persistence Benchmark:** Measure streaming ingestion performance, peak RAM, uncompressed/compressed sizes, rows, and query latencies.
4. **Retain Express 5:** Keep the current Express 5 backend; avoid premature framework migration to Bun.serve().
5. **Architectural Mobility Adapter:** Keep mobile foot-traffic out of scope for now, but design adapter interfaces so licensed mobility data can be plugged in later.
6. **I18n Scaffolding Only:** Extract strings and build locale-aware currency/number/date formatters (`en-CA`, `fr-CA` ready); defer complete French translation until procurement/market validation warrants it.
7. **Defer $499/mo Municipal Widget:** Build reusable API/components, but defer white-label production iframe until requested by a municipality or backed by an LOI.
8. **Early Alert & Diff Infrastructure:** Implement change-detection event ledger for business listings, prices, municipal budgets, and StatCan releases. Single upstream poll evaluated against all subscriber watches.
9. **Competitive Positioning Documented:** Created [`docs/competitive-positioning.md`](file:///Users/tejindersingh/dev/datasets/ontario-economic-intelligence/docs/competitive-positioning.md) emphasizing transparent provenance, explainable calculations, and longitudinal history.
10. **Multi-Channel Feasibility Dossier Test:** Strengthen willingness-to-pay validation for the $199 dossier across search, franchisees, and commercial brokers.
11. **Empirical EDO Discovery:** Focus municipal calls on budget range, procurement path, buying authority, and pilot commitments.
12. **No Opaque Neural Networks:** Rely on transparent descriptive statistics, IQR fences, and comparable market analysis until historical outcome backtesting proves ML superiority.
13. **Longitudinal History as Moat:** Never overwrite temporal observations; retain full history of prices, counts, rents, budgets, and demographics.

---

## Approved Ticket Backlog

| Ticket ID | Title | Tier | Severity | Effort | Dependencies | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **T-001** | Fix hardcoded population (186948) in CompetitionView, FinancesView, and Opportunity Engine | INTERMEDIATE | P0 | 2h | None | APPROVED |
| **T-002** | Remove deceptive fallbacks in OverviewView and fix false 95% coverage API hallucination | SENIOR | P0 | 3h | None | APPROVED |
| **T-003** | Establish explicit municipal/CSD taxonomy and longitudinal temporal observation schema | SENIOR | P0 | 4h | None | APPROVED |
| **T-004** | Fix Opportunity Workflow B competitor calculation and add small-municipality toggle | SENIOR | P0 | 3h | T-001 | APPROVED |
| **T-005** | Implement streaming census bulk ingestion pipeline and architectural benchmark | SENIOR | P0 | 6h | T-003 | APPROVED |
| **T-006** | Build event/diff change detection ledger for listings, prices, and dataset releases | SENIOR | P1 | 4h | T-003 | APPROVED |
| **T-007** | Implement internationalization scaffolding and locale-aware number/currency formatters | INTERMEDIATE | P2 | 3h | None | APPROVED |
| **T-008** | Build 1-click lender-ready Location Feasibility Dossier preview and PDF foundation | SENIOR | P1 | 5h | T-001, T-002 | APPROVED |

### Total Effort Estimates
- **Intermediate Tier:** 5 hours (T-001, T-007)
- **Senior Tier:** 25 hours (T-002, T-003, T-004, T-005, T-006, T-008)
- **Total Initial Sprint:** 30 hours

---

## Deliberately Deferred Scope (With Rationale)

1. **Full French Translation:** Deferred per Amendment #4. Architectural i18n scaffolding is built in T-007, but complete copy translation is postponed until official bilingual procurement demands it.
2. **Production Municipal Iframe Widget ($499/mo):** Deferred per Amendment #5. Reusable API endpoints and components are maintained, but iframe embedding productization awaits municipal LOI.
3. **Mobile Foot-Traffic Data (Placer.ai style):** Deferred per Amendment #3. Licensing, privacy compliance, and calibration overhead are unsuitable for the current validation stage.
4. **Predictive Neural Networks:** Deferred per Amendment #10. Transparent statistical metrics (z-scores, IQR fences, gap indices) remain the standard until verified historical outcome backtesting proves ML superiority.
