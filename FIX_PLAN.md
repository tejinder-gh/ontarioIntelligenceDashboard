# FIX PLAN (Phase 2) — C-Suite Remediation Backlog

**Status:** APPROVED by User (Phase 3 Gate Confirmed)  
**Requirements of Record:**  
- Approved Scope: All 7 tickets (T-052 through T-058) approved for implementation.  
- App Base URL: Default to `http://localhost:3000` (configurable via `APP_BASE_URL`).  
- Mock Email Fallback: Safe console logging during non-production test/dev without live Resend key.  
- User Vault Integration: Directly trigger `FeasibilityDossierModal` from `UserPortalModal`.  

**Total Scoped Tickets:** 7  
**Senior Tier Effort:** 10 hours (5 tickets)  
**Intermediate Tier Effort:** 4 hours (2 tickets)  
**Total Estimated Effort:** 14 hours  

---

## ORDERED TICKET BACKLOG

| Ticket ID | Title | Assigned Tier | Source Finding | Severity | Effort | Sequence | Blast Radius |
|---|---|---|---|---|---|---|---|
| [**T-052**](file:///Users/tejindersingh/dev/datasets/ontario-economic-intelligence/tickets/T-052.md) | Implement Stripe Webhook Verification and Order Fulfillment | **SENIOR** | §CTO-01 | **P0** | 3h | 1 (First) | High (Payments, DB Orders, Fulfillment) |
| [**T-054**](file:///Users/tejindersingh/dev/datasets/ontario-economic-intelligence/tickets/T-054.md) | Align Magic Link and Dossier Email URLs with Active Application Origin | **SENIOR** | §CTO-02, §CPO-02 | **P0** | 2h | 2 | High (Auth Links, Email Delivery) |
| [**T-053**](file:///Users/tejindersingh/dev/datasets/ontario-economic-intelligence/tickets/T-053.md) | Connect User Vault View Button to Feasibility Dossier Viewer | **INTERMEDIATE** | §CPO-01, §DES-02 | **P0** | 2h | 3 | Low (Client Modals & UI Wiring) |
| [**T-055**](file:///Users/tejindersingh/dev/datasets/ontario-economic-intelligence/tickets/T-055.md) | Enforce Expiry and Session Token Lifecycle in Auth Middleware | **SENIOR** | §CTO-03 | **P1** | 2h | 4 (After T-054) | High (Auth Middleware, Session Security) |
| [**T-056**](file:///Users/tejindersingh/dev/datasets/ontario-economic-intelligence/tickets/T-056.md) | Apply Rate Limiting to Authentication Login Endpoint | **SENIOR** | §CTO-04 | **P1** | 1h | 5 | Med (Security Rate Limits) |
| [**T-057**](file:///Users/tejindersingh/dev/datasets/ontario-economic-intelligence/tickets/T-057.md) | Add Retry Bounds and Failure Handling to Alert Worker | **SENIOR** | §CTO-05 | **P1** | 2h | 6 | Med (Background Cron Worker) |
| [**T-058**](file:///Users/tejindersingh/dev/datasets/ontario-economic-intelligence/tickets/T-058.md) | Generate Programmatic Sitemap for All 444 Municipalities | **INTERMEDIATE** | §CMO-02 | **P2** | 2h | 7 | Low (Build Script, Public SEO) |

---

## DELIBERATELY DEFERRED (Out of Scope for This Cycle)

1. **Third-Party Heavy Analytics Integration (CMO-01):**
   - *Reason:* Connecting external telemetry (e.g. PostHog / Plausible cloud accounts) requires third-party project API keys and data sovereignty review. Best deferred until production hosting environment is configured.
2. **2-Page Executive Summary Lead Magnet PDF Generation (CPO-03):**
   - *Reason:* Requires dedicated server-side or client canvas PDF preview generation logic. We prioritize unlocking real purchased report fulfillment first.
3. **WCAG Focus Trapping & Mobile Grid Polish (DES-03, DES-05):**
   - *Reason:* Polish-tier improvements (P2/P3); does not block immediate revenue readiness or fulfillment integrity.
4. **Automated Old Rate Limits Purge (CTO-07):**
   - *Reason:* Current table size is negligible; horizontal scale purge job can be scheduled in 90-day maintenance.

---

## USER APPROVAL GATE CHECKLIST (Phase 3)

Before starting Phase 4 implementation, the user must confirm:
1. **Ticket Scope Approval:** Approve or strike any tickets in T-052 through T-058.
2. **Assumptions Confirmation:**
   - App base URL defaults to `http://localhost:3000` (or `http://localhost:3001`) unless specified via `APP_BASE_URL`.
   - In non-production test/dev environments without a paid Resend key, email sending logs payloads to console and simulates delivery.
   - Purchased dossiers open directly in the existing `FeasibilityDossierModal` view.
3. **Execution Budget:** Run all 7 tickets in sequence or check in after the 3 P0 blockers (T-052, T-054, T-053).
