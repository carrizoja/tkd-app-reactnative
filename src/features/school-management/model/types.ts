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
