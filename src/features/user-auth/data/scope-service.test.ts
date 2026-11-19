import type { Membership } from "../model/membership";
import { loadUserScope } from "./scope-service";

// `./repository` pulls in the Firestore SDK, whose ESM build the jest-expo
// preset cannot transform. Every test below injects its own `fetchMembership`,
// so this stub only keeps the SDK out of the module graph — no assertion here
// depends on it. Same boundary-mocking approach as `LoginScreen.test.tsx`.
jest.mock("./repository", () => ({ getMembership: jest.fn() }));

describe("loadUserScope", () => {
  it("resolves the scope from the user's membership document", async () => {
    const fetchMembership = async (): Promise<Membership> => ({
      id: "uid-1",
      scope: "school",
      schoolIds: ["school-1"],
    });

    await expect(loadUserScope("uid-1", fetchMembership)).resolves.toEqual({
      kind: "school",
      schoolIds: ["school-1"],
    });
  });

  it("reads the membership belonging to the signed-in uid", async () => {
    const requested: string[] = [];
    const fetchMembership = async (uid: string): Promise<Membership | null> => {
      requested.push(uid);
      return null;
    };

    await loadUserScope("uid-42", fetchMembership);

    expect(requested).toEqual(["uid-42"]);
  });

  it("falls back to unassigned when the user has no membership yet", async () => {
    await expect(loadUserScope("uid-2", async () => null)).resolves.toEqual({
      kind: "unassigned",
    });
  });

  it("fails closed to unavailable when the membership read is denied", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMembership = async (): Promise<Membership | null> => {
      throw new Error("permission-denied");
    };

    try {
      // Distinct from `unassigned`: the user may well have a membership, we
      // just could not read it. The UI must offer a retry, not "ask your admin".
      await expect(loadUserScope("uid-3", fetchMembership)).resolves.toEqual({
        kind: "unavailable",
      });
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
