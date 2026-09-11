# FIX PLAN — Ontario Economic & Business Intelligence Platform
**Date:** September 11, 2026  
**Pipeline:** Auto-Fix (Staff Engineer Plan & Backlog — Sprint 3 Remediation)  
**Status:** COMPLETED & VERIFIED (Phase 5 Complete — All 6 Tickets Accepted)

---

## Requirements of Record (Governing Directives)

1. **Information Leakage Zero-Tolerance:** All 45 route error handlers in `src/server/routes.ts` must return generic, sanitized error payloads with zero internal PostgreSQL syntax or column leakage.
2. **Server Throttling & Header Hardening:** Sensitive POST endpoints (`/api/checkout/dossier`, `/api/alerts/events`, `/api/launch/workspaces`) must be rate-limited and secured with standard HTTP headers (`nosniff`, `SAMEORIGIN`).
3. **Omni-Channel Dossier Conversion:** Connect Feasibility Dossier triggers directly inside Opportunity Lab and Business Listings cards to eliminate revenue funnel leakage ($31,800 CAD/mo estimated uncaptured value).
4. **Sub-15ms Query Target:** Parallelize 11 sequential queries in `computeEmpiricalCoverage` using `Promise.all`.
5. **WCAG Keyboard Accessibility:** Support standard `Escape` key dismissal for all modal components and remove hardcoded email placeholders.

---

## Sprint 3 Implementation Backlog

| Ticket ID | Title | Assigned Tier | Severity | Effort | Dependencies | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **T-033** | Sanitize 45 internal error handlers in `src/server/routes.ts` | INTERMEDIATE | P1 | 2h | None | ACCEPTED |
| **T-034** | Implement rate limiting middleware and security headers in `src/server/app.ts` | SENIOR | P1 | 2h | None | ACCEPTED |
| **T-035** | Embed Feasibility Dossier triggers in Opportunity Lab & Business Listings | SENIOR | P1 | 3h | None | ACCEPTED |
| **T-036** | Parallelize sequential database queries in `computeEmpiricalCoverage` | INTERMEDIATE | P2 | 2h | None | ACCEPTED |
| **T-037** | Add `Escape` key modal dismissal & keyboard accessibility | INTERMEDIATE | P2 | 1h | None | ACCEPTED |
| **T-038** | Fix Alert modal email prefill and wire VC tab deep linking | INTERMEDIATE | P2 | 1h | None | ACCEPTED |

### Total Effort Estimates
- **Intermediate Tier:** 6 hours (T-033, T-036, T-037, T-038)
- **Senior Tier:** 5 hours (T-034, T-035)
- **Total Sprint 3 Backlog:** 11 hours across 6 tightly scoped tickets

---

## Deliberately Deferred Scope (With Rationale)

1. **Interactive Geospatial Map Canvas (MapLibre / Leaflet):** Deferred to Sprint 4. The current tabular and card layouts provide full data accessibility without adding heavy WebGL dependencies.
2. **Full French Copy Translation:** Scaffolding complete; full translation deferred until formal bilingual municipal procurement RFP warrants it.
3. **Mobile Foot-Traffic Sensor Panels:** High recurring licensing cost ($30k–$60k/yr); StatCan and OSM data provide sufficient baseline commercial intelligence.
