## Purpose

Lets an instructor take attendance for a class on a given date and review
attendance history filtered by date — the first core userflow from the report.

## ADDED Requirements

### Requirement: Take attendance
The system SHALL allow an authorized user to mark each enrolled student of a
class as present or absent for a specific date, and SHALL treat re-marking the
same class/student/date as an update rather than a duplicate.

#### Scenario: Mark attendance for a class
- **WHEN** a user opens a class, selects a date, and marks students present or absent
- **THEN** the system stores one attendance record per student for that class and date

#### Scenario: Re-mark the same day
- **WHEN** a user changes a student's mark for a date already recorded
- **THEN** the system updates the existing record instead of creating a second one

#### Scenario: Only enrolled students
- **WHEN** a user takes attendance for a class
- **THEN** the system offers only students enrolled in that class

### Requirement: Attendance history
The system SHALL let an authorized user view a class's attendance history
filtered by date.

#### Scenario: Filter history by date
- **WHEN** a user selects a date in a class's attendance history
- **THEN** the system shows the present/absent record for each student on that date

#### Scenario: No record for a date
- **WHEN** a user selects a date with no attendance taken
- **THEN** the system indicates that no attendance was recorded for that date
