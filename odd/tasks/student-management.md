Students (OpenSpec `bootstrap-tkd-app` section 5): student records with photo and belt/grade, search by name and surname, and student groups.
Branch: `feat/student-management` · Delivery: stacked PRs to main (L1 decision carried over from section 4; forecast ~2,000 authored lines) · Runners: `npm test` (app), `npm run test:rules` (Firestore emulator), Storage emulator rules tests.

## Specs

Source: `openspec/changes/bootstrap-tkd-app/specs/student-management/spec.md`, quoted verbatim.

- **S1 Create a student** — "WHEN an authorized user saves a student with a first name and last name THEN the system stores the student under the user's school and lists them"
- **S2 Upload a profile photo** — "WHEN an authorized user attaches a photo to a student THEN the system stores the image and shows it on the student's profile"
- **S3 Edit belt/grade** — "WHEN an authorized user updates a student's belt/grade THEN the system persists the new value on the profile". The value is picked from the ITF grade list (L11).
- **S4 View, edit, delete** — "The system SHALL allow an authorized user to create, view, edit, and delete students within their school, including a profile photo and belt/grade." Deleting a student also deletes their photo and removes them from their groups (assumption A4).
- **S5 Filter by surname** — "WHEN a user types a surname fragment into the student search THEN the system shows only students whose surname matches the fragment"
- **S6 No matches** — "WHEN a user's search matches no students THEN the system shows an empty result state"
- **S7 Filter by name** — "The system SHALL let an authorized user filter the student list by name and by surname."
- **S8 Create a group and add members** — "WHEN an authorized user creates a group and adds students to it THEN the system stores the group with those members"
- **S9 Remove a member** — "WHEN an authorized user removes a student from a group THEN the student remains in the school but no longer appears in that group"
- **S10 Tenant isolation** — school-management requirement carried over: no user reads or modifies students, groups or photos outside their scope.

Assumptions:
- A1: students are reached from Escuelas → school → Alumnos (Home shortcut belongs to task 10.1).
- A2: search filters the school's loaded list on the device: case- and accent-insensitive, matching anywhere in the first name or surname ("fragment"). The Firestore prefix query stays unused.
- A3: profile "stats" (task 5.3) wait for attendance and fees data (sections 7–8).
- A4: deleting a student deletes their photo and removes them from groups.
- A5: photo uploads are limited to raster images (JPEG, PNG, WebP, HEIC/HEIF) under 5 MB, in Storage rules and in the service.
- A6: a student's `associationId` must match its school's, as for sedes; group members must be students of the same school.

## Tasks

| ID | Specs | Route | Status | Evidence / commit |
|----|-------|-------|--------|-------------------|
| T1 | S2, S10 (Firestore + Storage rules and emulator tests) — OpenSpec 5.1 | inline; Risk item 2, own commit | done, verified | `8b24348`, `8719dd7` |
| T2 | S1, S3–S9 (student + group service, pure search filter, photo port) — OpenSpec 5.1, 5.2, 5.4 | inline | done | `0c9ad61`, `69b124e` |
| T3 | S2 (`expo-image-picker` dependency) | inline; Risk item 5, own commit | done | `17cd752` |
| T4 | S1–S9 (screens: list + search, form, profile + photo, groups; Alumnos entry) — OpenSpec 5.3, 5.4 | inline | done (device check pending) | see L8 |

## Log

- **L1** (2026-11-20) User request: "Start section 5"
- **L2** (2026-11-20) User decision on the photo picker: "Add expo-image-picker (Recommended)"
- **L3** (2026-11-20) Pre-existing: `Student`/`StudentGroup` types, base repositories, `searchStudentsBySurname` prefix query and its index, Firestore rules for `students`/`studentGroups` (schoolId-scoped), Storage rules for `students/{schoolId}/{studentId}/{fileName}` (scoped, but no type or size limit). Storage rules have never been deployed.
- **L4** (2026-11-20) T1 RED: 4 new rules tests failed (student created or relabeled with another association; non-image upload; 5 MB upload). GREEN in `8b24348`: students must match their school's association, photo create/update need an image under 5 MB; `test:rules` now starts the Storage emulator; rules 47/47, auth 6/6.
- **L5** (2026-11-20) Verifier on `8b24348`: S2/S10/A5 pass, A6 passes for associationId; no blockers. Advisories: SVG accepted as an image (fixed in `8719dd7`: raster allowlist, rules 49/49); group members from another school are not blocked by the rules (enforced in the service, accepted); students missing associationId can no longer be edited (intended); the Storage path does not tie a student to its school (stays in-tenant, accepted).
- **L6** (2026-11-20) T2 RED: module-not-found for search and the service. GREEN in `0c9ad61` (search 6, service 15) and `69b124e` (photo format/size checks, service 17). Group lists are sorted on the device, so no composite index is needed. Deleting a student always attempts photo removal (a stale student copy may lack photoUrl). T3 in `17cd752`: expo-image-picker ~57.0.21 per the SDK 57 docs, gallery only (CAMERA/RECORD_AUDIO marked `tools:node=remove`); the dev client needs a rebuild. App 150/150 before the photo checks; tsc clean.
- **L7** (2026-11-20) Native review of `e394dd0..` (lenses risk, resilience, reliability): consent granted, **approved**, acknowledged (lineage review-3475b6f7769f2177). Fixed the advisories this branch introduced: deleting a student now removes the record first and cleans up groups and photo best-effort, so a failure never strips a living student's groups (R4/R3-002); photos upload with a lower-cased content type (R3-001); birth dates must be real calendar days (R3-003). Service tests 21/21. Accepted: students missing a matching associationId cannot be edited (none exist; there was no student UI before). Deferred: emulator tests for the production adapters (deleteField, arrayUnion/arrayRemove, object-not-found) (R3-004).
- **L8** (2026-11-20) T4 RED: 6 screen suites failed with module-not-found; the school-detail "Alumnos" test failed. GREEN: Students (search + empty states), StudentForm, StudentProfile (photo via `pickPhoto()` wrapper around `launchImageLibraryAsync`, square crop, quality 0.7), Groups, GroupForm (a new group opens its detail), GroupDetail (add/remove members; dangling member ids are hidden); routes in `schoolRoutes.tsx`; RootNavigator test stubs the student repository and picker. `tsc` clean; app 183/183 (26 suites).
- **L9** (2026-11-20) RDD assess `2258b9e..900195f`: medium, review_due false (`under_budget`); no high-risk item, so no verifier. User: "Yes, deploy the rules". Deployed `firestore.rules` and `storage.rules` (first Storage deploy; the bucket exists) to `tkd-app-e3df0` with `--non-interactive`. Unconfirmed: whether Storage's cross-service read of Firestore was granted (the CLI normally prompts for it); a photo upload on the device will tell. Prebuild regenerated `android/` (CAMERA/RECORD_AUDIO removed); dev-client rebuild started.
- **L10** (2026-11-20) Device check feedback: the user asked what the "Nombre o apellido" field was for, a sign it did not read as a search. User: "Yes, make those changes". The field now says "Buscar por nombre o apellido", has a drawn magnifier (no icon dependency), and only shows once the school has students. All 10 school and student screens get a full white background (the bottom of the screen was gray). App 184/184, tsc clean.
- **L11** (2026-11-20) User request: "Could be great add a dropdown box in \"Cinturón / Graduación\" with all the belts or graduation. Is it possible? If you have doubts, ask me". User decision on the system: "ITF" (10° Gup – Blanco … 1° Gup – Rojo punta negra, 1° … 9° Dan – Negro). Students store only the grade; screens show "grade – color". The service and form accept only grades from the list (older free text must be re-picked on edit). `BeltSelect` opens a bottom sheet with "Sin graduación" plus all 19 grades. App 191/191 (27 suites), tsc clean.
- **L12** (2026-11-20) User: "It works, in field \"Fecha de nacimiento\" could be great add a picker like a calendar". User decision: "Native calendar (Recommended)". Added `@react-native-community/datetimepicker` 9.1.0 (SDK 57 docs; config plugin auto-registered); none of the 37 existing `npm audit` findings involve it. `DateField` opens Android's calendar through `openDatePicker()` (imperative `DateTimePickerAndroid.open`, `onValueChange`/`onDismiss`), never offers a future date, opens on the stored day (or ten years ago), shows DD/MM/AAAA, and has a clear button; storage stays YYYY-MM-DD in the device's calendar day. Android only for now (no iOS build exists). App 196/196 (28 suites), tsc clean. The dev client needs another rebuild.
- **L13** (2026-11-20) Dev client rebuilt with the date picker; the user verified the screens on the emulator ("It works"). User: "Go ahead with the splitting then branch into stacked PRs". Sliced into 9 branches rebuilt from `main` (final tree identical to `feat/student-management`); each slice passes `tsc` and app tests on its own (129→196), rules 49/49 on slice 1. PRs: #8 rules (263) → #9 model (217) → #10 service (663, size exception: service + its tests) → #11 native pickers (112) → #12 list (353) → #13 form (437) → #14 profile (224) → #15 groups (440) → #16 navigation (194).
- Next: merge in order, retargeting each PR to `main` before merging it.
