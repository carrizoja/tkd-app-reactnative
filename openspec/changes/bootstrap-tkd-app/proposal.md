## Why

Taekwondo school owners and association presidents (the app's users) currently
manage their operations on paper attendance sheets, spreadsheets for monthly
fees, and Google Calendar reminders. This is error-prone and does not scale to
associations that oversee many member schools. The validated UX report (Reporte
UX V1.1) defines a mobile admin tool — **TKD App** — that centralizes student,
class, attendance, fee, and event management for the instructor. This change
bootstraps the MVP of that application.

## What Changes

- **New mobile application** built with React Native (Expo) + NativeWind
  (Tailwind-style utilities compiled to React Native styles — Tailwind CSS does
  not run natively in React Native).
- **Firebase backend**: Cloud Firestore as the system of record, Firebase Auth
  for login, Firebase Storage for student photos, and Firestore Security Rules
  to enforce multi-tenant scoping (association-wide vs. single-school).
- **Instructor authentication**: email/password plus Google social login; a
  single administrator role with two scope levels (association
  president vs. single-school instructor).
- **School hierarchy management**: Association → School → Sede (branch).
- **Student management**: student records, student groups, per-student profile
  (photo, personal data, belt/grade, stats), and search by name/surname.
- **Class management**: classes tied to a Sede, with student enrollment.
- **Attendance tracking**: take attendance per class per date, with history
  filtered by date.
- **Fee management (Cuotas)**: register monthly payments per student, flag
  overdue/expiring fees. Cash-only in the MVP (Mercado Pago is a future change).
- **Event calendar**: events typed as exam board (mesa de examen), tournament
  (torneo), or master class, with dates.

Out of scope for this MVP (deferred to future changes): push notifications,
Mercado Pago online payments, Informes/reports dashboards, Chat, Blog,
equipment-supplier management, and school map. The schema is designed so these
can be added without breaking changes.

## Capabilities

### New Capabilities
- `user-auth`: Instructor registration, email/password and Google login, session
  handling, and the administrator role with its two
  scope levels (association vs. school).
- `school-management`: CRUD and hierarchy for Association, School, and Sede
  (branch), including the multi-tenant scoping boundary each user can see.
- `student-management`: Student records, student groups, per-student profile
  (photo, belt/grade, stats), and search/filter by name and surname.
- `class-management`: Classes bound to a Sede and enrollment of students into
  classes (many-to-many).
- `attendance-tracking`: Taking attendance for a class on a date and viewing
  attendance history filtered by date.
- `fee-management`: Registering monthly fee payments (cuotas) per student and
  surfacing overdue/expiring fees.
- `event-calendar`: Creating and listing calendar events typed as exam board,
  tournament, or master class.

### Modified Capabilities
<!-- None. This is the initial bootstrap; no existing specs. -->

## Impact

- **New codebase**: Fresh Expo React Native app (TypeScript), NativeWind
  styling, Firebase SDK. Built as a new project — the legacy 2024 app under
  `tkd-app/` is not reused.
- **New Firebase project**: Firestore collections (associations, schools, sedes,
  students, student_groups, classes, class_enrollments, attendance, payments,
  events), Security Rules for tenant isolation, Auth providers
  (email/password and Google), and a Storage bucket for photos.
- **Dependencies**: `expo`, `react-native`, `nativewind`, `tailwindcss`,
  `firebase`, a navigation library, and a forms/validation library.
- **No existing systems affected** — greenfield project (legacy code untouched).
- **Requires the user in the Firebase console** to create the project, enable
  Auth providers, and provide config keys before the app can connect.
- **Localization**: UI copy is Spanish (Argentina) to match the report; code,
  identifiers, and comments remain English.
