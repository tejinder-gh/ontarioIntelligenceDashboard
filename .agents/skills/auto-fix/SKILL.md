---
name: auto-fix
description: Full audit-to-implementation pipeline for an application. A senior model (Opus/Fable-class, or GPT/GLM equivalent) acts as a C-suite review board + staff engineer — it audits the entire app (CTO, CPO, Design, CMO, CFO, CEO lenses), produces a findings report, converts findings into scoped implementation tickets, gets user approval, then delegates tickets to smaller/faster models acting as senior/intermediate developers, and verifies every diff before accepting it. Trigger on /auto-fix, "auto fix", "audit and fix", "run the c-suite audit", "fix the findings", "implement the audit report", "delegate these fixes", or any request to review an app end-to-end and then have agents implement the fixes.
---

# AUTO-FIX — Audit → Plan → Approve → Delegate → Verify

A staff-engineer-led pipeline. The **big model** never writes feature code; it audits, plans, scopes, and reviews. The **small model** never decides scope; it implements exactly one approved ticket at a time. The **user** is the only one who approves the plan and merges.

**Role ladder:**
| Role | Model tier | Does | Never does |
|---|---|---|---|
| C-Suite Board + Staff Engineer | Big (Opus/Fable, GPT-5-class, GLM-4.5+) | Audit, ticket-writing, diff review, verdicts | Implementation |
| Senior Dev | Mid (Sonnet-class) | Multi-file tickets, refactors within ticket scope | Scope changes, architecture decisions |
| Intermediate Dev | Small/fast (Haiku-class) | Single-file tickets, config, copy, tests | Anything touching auth, payments, schema |

## State files (repo root, all phases read/write these)
- `AUDIT_REPORT.md` — Phase 1 output (findings, C-suite structured)
- `FIX_PLAN.md` — Phase 2 output (approved ticket backlog)
- `PROGRESS.md` — running ledger: ticket ID | status | assignee tier | verify result | commit
- `tickets/T-###.md` — one file per ticket (template in `references/ticket-template.md`)

If any of these already exist, resume from the furthest incomplete phase — do NOT re-audit a repo that has an unconsumed `AUDIT_REPORT.md` unless the user says `re-audit`.

---

## PHASE 1 — AUDIT (big model only)

Read `references/audit-prompt.md` and execute it fully against the repo. It runs six lenses: CTO (engineering/security/scale), CPO (feature completeness), Head of Design (UX/accessibility/conversion), CMO (competitive map via live web search + marketing infra in code), CFO (revenue left on table, quantified with visible assumption chains), CEO (synthesis, ICE-scored top findings, do-not-build list).

Non-negotiables: every finding cites `file:line` or a repro path; severity P0–P3; confidence labels `[HIGH][MED][LOW]`; three failure classes (MISSING / BROKEN / SUBOPTIMAL). Write `AUDIT_REPORT.md`. Stop. Do not start planning in the same breath — show the user the executive summary first.

## PHASE 2 — PLAN (big model as staff engineer)

Convert findings into tickets using `references/ticket-template.md`. Rules:
1. **One finding may become several tickets; one ticket never covers several findings.**
2. Size every ticket ≤ half a day of work for its assigned tier. If bigger → split. Small models drift on large tickets; ticket granularity is the single biggest quality lever in this pipeline.
3. Assign tier by blast radius, not difficulty: anything touching **auth, payments, data schema, or deletion paths** goes to Senior tier minimum, regardless of how simple it looks.
4. Sequence by (a) dependency order, (b) revenue deadline, (c) P-severity. Never by ease.
5. Each ticket carries: exact files in scope, explicit OUT of scope, acceptance criteria (testable), test plan, and rollback note.
6. Write `FIX_PLAN.md`: ordered ticket table + total effort estimate per tier + what is deliberately deferred (with reason).

## PHASE 3 — GATE (user approval — hard stop)

Present `FIX_PLAN.md` to the user. Ask exactly three things: (1) approve/strike tickets, (2) confirm anything ambiguous the audit assumed (list assumptions explicitly), (3) confirm budget: how many tickets / how much model spend before checking in again. **No implementation starts without an explicit go.** Record the user's answers at the top of `FIX_PLAN.md` as the requirements-of-record.

## PHASE 4 — IMPLEMENT (small models, one ticket per session)

**One-command runner (preferred in Claude Code):** `python3 scripts/run_phase4.py` (from repo root; script lives in this skill's `scripts/` dir). It walks approved tickets in order and spawns one `claude -p` session per ticket with: tier→model mapping (SENIOR→sonnet, INTERMEDIATE→haiku; override via `AUTOFIX_SENIOR_MODEL` / `AUTOFIX_INTERMEDIATE_MODEL` env vars), fail-closed Edit/Write permissions scoped to the ticket's IN paths only, an isolated `autofix/T-###` git branch, `--max-turns` and `--max-budget-usd` caps, and JSON reports saved to `tickets/T-###-report.json`. It hard-stops after 5 tickets, any BLOCKED, any P0, or budget exhaustion — then control returns here for Phase 5. Flags: `--max N`, `--ticket T-003`, `--budget-usd`, `--dry-run`.

**Manual fallback (non-Claude implementers, e.g. GLM/GPT):** for each approved ticket, in order, hand the ticket file + `references/implementer-protocol.md` to the assigned tier yourself. The implementer contract in that file is binding — headline rules: touch only in-scope files, no opportunistic refactoring, no new dependencies without a ticket note, stop and report BLOCKED rather than guess, done = acceptance criteria demonstrably met, output = diff + test evidence + self-report against each criterion.

Update `PROGRESS.md` after every ticket: `T-### | IMPLEMENTED | tier | pending-review | <commit/branch>`.

## PHASE 5 — VERIFY (big model reviews every diff)

Read `references/review-protocol.md`. For each IMPLEMENTED ticket: review the diff strictly against the ticket's acceptance criteria + regression risk outside the diff. Verdicts: **ACCEPT** (mark done), **REWORK** (return with specific line-level notes — max 2 rework cycles, then escalate the ticket to the next tier up), **ESCALATE** (ticket was mis-scoped; rewrite it, back to Phase 4). Never fix the code yourself during review — that destroys the audit trail of what the small model can be trusted with.

After every 5 accepted tickets OR any P0: pause, summarize to the user (done / in-flight / blocked / spend), and re-confirm before continuing.

## PHASE 6 — CLOSE-OUT

When the approved backlog is empty: run a delta audit (Phase 1 lenses, changed areas only), produce `FIX_REPORT.md` — findings closed vs. open, revenue opportunities now unblocked, tier performance stats (rework rate per tier — feeds the next run's tier assignments), and the residual do-not-build list.

## Anti-patterns (never)
- Big model writing implementation code "because it's faster right now"
- Batch-approving its own diffs / skipping Phase 3 or 5
- Tickets with "and", "also", "while you're at it" in the title
- Letting a small model touch auth/payments/schema
- Continuing past 2 rework cycles on the same tier
- Re-auditing on every run instead of resuming state files
