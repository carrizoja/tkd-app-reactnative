## Purpose

Lets an instructor create and browse calendar events typed as exam board,
tournament, or master class — the third core userflow from the report.

## ADDED Requirements

### Requirement: Create an event
The system SHALL allow an authorized user to create a calendar event within
their school with a title, a date, and a type of exam board, tournament, or
master class.

#### Scenario: Create a tournament
- **WHEN** a user creates an event of type tournament with a title and date
- **THEN** the system stores the event under the user's school and shows it on the calendar

#### Scenario: Reject an unknown type
- **WHEN** a user attempts to create an event with a type outside the allowed set
- **THEN** the system rejects the event

### Requirement: Browse events
The system SHALL let an authorized user view upcoming events within their scope,
ordered by date.

#### Scenario: List upcoming events
- **WHEN** a user opens the calendar
- **THEN** the system lists events in their scope ordered by date

#### Scenario: Filter by type
- **WHEN** a user filters the calendar by a type such as exam board
- **THEN** the system shows only events of that type
