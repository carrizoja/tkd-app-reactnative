## Purpose

Manages classes bound to a Sede (branch) and the enrollment of students into
those classes, which attendance tracking depends on.

## ADDED Requirements

### Requirement: Class management
The system SHALL allow an authorized user to create, view, edit, and delete
classes within a Sede of their school, each with a name, schedule, and status.

#### Scenario: Create a class
- **WHEN** an authorized user creates a class under a Sede with a name and schedule
- **THEN** the system stores the class linked to that Sede and lists it

#### Scenario: Deactivate a class
- **WHEN** an authorized user sets a class status to inactive
- **THEN** the system keeps the class and its history but excludes it from active class lists

### Requirement: Student enrollment
The system SHALL allow enrolling and un-enrolling students in a class, where a
student may belong to multiple classes and a class may hold multiple students.

#### Scenario: Enroll students
- **WHEN** an authorized user enrolls one or more students in a class
- **THEN** the system records the enrollments and shows those students on the class roster

#### Scenario: Enroll only same-school students
- **WHEN** a user attempts to enroll a student from a different school
- **THEN** the system rejects the enrollment

#### Scenario: Un-enroll a student
- **WHEN** an authorized user removes a student from a class
- **THEN** the student no longer appears on that class roster but their past attendance is retained
