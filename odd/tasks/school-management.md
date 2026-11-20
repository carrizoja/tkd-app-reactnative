School hierarchy (OpenSpec `bootstrap-tkd-app` section 4): create, view, edit and delete Schools and Sedes within the user's scope.
Branch: `feat/school-management` · Delivery: ask-on-risk (forecast ~900 authored lines, so the PR split is decided before opening a PR) · Runners: `npm test` (app), `npm run test:rules` (emulator).

## Specs

Source: `openspec/changes/bootstrap-tkd-app/specs/school-management/spec.md`, quoted verbatim.

- **S1 Create a school** — "WHEN an authorized user creates a school with a name THEN the system stores the school under the user's association and lists it"
- **S2 Create a branch** — "WHEN an authorized user adds a Sede with a name and address to a school THEN the system stores the Sede linked to that school"
- **S3 Delete a branch** — "WHEN an authorized user deletes a Sede that has no classes THEN the system removes the Sede". A Sede that still has classes is refused.
- **S4 Edit and view** — "The system SHALL allow an authorized user to create, view, edit, and delete Schools and their Sedes (branches) within their scope."
- **S5 Delete a school** — L2 decision: deleting a school that still has Sedes is **blocked**. A school with no Sedes is removed.
- **S6 Association-wide access** — "WHEN an association-president user lists schools THEN the system returns every school in that association and no others"
- **S7 Cross-tenant access denied** — "WHEN a user requests a school that belongs to a different association THEN the system denies the request and returns no data"
- **S8 Single-school restriction** — "WHEN a single-school instructor lists schools THEN the system returns only their own school"
- **S9 No re-parenting** — derived from the tenant-isolation requirement ("prevent any user from reading or modifying schools, branches, or their descendant data outside the user's scope"): a school's `associationId` cannot be changed by an update.

Assumptions: only association-scope users create or delete schools (school-scope instructors rename their school and manage its sedes); names and addresses are required and trimmed; UI copy is Spanish (Argentina), matching `user-auth`; memberships stay out of scope (client writes stay denied).

## Tasks

| ID | Specs | Route | Status | Evidence / commit |
|----|-------|-------|--------|-------------------|
| T1 | S1–S9 (data + rules) — OpenSpec 4.1, 4.2 | inline (no writer trigger: one unit, sequential) | done, verified | `1f2bede` + `cf956d3` (rules, Risk item 2), `aa00667` (service) |
| T2 | S1–S5, S8 (screens + Home link) — OpenSpec 4.3 | inline (depends on T1) | done, device-checked | see L8, L12 |

## Log

- **L1** (2026-11-20) User request: "Yes, commit and start section 4"
- **L2** (2026-11-20) User decision on deleting a school with branches: "Block it (Recommended)"
- **L3** (2026-11-20) Pre-existing: types, base repositories, `listSchoolsByAssociation`/`listSedesBySchool`, indexes and rules for `schools`/`sedes` already exist. Rules list-query constraint: school-scope users cannot list `schools` by query (the rule keys on the doc id), so they fetch their `schoolIds` one by one. Class lookups must filter `schoolId ==` so the rules can evaluate them. Corrected earlier claim: section 4 does not let anyone assign memberships.
- **L4** (2026-11-20) T1 RED: new rules tests failed on S9 (instructor re-parents own school) and S2 (sede with a mislabeled associationId), confirming two live-rule gaps; service tests failed with module-not-found. GREEN: rules pin associationId on school update and match a sede's associationId to its school; `npm run test:rules` 26/26, `npx jest --selectProjects app --runInBand` 107/107, `npm run test:auth` 6/6, `tsc --noEmit` clean. Advisory: LoginScreen/RegisterScreen time out at 5s only under parallel full-suite runs (pass in band); not caused by this feature.
- **L5** (2026-11-20) RDD assess on `1f2bede` (base `019b53d`, escalated item 2): high, review_due. Independent verifier launched first; review follows. The rules change is not deployed yet: deploying needs explicit approval.
- **L6** (2026-11-20) Verifier: all S1–S9 pass, no blockers; four write paths the baseline allowed are now denied. Advisory (already at baseline): an instructor could delete its school and recreate it under another association, getting around S9. User decision: "Yes, restrict it (Recommended)". RED: 2 new tests failed (instructor deletes its school; instructor creates a school under an assigned id). GREEN in `cf956d3`: school create/delete need association scope; rules 31/31, app 107/107, auth 6/6. Regression tests added for overwrite-move, stripping associationId and relabeling a sede. Remaining advisories (baseline, accepted): S3/S5 delete guards live only in the service; a sede can move between schools within scope.
- **L7** (2026-11-20) Native review of `019b53d..347c5b4` (lenses risk + reliability): consent granted, **approved**, acknowledged (lineage review-eda5e5b223ca7538). Advisories: R1 school/sede delete guards are service-only (baseline, accepted); R3-001 no positive sede-update rules test; R3-002 missing assigned school unproven against real rules; R3-003 check-then-delete is not atomic (accepted). R3-001 and R3-002 closed with tests (rules 33/33).
- **L8** (2026-11-20) T2 RED: `getSchool` service test failed; 4 screen suites failed with module-not-found; Home-link navigator test failed ("Unable to find an element with text: Escuelas"). GREEN: Schools, SchoolDetail, SchoolForm and SedeForm screens (props plus callbacks, route wrappers in `src/navigation/schoolRoutes.tsx`, scope through `ScopeContext`, lists refresh when the user comes back to them), Spanish copy in `ui/copy.ts`, zod form schemas. `tsc --noEmit` clean; `npx jest --selectProjects app --runInBand` 129/129 (18 suites).
- **L9** (2026-11-20) RDD assess `347c5b4..b803d31`: medium, review_due false (`under_budget`); no high-risk item (UI and tests), so no verifier.
- **L10** (2026-11-20) User: "Yes, deploy the rules". Deployed `firestore.rules` from `c0afc1e` (sha256 e72b485a…5707) to `tkd-app-e3df0`: compiled and released.
- **L11** (2026-11-20) Device check: membership works (Home shown), but Escuelas failed with `failed-precondition: The query requires an index`. The composite indexes in `firestore.indexes.json` had never been deployed (earlier deploys were rules-only). User: "Yes, deploy the indexes". Deployed with `--non-interactive` (deletes nothing); all 8 indexes are listed live, building.
- Next: device check on the emulator (needs a `memberships/{uid}` doc created outside the app) Then the PR decision.
