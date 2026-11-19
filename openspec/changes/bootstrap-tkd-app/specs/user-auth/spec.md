## Purpose

Lets a Taekwondo instructor create an account and sign in to the app, and
establishes the administrator role with its two scope levels (association
president vs. single-school instructor) that all other capabilities rely on.

## ADDED Requirements

### Requirement: Instructor registration
The system SHALL allow a new user to register with an email and password, and
SHALL reject registration when the email is already in use.

#### Scenario: Successful registration
- **WHEN** a visitor submits a unique email and a valid password
- **THEN** the system creates an account and starts an authenticated session

#### Scenario: Duplicate email
- **WHEN** a visitor submits an email that already has an account
- **THEN** the system rejects the registration and reports that the email is taken

### Requirement: Login
The system SHALL authenticate a registered user via email/password and via
Google social login.

#### Scenario: Valid credentials
- **WHEN** a registered user submits correct credentials
- **THEN** the system starts an authenticated session and shows the Home hub

#### Scenario: Invalid credentials
- **WHEN** a user submits an incorrect password
- **THEN** the system denies access and shows a login error without revealing which field was wrong

#### Scenario: Social login
- **WHEN** a user completes Google authentication
- **THEN** the system starts an authenticated session linked to that identity

#### Scenario: Social login cancelled
- **WHEN** a user dismisses the Google sign-in sheet without choosing an account
- **THEN** the system returns to the login screen without reporting a failure

#### Scenario: Address already used by another provider
- **WHEN** a user signs in with Google using an address that already has an
  email/password account
- **THEN** the system explains that the account exists under another sign-in
  method instead of reporting invalid credentials

### Requirement: Session and scope resolution
The system SHALL keep a user signed in across app restarts until they sign out,
and SHALL resolve each user's scope (association-wide or single-school) on login.

#### Scenario: Persisted session
- **WHEN** an authenticated user reopens the app
- **THEN** the system restores the session without requiring re-login

#### Scenario: Scope determines visible data
- **WHEN** an association-president user is authenticated
- **THEN** the system grants visibility to every school in their association

#### Scenario: Single-school scope
- **WHEN** a single-school instructor is authenticated
- **THEN** the system grants visibility only to their own school's data

#### Scenario: Sign out
- **WHEN** an authenticated user signs out
- **THEN** the system ends the session and returns to the login screen
