import { makeConverter, type Entity } from "../../../lib/model/converter";

/** Root tenant. */
export interface Association extends Entity {
  name: string;
}

export interface School extends Entity {
  associationId: string;
  name: string;
}

export interface Sede extends Entity {
  schoolId: string;
  /** Denormalized from the parent school for rules/queries. */
  associationId: string;
  name: string;
  address: string;
}

export const associationConverter = makeConverter<Association>();
export const schoolConverter = makeConverter<School>();
export const sedeConverter = makeConverter<Sede>();

/** What a user may edit on a school; its association is fixed at creation. */
export type SchoolInput = Pick<School, "name">;

/** What a user may edit on a sede; its school and association are fixed. */
export type SedeInput = Pick<Sede, "name" | "address">;

export type SchoolErrorCode =
  /** The user's scope does not allow this operation. */
  | "forbidden"
  /** A required field is blank after trimming. */
  | "invalid-input"
  /** A school cannot be deleted while it still has sedes (decision L2). */
  | "has-sedes"
  /** A sede cannot be deleted while it still has classes. */
  | "has-classes";

export class SchoolError extends Error {
  readonly code: SchoolErrorCode;

  constructor(code: SchoolErrorCode, message: string) {
    super(message);
    this.name = "SchoolError";
    this.code = code;
    // Keeps `instanceof SchoolError` working when the class is transpiled down.
    Object.setPrototypeOf(this, SchoolError.prototype);
  }
}

/** Trim a required text field, rejecting it when nothing is left. */
function requiredText(field: string, value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new SchoolError("invalid-input", `The ${field} is required.`);
  }
  return trimmed;
}

export function normalizeSchoolInput(input: SchoolInput): SchoolInput {
  return { name: requiredText("school name", input.name) };
}

export function normalizeSedeInput(input: SedeInput): SedeInput {
  return {
    name: requiredText("sede name", input.name),
    address: requiredText("sede address", input.address),
  };
}
