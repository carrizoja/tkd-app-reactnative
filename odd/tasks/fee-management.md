Fees (OpenSpec `bootstrap-tkd-app` section 8): register a monthly cuota per student and see who has not paid the current period.
Branch: `feat/fee-management` · Delivery: stacked PRs to main; the repository deletes merged head branches, so GitHub retargets each child to main by itself (forecast ~800 authored lines) · Runners: `npm test` (app), `npm run test:rules` (Firestore emulator).

## Specs

Source: `openspec/changes/bootstrap-tkd-app/specs/fee-management/spec.md`, quoted verbatim.

- **S1 Register a monthly payment** — "WHEN a user registers a payment for a student for a given month with an amount THEN the system stores the payment marked as paid for that student and period"
- **S2 Duplicate period prevented** — "WHEN a user registers a payment for a student and period that is already paid THEN the system prevents a second payment record for the same period"
- **S3 Cash method in MVP** — "WHEN a user registers a payment THEN the system records the method as cash"
- **S4 List overdue students** — "WHEN a user views the fees section for the current period THEN the system lists students with no payment recorded for that period as overdue"
- **S5 Paid students excluded from overdue** — "WHEN a student has a payment recorded for the current period THEN the system does not list that student as overdue"
- **S6 Tenant isolation** — school-management requirement carried over: no user reads or modifies payments outside their scope.

Assumptions:
- A1 (L2): the amount is typed on every payment; it must be a number greater than 0. No school default fee.
- A2: one "Cuotas" screen per school, reached from the school detail. It opens on the current month, with previous/next month buttons (no month after the current one). It lists "Adeudan" (no payment for the month, S4) and "Pagaron" (with amount and date, S5). Tapping an overdue student asks for the amount and registers the payment.
- A3: payments keep the deterministic id `${studentId}_${period}`. Rules require that id, a `YYYY-MM` period, a numeric amount > 0, `status: "paid"`, `method: "cash"`, and a student of the payment's school. Updates are denied, so a paid period cannot be overwritten (S2); delete stays allowed (no UI) to correct mistakes.
- A4: students have no active/inactive status, so every student of the school counts for the overdue list.

## Tasks

| ID | Specs | Route | Status | Evidence / commit |
|----|-------|-------|--------|-------------------|
| T1 | S2, S3, S6 (rules + emulator tests) — OpenSpec 8.1 | inline; Risk item 2, own commit | done | `28ed539`; RED 6/12, GREEN 94/94 rules; verifier PASS; native review approved |
| T2 | S1–S5 (fee service: register + period summary) — OpenSpec 8.1, 8.2 | inline | done | `8a417b7`; RED 11/11 (stub), GREEN 269/269 app (`--runInBand`), tsc clean |
| T3 | S1, S4, S5 (Cuotas screen) and navigation — OpenSpec 8.3 | inline | done | `9dfe388`; RED 8 screen + 1 link failed, GREEN 281/281 app, tsc clean |

## Log

- **L1** (2026-11-23) User request: "merged! Start with section 8"
- **L2** (2026-11-23) User decision on the amount: "Typed each time (Recommended)"
- **L3** (2026-11-23) Pre-existing: `Payment` type, `paymentId`, `registerPayment` and `listPaymentsByPeriod` exist but are unused. `registerPayment` uses `set`, and the rules allow any same-school update, so registering a paid period again silently overwrites the first payment (violates S2). The rules only check `canAccessSchool`. A `schoolId + period` composite index already exists in `firestore.indexes.json`.
- **L4** (2026-11-23) T1 `28ed539`: payments are create-only (`allow update: if false`) and require `isPaymentShape` (id `${studentId}_${period}`, `YYYY-MM`, amount number > 0, `status == 'paid'`, `method == 'cash'`, string `paidAt`) plus a student of the payment's school (`get()`). Independent verifier: PASS, no blockers; every new denial was allowed at baseline, and no other collection's rules changed. Advisories: a payments `writeBatch` hits the rules access-call limit above ~17 documents (the UI registers one at a time); `Infinity`, `2026-13` and extra fields pass the rules (the service rejects the first two); `paidAt` was optional in the type (now required in T3).
- **L5** (2026-11-23) Native review of `28ed539` (lenses risk + reliability), reviewed alone from a temporary worktree at that commit: user chose "Review this change"; approved and acknowledged (authority burned). Non-blocking findings, not applied: delete then re-create can replace a paid cuota with no audit trail (A3 keeps delete on purpose); no `keys().hasOnly` allowlist (same as the other collections); the period regex accepts months 00 and 13–99; the amount has no upper bound. Candidate follow-up: tighten the rules' month regex to `(0[1-9]|1[0-2])`.
- **L6** (2026-11-23) T2 `8a417b7`: `feeService` (`currentPeriod`, `getPeriod`, `registerPayment`) replaces the unused helpers. A paid period is detected through the period's payment list, not `getById`, because the read rule denies a missing document. T3 `9dfe388`: "Cuotas" on the school detail opens the Fees screen (A2). Amounts are typed the Argentine way ("15.000", "12.500,50"). OpenSpec 8.1–8.3 checked. Slice assessment `28ed539..9dfe388`: medium, `under_budget` (803 lines), not due. The `schoolId + period` index has been deployed since 2026-11-20 (file unchanged since the first commit). Next: deploy the rules (needs approval), device check, stacked PRs.
- **L7** (2026-11-23) With user approval ("Yes, deploy the rules"), deployed `firestore.rules` from this branch (HEAD `9dfe388`) to `tkd-app-e3df0` after two failed attempts with expired CLI credentials and a user re-login; compiled and released. Indexes unchanged. Next: device check.
- **L8** (2026-11-23) Device check: the user did not see "Cuotas" at first; the emulator was running JS loaded before Metro restarted (Metro's bundle had the button). After restarting the app the button showed. User: "It works, push and open the PRs". Delivery: stacked PRs to main — `01-rules` (`28ed539`), `02-service` (`8a417b7`), `03-screen` (`9dfe388` + this document).
