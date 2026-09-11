# TICKET TEMPLATE — Staff Engineer → Implementer Handoff

Copy per ticket to `tickets/T-###.md`. Every field is mandatory. A ticket a mid-tier model can misinterpret is a defective ticket — the defect belongs to the staff engineer, not the implementer.

---

```markdown
# T-### — <verb + object, one clause, no "and">

**Source finding:** AUDIT_REPORT.md §<ref> | Severity: P<0-3> | Class: MISSING|BROKEN|SUBOPTIMAL
**Assigned tier:** SENIOR | INTERMEDIATE
**Effort estimate:** <hours> | **Sequence:** after T-### (or "independent")

## WHAT
One paragraph. Exactly what changes, in behavior terms a tester could observe.

## WHY
One–two lines tying back to the business impact from the audit (revenue $, conversion %, security exposure). The implementer needs this to make correct micro-decisions.

## SCOPE — FILES
IN:  <explicit file paths — the implementer may create/modify ONLY these>
OUT: <adjacent files/systems that look related but must NOT be touched, with one-line reason each>

## ACCEPTANCE CRITERIA (testable, binary)
- [ ] AC1: <observable behavior / test that passes / measurable value>
- [ ] AC2: ...
(3–7 criteria. If you need more, the ticket is too big — split it.)

## TEST PLAN
Exact commands to run + expected output. If tests don't exist for this path, first AC is "write the test."

## CONSTRAINTS
- Follow existing patterns in <reference file> — do not introduce new patterns
- No new dependencies (or: "allowed: <package>@<version>, reason: ...")
- <stack-specific rules, e.g., raw SQL not ORM, TypeScript strict, no any>

## ROLLBACK
How to revert if this breaks something (branch strategy / feature flag / revert commit).

## BLOCKED PROTOCOL
If any assumption here proves false against the real code: STOP, write what you found vs. what the ticket claimed, status → BLOCKED. Do not improvise around it.
```

---

## Staff-engineer sizing rules (applied while writing tickets)

- **≤ 4h Senior, ≤ 2h Intermediate.** Bigger → split along seams: data layer / API / UI / tests are natural split lines.
- **Tier by blast radius:** auth, payments, money math, schema migrations, deletion, PII → SENIOR minimum. Copy, styling, config, isolated components, tests for existing behavior → INTERMEDIATE eligible.
- **The OUT list is not optional.** Small models fail by over-helping — the OUT list is the fence. If you can't think of anything for OUT, you haven't thought about the ticket's neighbors.
- **Acceptance criteria are the contract.** If a criterion can be argued about, rewrite it until it's binary. "Improve performance" ✗ → "P95 of /api/orders < 300ms locally with seed data" ✓.
