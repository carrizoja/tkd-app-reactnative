Events (OpenSpec `bootstrap-tkd-app` section 9): create calendar events typed as mesa de examen, torneo or master class, and browse upcoming events filtered by type.
Branch: `feat/event-calendar` · Delivery: stacked PRs to main; the repository deletes merged head branches, so GitHub retargets each child to main by itself (forecast ~800 authored lines) · Runners: `npm test` (app, `--runInBand`), `npm run test:rules` (Firestore emulator).

## Specs

Source: `openspec/changes/bootstrap-tkd-app/specs/event-calendar/spec.md`, quoted verbatim.

- **S1 Create a tournament** — "WHEN a user creates an event of type tournament with a title and date THEN the system stores the event under the user's school and shows it on the calendar"
- **S2 Reject an unknown type** — "WHEN a user attempts to create an event with a type outside the allowed set THEN the system rejects the event"
- **S3 List upcoming events** — "WHEN a user opens the calendar THEN the system lists events in their scope ordered by date"
- **S4 Filter by type** — "WHEN a user filters the calendar by a type such as exam board THEN the system shows only events of that type"
- **S5 Tenant isolation** — school-management requirement carried over: no user reads or modifies events outside their scope.

Assumptions:
- A1: one "Calendario" screen per school, reached from the school detail (same as Cuotas). Section 10.1 wires the Home hub later.
- A2: "upcoming" means a date on or after today (device calendar). Past events are not listed.
- A3: the title is required (trimmed, not empty, at most 100 characters); the date is a `YYYY-MM-DD` day picked with the native calendar, today or later.
- A4: events get a Firestore-generated id. The current helper builds the id from school, date and title, so two events with the same title on one day overwrite each other.
- A5: rules require, on create and update: a type in the allowed set, a non-empty string title, a `YYYY-MM-DD` date, and the school's `associationId`. An update never moves an event to another school. No edit or delete UI in this section.

## Tasks

| ID | Specs | Route | Status | Evidence / commit |
|----|-------|-------|--------|-------------------|
| T1 | S2, S5 (rules + emulator tests) — OpenSpec 9.1 | inline; Risk item 2, own commit | done | `b3e4f8b`; RED 6/9, GREEN 103/103 rules; verifier PASS |
| T2 | S1–S4 (event service: create + upcoming list) — OpenSpec 9.1, 9.2 | inline | done | `797441f`; RED 10/10 (stub), GREEN 291/291 app, tsc clean |
| T3 | S1, S3, S4 (Calendario screen) and navigation — OpenSpec 9.3 | inline | done | this commit; RED 8 screen + 1 link failed, GREEN 300/300 app, tsc clean |

## Log

- **L1** (2026-11-23) User request: "Yes, start section 9"
- **L2** (2026-11-23) Pre-existing: `CalendarEvent` type, `EVENT_TYPES`, `isEventType` (tested), plus unused `createEvent` and `listEventsBySchool` in `data/repository.ts`. `createEvent` uses the id `${schoolId}_${date}_${title}` and `set`, so same-day events with the same title overwrite each other. The rules only check `canAccessSchool`, so any type or shape is accepted (violates S2 at the rules layer). Composite indexes `schoolId + date` and `schoolId + type + date` already exist in `firestore.indexes.json`.
- **L3** (2026-11-23) T1 `b3e4f8b`: `isEventShape` requires a type in the allowed set, a 1–100 character string title, and a `YYYY-MM-DD` date with month 01–12 and day 01–31, plus the school's association (`matchesSchoolAssociation`), on create and update; an update keeps `schoolId`. Independent verifier: PASS on S2, S5, A5, no blockers; every change is a new denial the baseline allowed; other collections byte-identical. It also closed a baseline gap: a user covering two schools could move an event between them. Advisories: whitespace-only titles, impossible days such as `2026-02-31`, and past days pass the rules (the service rejects all three); no key allowlist (same as other collections); events stored before this commit with a bad shape can only be deleted.
- **L4** (2026-11-23) T2 `797441f`: `eventService` (`today`, `listUpcoming`, `createEvent`) replaces the unused helpers. Events get a generated id (A4). The service sorts by date itself, so S3 does not rest on the store alone. T3: "Calendario" on the school detail opens the Calendar screen (A1): type filter chips ("Todos", "Mesas de examen", "Torneos", "Master classes"), "Nuevo evento" form (type chips, title, date picker that opens on today with no earlier day). OpenSpec 9.1–9.3 checked. Next: native review of T1, deploy the rules (needs approval), device check, stacked PRs.
- **L5** (2026-11-23) Native review of `b3e4f8b` (lenses risk + reliability), reviewed alone from a temporary worktree at that commit: user chose "Review this change"; approved and acknowledged (authority burned). Non-blocking findings: events stored under the old rules with a bad shape can only be deleted, not edited (no event UI existed before this section, so none are expected); impossible days such as `2026-02-31` pass the rules (the service rejects them); some new constraints had no test. Follow-up test commit pins the 100-character title limit, months 00/13, days 00/32, a missing `associationId` and an update that changes it (103/103 rules).
