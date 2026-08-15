## Purpose

Lets an instructor register monthly fee payments (cuotas) per student and see
which students have overdue or upcoming-due fees — the second core userflow from
the report.

## ADDED Requirements

### Requirement: Register a payment
The system SHALL allow an authorized user to register a monthly fee payment for
a student for a given period (month), recording the amount, payment date, and
method, with at most one payment per student per period.

#### Scenario: Register a monthly payment
- **WHEN** a user registers a payment for a student for a given month with an amount
- **THEN** the system stores the payment marked as paid for that student and period

#### Scenario: Duplicate period prevented
- **WHEN** a user registers a payment for a student and period that is already paid
- **THEN** the system prevents a second payment record for the same period

#### Scenario: Cash method in MVP
- **WHEN** a user registers a payment
- **THEN** the system records the method as cash

### Requirement: Overdue fee visibility
The system SHALL identify students whose current-period fee is unpaid so the
user can act on overdue accounts.

#### Scenario: List overdue students
- **WHEN** a user views the fees section for the current period
- **THEN** the system lists students with no payment recorded for that period as overdue

#### Scenario: Paid students excluded from overdue
- **WHEN** a student has a payment recorded for the current period
- **THEN** the system does not list that student as overdue
