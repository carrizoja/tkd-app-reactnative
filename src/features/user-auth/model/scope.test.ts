import type { Membership } from "./membership";
import { canAccessSchool, hasTenancy, resolveScope, SCOPE_UNAVAILABLE } from "./scope";

describe("resolveScope", () => {
  it("grants association-wide access to a president membership", () => {
    const membership: Membership = {
      id: "uid-1",
      scope: "association",
      associationId: "assoc-1",
    };

    expect(resolveScope(membership)).toEqual({
      kind: "association",
      associationId: "assoc-1",
    });
  });

  it("grants only the listed schools to a single-school instructor", () => {
    const membership: Membership = {
      id: "uid-2",
      scope: "school",
      schoolIds: ["school-1"],
    };

    expect(resolveScope(membership)).toEqual({
      kind: "school",
      schoolIds: ["school-1"],
    });
  });

  it("grants nothing when the user has no membership document", () => {
    expect(resolveScope(null)).toEqual({ kind: "unassigned" });
  });

  it("grants nothing when an association membership has no associationId", () => {
    const membership = { id: "uid-3", scope: "association" } as Membership;

    expect(resolveScope(membership)).toEqual({ kind: "unassigned" });
  });

  it("grants nothing when a school membership has an empty schoolIds list", () => {
    const membership: Membership = {
      id: "uid-4",
      scope: "school",
      schoolIds: [],
    };

    expect(resolveScope(membership)).toEqual({ kind: "unassigned" });
  });
});

describe("canAccessSchool", () => {
  it("lets an association-scope user reach any school in the association", () => {
    const scope = resolveScope({
      id: "uid-1",
      scope: "association",
      associationId: "assoc-1",
    });

    expect(canAccessSchool(scope, { schoolId: "school-9", associationId: "assoc-1" })).toBe(true);
  });

  it("blocks an association-scope user from another association's school", () => {
    const scope = resolveScope({
      id: "uid-1",
      scope: "association",
      associationId: "assoc-1",
    });

    expect(canAccessSchool(scope, { schoolId: "school-9", associationId: "assoc-2" })).toBe(false);
  });

  it("lets a school-scope user reach their own school", () => {
    const scope = resolveScope({
      id: "uid-2",
      scope: "school",
      schoolIds: ["school-1", "school-2"],
    });

    expect(canAccessSchool(scope, { schoolId: "school-2", associationId: "assoc-1" })).toBe(true);
  });

  it("blocks a school-scope user from a school they are not assigned to", () => {
    const scope = resolveScope({
      id: "uid-2",
      scope: "school",
      schoolIds: ["school-1"],
    });

    expect(canAccessSchool(scope, { schoolId: "school-3", associationId: "assoc-1" })).toBe(false);
  });

  it("blocks an unassigned user from every school", () => {
    expect(
      canAccessSchool(resolveScope(null), { schoolId: "school-1", associationId: "assoc-1" }),
    ).toBe(false);
  });

  it("blocks a user whose scope could not be read from every school", () => {
    expect(
      canAccessSchool(SCOPE_UNAVAILABLE, { schoolId: "school-1", associationId: "assoc-1" }),
    ).toBe(false);
  });
});

describe("hasTenancy", () => {
  it("is true for an association scope", () => {
    expect(hasTenancy({ kind: "association", associationId: "assoc-1" })).toBe(true);
  });

  it("is true for a school scope", () => {
    expect(hasTenancy({ kind: "school", schoolIds: ["school-1"] })).toBe(true);
  });

  it("is false for an unassigned user", () => {
    expect(hasTenancy(resolveScope(null))).toBe(false);
  });

  it("is false when the scope could not be read", () => {
    expect(hasTenancy(SCOPE_UNAVAILABLE)).toBe(false);
  });
});
