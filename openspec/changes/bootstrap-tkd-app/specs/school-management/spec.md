## Purpose

Manages the organizational hierarchy — Association, School, and Sede (branch) —
and defines the multi-tenant boundary that scopes what data each authenticated
user may see and modify.

## ADDED Requirements

### Requirement: School and branch management
The system SHALL allow an authorized user to create, view, edit, and delete
Schools and their Sedes (branches) within their scope.

#### Scenario: Create a school
- **WHEN** an authorized user creates a school with a name
- **THEN** the system stores the school under the user's association and lists it

#### Scenario: Create a branch under a school
- **WHEN** an authorized user adds a Sede with a name and address to a school
- **THEN** the system stores the Sede linked to that school

#### Scenario: Delete a branch
- **WHEN** an authorized user deletes a Sede that has no classes
- **THEN** the system removes the Sede

### Requirement: Tenant isolation
The system SHALL prevent any user from reading or modifying schools, branches,
or their descendant data outside the user's scope.

#### Scenario: Association-wide access
- **WHEN** an association-president user lists schools
- **THEN** the system returns every school in that association and no others

#### Scenario: Cross-tenant access denied
- **WHEN** a user requests a school that belongs to a different association
- **THEN** the system denies the request and returns no data

#### Scenario: Single-school restriction
- **WHEN** a single-school instructor lists schools
- **THEN** the system returns only their own school
