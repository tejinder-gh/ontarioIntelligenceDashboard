# FIX PLAN (Phase 2) — Audit Remediation Backlog

Based on the C-Suite Audit findings, the following tickets have been scoped to remediate the critical gaps in the monetization loop (post-purchase fulfillment).

## Requirements of Record
- **Scope Limit**: Focus entirely on the missing fulfillment loop and strict validation of payments.
- **Assumptions**: 
  - We will use Resend as the email provider (a standard ecosystem choice).
  - The UI success modal will trigger solely on the `?success=true` query param (stateless).

## Ticket Backlog

| Ticket | Scope | Tier Assigned | Est. Effort | Sequence |
|---|---|---|---|---|
| **[T-048](file:///Users/tejindersingh/dev/datasets/ontario-economic-intelligence/tickets/T-048.md)** | Implement Resend email dispatcher | SENIOR | 2h | 1 |
| **[T-049](file:///Users/tejindersingh/dev/datasets/ontario-economic-intelligence/tickets/T-049.md)** | Fulfill dossier orders via email from Stripe Webhook | SENIOR | 1h | 2 (after T-048) |
| **[T-050](file:///Users/tejindersingh/dev/datasets/ontario-economic-intelligence/tickets/T-050.md)** | Implement post-checkout success modal UI | INTERMEDIATE | 1h | 3 (independent) |
| **[T-051](file:///Users/tejindersingh/dev/datasets/ontario-economic-intelligence/tickets/T-051.md)** | Add strict Zod validation to `/api/checkout/dossier` | INTERMEDIATE | 1h | 4 (independent) |

**Total Estimated Effort:**
- SENIOR Tier: 3 hours
- INTERMEDIATE Tier: 2 hours

## Deliberately Deferred
- **Database-Backed Rate Limiting (P2):** Deferred until multi-node scaling is actually required. The in-memory map is sufficient for MVP single-instance deployment.
- **User Accounts (P2):** Deferred. Email delivery is the simplest fulfillment method without building a full session/auth portal.
- **Alert Email Fulfilment (P1):** Deferred for now; the primary focus is monetized product delivery ($199 dossier) to prevent chargebacks. Alerts are currently free.

## User Actions Required
Before we proceed to Phase 4 (Implementation):
1. **Approve/strike tickets**: Do you approve these 4 tickets as defined?
2. **Confirm assumptions**: Is Resend acceptable for email delivery?
3. **Confirm budget**: We can execute all 4 tickets. Are you ready to proceed?
