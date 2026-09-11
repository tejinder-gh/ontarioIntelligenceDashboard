# Launch readiness workflow

## What

The Launch Readiness view is a metadata-only workspace for tracking an Ontario business launch checklist, public source references, and a conservative server-derived gate. Open it from **Market Opportunity & Fit → Launch Readiness**, at `/launch-readiness`, or deep-link to a saved workspace at `/launch-readiness/:workspaceId`.

The gate has three possible states:

- `NO_GO`: at least one applicable check has an unresolved blocker.
- `VERIFY`: there is no unresolved applicable blocker, but applicability is unknown, an applicable check is incomplete, or required evidence is missing.
- `CONDITIONAL_GO`: every applicable check is complete and has a user-recorded reference, with no unresolved blocker. This is still not legal, tax, licensing, financial, or launch approval.

## Why

Launch obligations vary by municipality, activity, premises, workforce, and data use. The workflow makes those assumptions explicit and keeps unresolved items visible. It does not turn a generic Ontario checklist into a business-specific compliance determination.

## How

1. Create a workspace with a non-sensitive label, municipality, and industry label, or choose an existing workspace.
2. For every check, explicitly set applicability, completion, and blocker state.
3. Add only a title, publisher, and public HTTP(S) URL as a user-recorded reference. Edit or delete stale references when needed.
4. Read the refreshed gate and every reason after each saved checklist or evidence change.
5. Confirm requirements and evidence with the responsible authority or a qualified adviser before acting.

The API is same-origin under `/api/launch`. Workspace, checklist, and evidence changes are persisted through the server repository. Before deployment, apply the `launch_workspaces`, `launch_checks`, and `launch_evidence` definitions in `src/db/schema.sql` to the target PostgreSQL database using the deployment's approved schema procedure. The documented full-project initializer is `bun run data:bootstrap`, which applies the project schema and also runs the broader ingestion pipeline; do not use it as a launch-only migration without accepting that wider scope. The UI neither creates schema nor falls back to browser-local storage.

## From Where

Catalog links are discovery starting points from public authorities such as the Government of Canada, Government of Ontario, CRA, BizPaL, WSIB, FSRA, the Office of the Privacy Commissioner, and the CRTC. Their presence is not proof that a source was reviewed recently, applies to the workspace, or is exhaustive. Catalog source records deliberately have no verified-at date.

User-recorded references are pointers supplied by the operator. The application does not fetch, archive, authenticate, or independently verify their contents.

## When

Use the workflow before commitments such as registering, signing a lease, hiring, collecting personal information, selling regulated products or services, or beginning operations. Re-run the review when the municipality, premises, industry, ownership, workforce, product, or data practices change, and whenever an authority updates its requirements.

## Privacy boundary

Store only bounded planning labels and public source URLs. Do not enter financial amounts, personal or family details, identity or account numbers, credentials, registration numbers, employee/customer records, document text, or uploads. Treat server/database access, retention, backups, and deletion as deployment responsibilities outside this UI.

## Validation status and limitations

Automated validation covers TypeScript compilation, the mocked same-origin client workflow, server gate/unit tests, the repository test suite, the production bundle, and whitespace checks. The client test covers initial loading markup, failure/retry, checklist update, evidence add/edit/delete, and gate refresh responses.

These checks do **not** prove a live PostgreSQL connection, executed schema initialization, production authentication/authorization, deployment configuration, backup/restore, concurrency behaviour, external authority availability, source currency, or legal completeness. A release owner must separately initialize and smoke-test the deployed database and API, then verify access controls and operational recovery in the target environment.
