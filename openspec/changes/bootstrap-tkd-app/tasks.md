## 1. Project & Backend Setup

- [x] 1.1 Create the Firebase project (user, in console); enable Firestore, Auth, Storage; record web config in `.env` (gitignored)
- [x] 1.2 Scaffold a fresh Expo (managed, TypeScript) app in `tkd-mobile/` and verify it runs on Android
- [x] 1.3 Install and configure NativeWind + Tailwind config; verify a `className` styled component renders
- [x] 1.4 Install `firebase`, navigation, and a forms/validation library
- [x] 1.5 Create the shared Firebase initializer and a typed data-layer (repository) interface per capability, so screens never touch the Firestore SDK directly
- [x] 1.6 Set up the feature-based folder structure (`features/<capability>/{ui,data,model}`)
- [x] 1.7 Set up the test runner (Jest + React Native Testing Library) and the Firebase emulator (Firestore + Auth) for data-layer and rules tests

## 2. Firestore Model & Security Rules

- [x] 2.1 Define TypeScript document types + converters for `associations`, `schools`, `sedes`, `memberships`
- [x] 2.2 Define document types for `students` (incl. `lastNameLower`), `studentGroups`
- [x] 2.3 Define document types for `classes`, `classEnrollments`
- [x] 2.4 Define document types for `attendance` (deterministic id `classId_studentId_date`)
- [x] 2.5 Define document types for `payments` (deterministic id `studentId_period`) and `events` (constrained `type`)
- [x] 2.6 Write `firestore.indexes.json` composite indexes for the app's compound queries
- [x] 2.7 Write `firestore.rules` tenant-isolation rules using `memberships`; write emulator rules-unit-tests proving cross-tenant reads/writes are denied and in-scope access is allowed
- [x] 2.8 Configure the Storage bucket + rules for student photos
- [x] 2.9 Add a dev seed script (one association, school, sede, sample students) against the emulator

## 3. Authentication (user-auth)

- [x] 3.1 Write tests for registration (success + duplicate email)
- [x] 3.2 Implement email/password registration screen and data layer
- [x] 3.3 Write tests for login (valid, invalid, persisted session, sign out)
- [x] 3.4 Implement login, session persistence, and sign out
- [x] 3.5 Implement scope resolution from `memberships` on login (association vs. single-school)
- [x] 3.6 Configure and wire the Google OAuth provider
  - [x] 3.6a Drop Facebook from the MVP (Meta app review is disproportionate for one school's instructors; `specs/user-auth/spec.md` amended)
  - [x] 3.6b Install `@react-native-google-signin/google-signin` + config plugin, add `scheme` to `app.json`
  - [x] 3.6c Implement `signInWithGoogle` (native sheet -> id token -> `signInWithCredential`) and the Google button on the login screen
  - [x] 3.6d **User:** enable Google in Firebase Auth, create the OAuth client IDs, set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `.env`
  - [x] 3.6e **User:** produce a development build (`npx expo run:android`, or EAS) — the native module cannot run in Expo Go
- [x] 3.7 Add auth-gated navigation (Home hub only when authenticated)

## 4. School Hierarchy (school-management)

- [x] 4.1 Write tests for school/sede CRUD and tenant isolation (in-scope allowed, cross-tenant denied)
- [x] 4.2 Implement schools + sedes repository against Firestore (scoped by Security Rules)
- [x] 4.3 Implement Escuelas / Sedes screens (list, create, edit, delete)

## 5. Students (student-management)

- [ ] 5.1 Write tests for student CRUD, photo upload, search by name/surname, and groups
- [ ] 5.2 Implement students data layer (incl. Storage photo upload)
- [ ] 5.3 Implement student list, profile (photo, belt/grade, stats), and search screens
- [ ] 5.4 Implement student groups (create, add/remove members)

## 6. Classes (class-management)

- [ ] 6.1 Write tests for class CRUD, deactivation, and same-school enrollment rule
- [ ] 6.2 Implement classes + enrollment data layer
- [ ] 6.3 Implement class list, create/edit, and roster/enrollment screens

## 7. Attendance (attendance-tracking)

- [ ] 7.1 Write tests for take-attendance (upsert on re-mark, only enrolled students) and history by date
- [ ] 7.2 Implement attendance data layer (upsert by class/student/date)
- [ ] 7.3 Implement take-attendance screen and attendance history (date filter)

## 8. Fees (fee-management)

- [ ] 8.1 Write tests for register-payment (one per period, cash method) and overdue listing
- [ ] 8.2 Implement payments data layer (unique per student/period)
- [ ] 8.3 Implement Cuotas: register payment and overdue-students view

## 9. Events (event-calendar)

- [ ] 9.1 Write tests for create-event (valid types, reject unknown) and browse/filter by type
- [ ] 9.2 Implement events data layer
- [ ] 9.3 Implement Calendario: create event and list/filter upcoming events

## 10. Integration & Wrap-up

- [ ] 10.1 Wire the Home hub to all capability sections per the report's information architecture
- [ ] 10.2 Apply Spanish (Argentina) UI copy and the report's brand colors/typography
- [ ] 10.3 End-to-end test the three core userflows: take attendance, register payment, create event
- [ ] 10.4 Verify Security Rules hold end-to-end with a second test user in a different tenant
- [ ] 10.5 Build and run on a physical Android device; fix runtime issues
