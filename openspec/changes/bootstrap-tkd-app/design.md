## Context

See `proposal.md` — Why. This is a fresh mobile admin app for Taekwondo schools,
defined by the validated UX report (Reporte UX V1.1). The user is the instructor
/ school owner / association president. Data is a strict hierarchy
(Association → School → Sede → Class → Student) with time-series records
(attendance by date, payments by month) and a typed Event. The chosen backend is
**Firebase (Cloud Firestore)**, confirmed with the user. A legacy 2024 app exists
but is not reused.

## Goals / Non-Goals

**Goals:**
- A Firestore data model that captures the hierarchy and supports the app's
  queries, with multi-tenant isolation enforced by Firestore Security Rules so
  the mobile client talks to Firebase directly without a custom API server.
- An Expo React Native (TypeScript) app styled with NativeWind, covering the
  three core userflows from the report: take attendance, register a fee payment,
  and create an event — plus the entity management those flows require.
- A model shaped so deferred features (notifications, Mercado Pago, reports)
  attach later without breaking changes.

**Non-Goals:**
- No custom backend/API server — Firebase SDK + Security Rules is the backend.
- No push notifications, online payments, reports dashboards, chat, or blog in
  this change.
- No student- or parent-facing app. Students exist only as data.
- Not building on the legacy 2024 code (e-commerce boilerplate + RTDB).

## Decisions

### D1 — Firestore over Realtime Database
Domain data lives in **Cloud Firestore**, not Firebase Realtime Database.
- **Why:** Firestore supports compound queries, indexed filtering, and
  collection-group queries — needed for "students in this school filtered by
  surname," "attendance for this class on this date," and "overdue students this
  period." RTDB (used by the legacy app) forces heavy denormalization for these.
- **Alternative considered:** RTDB. Rejected — poor querying for a
  reporting-oriented domain. Postgres/Supabase was also considered and rejected
  by user preference for Firebase.

### D2 — Firestore data model (collections)
Firestore is a NoSQL document store; relationships are modeled by reference IDs
and, where it helps queries, denormalized fields. Top-level collections:

| Collection | Key fields | Notes |
|---|---|---|
| `associations` | id, name | root tenant |
| `schools` | id, associationId, name | filter by associationId |
| `sedes` | id, schoolId, associationId, name, address | associationId denormalized for rules/queries |
| `students` | id, schoolId, associationId, firstName, lastName, lastNameLower, photoUrl, beltGrade, birthDate | `lastNameLower` for prefix search |
| `studentGroups` | id, schoolId, name, memberIds[] | membership as an array for small groups |
| `classes` | id, sedeId, schoolId, associationId, name, schedule, status | |
| `classEnrollments` | id, classId, studentId, schoolId | join docs (N—M) |
| `attendance` | id, classId, studentId, date, present, schoolId | doc id = `${classId}_${studentId}_${date}` for idempotent upsert |
| `payments` | id, studentId, schoolId, period (YYYY-MM), amount, status, paidAt, method | doc id = `${studentId}_${period}` — one cuota/month |
| `events` | id, schoolId, associationId, type, title, date | type ∈ {exam_board, tournament, master_class} |
| `memberships` | id = uid, associationId?, schoolIds[], scope | tenancy (D3) |

- Deterministic document IDs on `attendance` and `payments` give
  create-or-update semantics without a read-modify-write race, satisfying the
  "re-marking updates, not duplicates" and "one payment per period" rules.
- Every descendant carries `schoolId` (and `associationId` where relevant) so
  Security Rules and list queries can scope by tenant without joins.
- `lastNameLower` enables case-insensitive surname prefix search
  (`>= term` / `< term + ''`), since Firestore has no `LIKE`.

### D3 — Tenancy via `memberships` + Security Rules
A `memberships/{uid}` document records the user's scope: `scope: "association"`
with an `associationId`, or `scope: "school"` with a `schoolIds` array.
Firestore Security Rules read this membership (via `get()`) to authorize each
read/write: a document is accessible only if its `associationId` (association
scope) or `schoolId` (school scope) is within the user's membership.
- **Why:** Expresses both personas — association president (all member schools)
  and single-school instructor — with one mechanism, enforced server-side.
- **Trade-off:** `get()` calls in rules count as reads and add latency; mitigate
  by keeping the membership doc small and denormalizing `associationId`/`schoolId`
  onto documents so rules compare fields without extra lookups.

### D4 — Frontend architecture
Expo (managed) + TypeScript + NativeWind. Feature/screaming-architecture layout
(`features/<capability>/` with `ui/`, `data/`, `model/`), a shared Firebase app
initializer, and a typed data layer wrapping the Firestore SDK behind
per-capability repository functions. Navigation via stack + tab navigator
mirroring the report's HOME hub. UI copy in Spanish (Argentina); code in English.
- **Why:** Co-locates each capability's screens, queries, and types and keeps the
  Firestore SDK behind an interface, so a later backend swap or offline cache
  does not touch screens.

### D5 — Auth
Firebase Auth with email/password plus Google. On login
the app loads `memberships/{uid}` to resolve scope. Session persistence uses the
Firebase Auth persisted session (no manual token/SQLite handling like the legacy
app).

## Risks / Trade-offs

- **Security Rules complexity** → Multi-level tenancy in rules is subtle and
  `get()`-heavy. Mitigation: denormalize `associationId`/`schoolId` onto every
  document; cover rules with the Firebase emulator's rules-unit-test suite before
  building UI.
- **No SQL aggregation** → "attendance %" and fee summaries can't be computed by
  a server query. Mitigation: aggregate on the client for MVP volumes; move to
  denormalized counters or Cloud Functions if data grows.
- **Query constraints** → Firestore needs composite indexes for compound
  filters and can't do arbitrary text search. Mitigation: define indexes up
  front; use `lastNameLower` prefix ranges for search.
- **Social login setup** → Google needs console + native config and a development
  build. Mitigation: ship email/password first; add Google as a discrete
  task.
- **Vendor lock-in / offline** → Firestore SDK is Firebase-specific but offers
  offline persistence out of the box. Mitigation: repository interface (D4)
  isolates it; enable Firestore offline persistence for gym-connectivity gaps.

## Migration Plan

Greenfield — no data migration. Deployment order:
1. Create the Firebase project; enable Firestore, Auth, and Storage.
2. Write Security Rules + composite indexes; test with the Firebase emulator.
3. Scaffold the fresh Expo app, wire the Firebase config, ship auth.
4. Build capabilities in dependency order (see tasks.md).
Rollback is trivial (no production data); rules and data are re-creatable.

## Open Questions

- Exact belt/grade taxonomy (ITF Dan/Gup scale) on `students` — free-text field
  in the MVP, normalizable into a lookup later without changing any capability's
  external behavior.
- Whether to run against the Firebase emulator suite in CI now or later — does
  not change the model or task breakdown; deferrable.
