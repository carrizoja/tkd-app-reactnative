Classes (OpenSpec `bootstrap-tkd-app` section 6): classes under a sede with a weekly schedule and an active/inactive status, and student enrollment rosters.
Branch: `feat/class-management` · Delivery: stacked PRs to main, child PRs retargeted to main by the agent after each parent merges (forecast ~1,600 authored lines) · Runners: `npm test` (app), `npm run test:rules` (Firestore emulator).

## Specs

Source: `openspec/changes/bootstrap-tkd-app/specs/class-management/spec.md`, quoted verbatim.

- **S1 Create a class** — "WHEN an authorized user creates a class under a Sede with a name and schedule THEN the system stores the class linked to that Sede and lists it"
- **S2 View, edit, delete** — "The system SHALL allow an authorized user to create, view, edit, and delete classes within a Sede of their school, each with a name, schedule, and status."
- **S3 Deactivate a class** — "WHEN an authorized user sets a class status to inactive THEN the system keeps the class and its history but excludes it from active class lists"
- **S4 Enroll students** — "WHEN an authorized user enrolls one or more students in a class THEN the system records the enrollments and shows those students on the class roster"
- **S5 Enroll only same-school students** — "WHEN a user attempts to enroll a student from a different school THEN the system rejects the enrollment"
- **S6 Un-enroll a student** — "WHEN an authorized user removes a student from a class THEN the student no longer appears on that class roster but their past attendance is retained"
- **S7 Tenant isolation** — school-management requirement carried over: no user reads or modifies classes or enrollments outside their scope.

Assumptions:
- A1 (L2): the schedule is a set of weekdays plus one start and end time (`HH:MM`, 24 h), the same on every chosen day; start must be before end; at least one day.
- A2: classes are reached from Escuelas → school → Clases, listed by sede; inactive classes appear in a separate "Inactivas" section.
- A3: enrollments are join documents with deterministic id `${classId}_${studentId}` (enrolling twice is a no-op). Rules require the class and the student to be in the enrollment's school; a class's sede must be in its school and its `associationId` must match the school's.
- A4: deleting a class deletes its enrollments; attendance records (section 7) are never deleted by class or enrollment changes. A roster ignores enrollments whose student no longer exists.

## Tasks

| ID | Specs | Route | Status | Evidence / commit |
|----|-------|-------|--------|-------------------|
| T1 | S3, S5, S7 (rules + emulator tests) — OpenSpec 6.1 | inline; Risk item 2, own commit | done, verified, reviewed | `0c7ba71`; RED 6/16, GREEN 70/70 rules |
| T2 | S1–S6 (model, schedule helpers, service + Firestore store) — OpenSpec 6.1, 6.2 | inline | done | RED 26 failed (stub), GREEN 214/214 app |
| T3 | S1–S3 (class list + form with day/time pickers) — OpenSpec 6.3 | inline | done, device-checked | RED: screen modules missing; GREEN 10/10 |
| T4 | S4–S6 (class detail + roster) and navigation — OpenSpec 6.3 | inline | done, device-checked | RED: module missing + Clases link 1 failed; GREEN 233/233 app, tsc clean |

## Log

- **L1** (2026-11-20) User request: "Section 6 first"
- **L2** (2026-11-20) User decision on the schedule: "Days + start/end time (Recommended)"
- **L3** (2026-11-20) Pre-existing: `Class` type with free-text `schedule`, unused repository helpers (`listActiveClasses`, `listEnrollmentsByClass` without the `schoolId` filter the rules need), and `sedeHasClasses` in school-management. No class records exist yet, so the schedule format changes without a migration.
- **L4** (2026-11-20) T1 independent verifier: PASS, no blockers; the commit closes 11 holes reproduced on main (cross-school enrollment, sede of another school, class school move, enrollment re-point). Applied advisories: re-check a class's sede only when it changes (a class whose sede was removed can still be deactivated), and regression tests for a two-school user and missing class/student. Deferred: student/sede `schoolId` can still be changed by a multi-school user (pre-existing on main); enrollment ids are ambiguous only for ids containing `_` (Firestore auto-ids never do).
- **L5** (2026-11-20) Native review of `0c7ba71` (risk + reliability): user chose "Review this change"; approved and acknowledged. Advisory: the S4 rules test only exercised the update path; added a create-path test.
- **L6** (2026-11-20) T3+T4 done: Clases button on the school screen; class list by sede with an Inactivas section; class form with sede and weekday chips and native 24 h clock pickers; class detail with roster, enroll/un-enroll, deactivate/reactivate, delete. `MemberRow` moved out of GroupDetailScreen for reuse (group tests unchanged, 5/5). OpenSpec 6.1–6.3 checked. Next: rebuild the dev client is not needed (datetimepicker is already native); deploy Firestore rules (needs approval), then device check.
- **L7** (2026-11-21) With user approval, deployed `firestore.rules` from this branch to `tkd-app-e3df0` (`firebase deploy --only firestore:rules`); compiled and released. Indexes unchanged. Next: device check of the class screens.
- **L8** (2026-11-21) User: "The class screens work on the emulator." User decision on groups vs classes: "Yes, keep groups" (groups stay as school-wide student lists with no schedule; classes are the scheduled unit attendance uses).
- **L9** (2026-11-21) User: "Yes, push and open the stacked PRs". Re-sliced the 5 local commits into 6 reviewable slices on fresh branches from main (tree identical to `72d8acc`; original `feat/class-management` kept locally as a backup): #18 rules (`feat/class-management-01-rules`), #19 service (513 lines, size exception: half is the service test), #20 class list, #21 class form, #22 class detail + roster, #23 navigation + this document. Each slice passes on its own: app tests 196/214/218/224/232/233, `tsc` clean, rules 70/70 on #18 and #19. First per-slice runs showed flaky failures under load; re-runs with `--ci --forceExit` were all green. Next: user merges #18–#23 in order; the agent retargets each child to `main` after its parent merges.
