Attendance (OpenSpec `bootstrap-tkd-app` section 7): take attendance for a class on a date and review it by date.
Branch: `feat/attendance-tracking` · Delivery: stacked PRs to main; the repository deletes merged head branches, so GitHub retargets each child to main by itself (forecast ~850 authored lines) · Runners: `npm test` (app), `npm run test:rules` (Firestore emulator).

## Specs

Source: `openspec/changes/bootstrap-tkd-app/specs/attendance-tracking/spec.md`, quoted verbatim.

- **S1 Mark attendance** — "WHEN a user opens a class, selects a date, and marks students present or absent THEN the system stores one attendance record per student for that class and date"
- **S2 Re-mark the same day** — "WHEN a user changes a student's mark for a date already recorded THEN the system updates the existing record instead of creating a second one"
- **S3 Only enrolled students** — "WHEN a user takes attendance for a class THEN the system offers only students enrolled in that class"
- **S4 Filter history by date** — "WHEN a user selects a date in a class's attendance history THEN the system shows the present/absent record for each student on that date"
- **S5 No record for a date** — "WHEN a user selects a date with no attendance taken THEN the system indicates that no attendance was recorded for that date"
- **S6 Tenant isolation** — school-management requirement carried over: no user reads or modifies attendance outside their scope.

Assumptions:
- A1 (L2): every enrolled student starts as Presente; the instructor taps the absent ones, and "Guardar asistencia" saves one record per enrolled student at once. On a date already recorded, the saved marks are shown instead of the default.
- A2: one "Asistencia" screen per class, reached from the class detail, with a native calendar date picker (default today, no future dates). It shows the saved marks for the chosen date or says none were recorded (S4, S5). Inactive classes show history only.
- A3: records keep the deterministic id `${classId}_${studentId}_${date}`. Rules require that id, a `YYYY-MM-DD` date, a boolean `present`, and a class of the record's school; class, student, date and school cannot change on update. Rules do not check the student or the enrollment per record, because each extra `get()` per student would push a batch of a full class past Firestore's rules access-call limit; the service enforces S3.
- A4: students with a saved record who are no longer enrolled still appear, read-only, in that date's history (class-management S6 keeps their attendance).

## Tasks

| ID | Specs | Route | Status | Evidence / commit |
|----|-------|-------|--------|-------------------|
| T1 | S2, S6 (rules + emulator tests, including a full-class batch) — OpenSpec 7.1 | inline; Risk item 2, own commit | done | RED 5/12, GREEN 82/82 rules |
| T2 | S1–S5 (attendance service + Firestore store) — OpenSpec 7.1, 7.2 | inline | done | RED 9/9 failed (stub), GREEN 242/242 app, tsc clean |
| T3 | S1–S5 (Asistencia screen) and navigation — OpenSpec 7.3 | inline | done (device check pending) | RED: screen module missing + Asistencia link 1 failed; GREEN 251/251 app, tsc clean, rules 82/82 |

## Log

- **L1** (2026-11-21) User request: "Yes, start section 7"
- **L2** (2026-11-21) User decision on marking: "Save button, start Presente (Recommended)"
- **L3** (2026-11-21) Pre-existing: `Attendance` type and `attendanceId`; `markAttendance` and `listAttendanceByDate` in `data/repository.ts` are unused, and the latter lacks the `schoolId` filter the rules need. The rules only check `canAccessSchool`. A `classId + date` composite index is already deployed.
- **L4** (2026-11-21) T2: `attendanceService` with `getDay` (S4, S5, A4) and `takeAttendance` (S1–S3, A2: rejects malformed or future dates, inactive classes, empty marks, and students not enrolled), saving a day in one batch. Replaced the unused `markAttendance`/`listAttendanceByDate` with a store that filters by `schoolId`. Typecheck found a wrong `Firestore` type in the T1 test helper; fixed in its own commit.
- **L5** (2026-11-21) T1 independent verifier: PASS, no blockers (S2, S6, A3). Batches of 40–500 records for one class pass for both user types; the emulator does enforce the access-call limit (a batch over ~18 distinct classes is denied). Advisories, all already allowed at baseline: extra fields accepted (same as classes/enrollments), impossible dates such as `2026-13-45` pass the format check (the date picker prevents them), ids are ambiguous only for ids containing `_`, records with random ids from before can no longer be updated (none exist; `markAttendance` was unused).
- **L6** (2026-11-21) T3 done: "Asistencia" button on the class detail opens the Attendance screen: date field with the native calendar (no future dates), "No se registró asistencia para esta fecha." or "Asistencia guardada para esta fecha.", a Presente/Ausente toggle per enrolled student with a present count, "Ya no inscriptos" read-only marks, history only for inactive classes, and "Guardar asistencia". OpenSpec 7.1–7.3 checked. Next: native review of the rules commit, deploy the rules (needs approval), device check.
- **L7** (2026-11-21) Native review of the rules commits (`32fb76e`, `bafb227`; lenses risk + reliability): user chose "Review this change"; approved and acknowledged. Fixed its WARNING: the malformed-date test used `20/11/2026`, whose slashes turned the id into a nested path that the default deny rejected, so the date regex was never exercised. Now `2026-1-20`, `20261120` and `2026-11-20T00:00`; with the regex removed the test fails (mutation check), with it 82/82. Not applied: a `keys().hasOnly` allowlist (extra fields stay inside the member's own school; classes and enrollments do not restrict keys either).
- **L8** (2026-11-21) With user approval ("Yes, deploy the rules"), deployed `firestore.rules` from this branch (HEAD `710b6dc`) to `tkd-app-e3df0`; compiled and released. Indexes unchanged (queries are equality-only). Next: device check.
