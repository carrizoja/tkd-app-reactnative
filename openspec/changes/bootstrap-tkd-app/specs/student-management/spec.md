## Purpose

Manages student records, student groups, and per-student profiles (photo,
belt/grade, personal data) for a school, including search by name and surname.

## ADDED Requirements

### Requirement: Student records
The system SHALL allow an authorized user to create, view, edit, and delete
students within their school, including a profile photo and belt/grade.

#### Scenario: Create a student
- **WHEN** an authorized user saves a student with a first name and last name
- **THEN** the system stores the student under the user's school and lists them

#### Scenario: Upload a profile photo
- **WHEN** an authorized user attaches a photo to a student
- **THEN** the system stores the image and shows it on the student's profile

#### Scenario: Edit belt/grade
- **WHEN** an authorized user updates a student's belt/grade
- **THEN** the system persists the new value on the profile

### Requirement: Student search
The system SHALL let an authorized user filter the student list by name and by
surname.

#### Scenario: Filter by surname
- **WHEN** a user types a surname fragment into the student search
- **THEN** the system shows only students whose surname matches the fragment

#### Scenario: No matches
- **WHEN** a user's search matches no students
- **THEN** the system shows an empty result state

### Requirement: Student groups
The system SHALL allow grouping students within a school and adding or removing
students from a group.

#### Scenario: Create a group and add members
- **WHEN** an authorized user creates a group and adds students to it
- **THEN** the system stores the group with those members

#### Scenario: Remove a member
- **WHEN** an authorized user removes a student from a group
- **THEN** the student remains in the school but no longer appears in that group
