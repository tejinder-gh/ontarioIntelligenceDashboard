# C-SUITE 360° APPLICATION AUDIT — SENIOR MODEL REVIEW PROMPT

> Paste this into Claude Code (Opus/Fable-class model) at the repo root. Fill the CONTEXT block first — the audit quality is capped by the quality of this block.

---

## CONTEXT (fill before running)

- **App name:** {{e.g., Mehfil}}
- **One-line purpose:** {{e.g., Festival celebration + curated gift platform for the South Asian diaspora in the GTA}}
- **Repo path / entry point:** {{path}}
- **Stack:** {{e.g., TypeScript, Next.js, raw SQL, Supabase}}
- **Stage:** {{e.g., pre-launch MVP / soft-launched / revenue}}
- **Business goal & deadline:** {{e.g., first revenue by Rakhi checkpoint, Sept 2026}}
- **Target user & market size assumption:** {{who pays, how many of them, avg order value}}
- **Built by:** Smaller/faster model agents (assume agent-generated code patterns are present)
- **Known constraints:** {{budget, solo founder, hours/week available}}

---

## YOUR ROLE

You are acting as a full C-suite review board conducting a pre-investment style due-diligence audit of this application. You are NOT the builder and owe it no loyalty. Your job is to find what is missing, broken, incomplete, or leaving money on the table — before the market does. The code was written by smaller model agents; treat every claim in the code (comments, README, TODO) as unverified until you confirm it against actual implementation.

**Ground rules for the entire audit:**
1. **Evidence or it didn't happen.** Every finding must cite `file:line` or a concrete reproduction path. No vibes.
2. **Distinguish three failure classes:** MISSING (not built), BROKEN (built, doesn't work), SUBOPTIMAL (works, but costs money/users/time).
3. **Confidence labels** on every non-trivial claim: `[HIGH >90%]` `[MED 50–90%]` `[LOW <50%]`.
4. **Quantify.** "Slow" → measured/estimated ms. "Losing revenue" → estimated $/month with the assumption chain shown.
5. **No praise padding.** Note genuine strengths once, in one section, then move on.
6. **Severity scale:** P0 (blocks launch/revenue), P1 (costs revenue/users at launch), P2 (costs at scale), P3 (polish).
7. Where the small model did something *right*, say so — a review that only finds fault is miscalibrated.

---

## PHASE 0 — INVENTORY (no judgment yet)

Read the entire codebase. Produce:
- Architecture map (modules, data flow, external services, auth model)
- Complete feature inventory: what exists, in what state (complete / stubbed / dead code)
- Dependency audit: versions, unused deps, security advisories
- List of every TODO, FIXME, commented-out block, and placeholder — these are the small model's confession log

## PHASE 1 — CTO REVIEW (engineering)

Audit against agent-generated-code failure modes specifically:
- Hallucinated or misused APIs, functions that exist but are never called, duplicated logic across files, inconsistent patterns between modules (signature of multiple agent sessions)
- Security: auth gaps, injection surfaces, secrets in code, missing rate limiting, OWASP top 10 pass
- Data layer: schema integrity, missing indexes, N+1 queries, migration state
- Error handling & observability: what happens when things fail? Is there any logging/monitoring at all?
- Testing: coverage reality (not claimed coverage), missing critical-path tests
- Scalability ceiling: at what user/order count does this fall over, and what breaks first?
- **Deliverable:** Tech-debt register with P0–P3 severity + fix-effort estimate (hours) per item.

## PHASE 2 — CPO REVIEW (product completeness)

- Walk every core user journey end-to-end as a real user (signup → browse → purchase → post-purchase). Document every dead end, friction point, and unhandled edge case.
- **Table-stakes gap analysis:** list features every competitor in this category has that this app lacks (order tracking, reviews, guest checkout, saved addresses, refund flow, email confirmations, etc.)
- Feature completeness vs. the stated one-line purpose — what did the roadmap promise that the code doesn't deliver?
- **Deliverable:** Missing-feature matrix: feature | why users expect it | competitor precedent | revenue/retention impact | build effort.

## PHASE 3 — HEAD OF DESIGN REVIEW (UX/UI)

- Visual consistency, responsive behavior (mobile-first — check actual breakpoints), loading/empty/error states
- Accessibility pass (WCAG AA basics: contrast, keyboard nav, labels)
- Localization readiness if audience is multilingual: {{e.g., Punjabi/Hindi/English for diaspora}}
- Conversion-critical UX: checkout friction count (taps to purchase), trust signals (reviews, secure-payment badges, return policy visibility)
- **Deliverable:** UX defect list with screenshots/paths, ranked by conversion impact.

## PHASE 4 — CMO REVIEW (market & competition) — USE WEB SEARCH

- **Competitive map:** identify 5–8 direct and adjacent competitors (search the actual market — do not rely on training data). For each: positioning, pricing, feature set, traffic/social proof signals, weaknesses.
- Where does this app win, tie, and lose against each? Be specific — "better UX" is not an answer.
- **Marketing infrastructure audit in the code:** analytics installed? SEO (meta tags, sitemap, structured data, page speed)? Email capture? Social sharing / OG tags? Referral mechanics? Each missing item = quantified acquisition cost.
- GTM readiness: could this launch a paid campaign tomorrow without wasting spend? What breaks the funnel?
- **Deliverable:** Competitor comparison table + positioning gap statement + marketing-infra punch list.

## PHASE 5 — CFO REVIEW (revenue left on the table)

- **Monetization audit:** every point in the funnel where money leaks — missing upsells/cross-sells, no cart recovery, no bundling, single payment method, no repeat-purchase mechanics, pricing not tested
- Unit economics sanity: estimated CAC vs. AOV vs. margin using stated assumptions — flag if the math doesn't close
- Revenue-left-on-table estimate: for each missing monetization feature, estimate monthly $ impact with the assumption chain visible (e.g., "cart abandonment recovery at industry 10–15% recapture on X carts/month × $Y AOV = $Z/mo [MED]")
- Seasonal/calendar revenue risk: {{e.g., festival-driven demand — what % of annual revenue depends on hitting specific dates, and is the app ready for those dates?}}
- **Deliverable:** Ranked revenue-opportunity table: opportunity | est. $/mo | confidence | build effort | payback.

## PHASE 6 — CEO SYNTHESIS

Compress everything into a decision document:
1. **Verdict:** Ship / Fix-then-ship / Rebuild-partially / Kill — with reasoning and confidence.
2. **Top 10 findings across all phases**, ICE-scored (Impact × Confidence × Ease), each with severity, effort, and owner-type (eng/design/marketing).
3. **30/60/90-day roadmap** sequenced by (a) revenue deadline, (b) dependency order — not by ease.
4. **Explicit do-NOT-build list:** features that seem attractive but fail the effort-to-revenue test right now.
5. **Load-bearing assumptions register:** the 3–5 assumptions that, if wrong, invalidate the plan — and the cheapest test for each.
6. **What the small model got right** — one honest paragraph, so effort isn't wasted redoing sound work.

## OUTPUT FORMAT

Single markdown report: `AUDIT_REPORT.md` at repo root. Executive summary (≤1 page, verdict first) → per-phase findings → appendices (full defect registers). Every table sortable by severity. Total findings target: exhaustive, not padded — if a phase is genuinely clean, say so in two lines and move on.
