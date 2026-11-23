import { fireEvent, render, screen } from "@testing-library/react-native";
import { signOutUser } from "../features/user-auth/data/auth-service";
import type { SessionState } from "../features/user-auth/data/session";
import type { UserScope } from "../features/user-auth/model/scope";
import { AUTH_COPY, SESSION_COPY } from "../features/user-auth/ui/copy";
import { useSession } from "../features/user-auth/ui/useSession";
import { schoolService } from "../features/school-management/data/repository";
import { SCHOOL_COPY } from "../features/school-management/ui/copy";
import { RootNavigator } from "./RootNavigator";

jest.mock("../features/user-auth/ui/useSession", () => ({ useSession: jest.fn() }));
jest.mock("../features/user-auth/data/auth-service", () => ({
  loginWithEmail: jest.fn(),
  registerWithEmail: jest.fn(),
  signOutUser: jest.fn(),
}));
// LoginScreen reaches the Google native module, which has no JS implementation
// under jest. The gate tests never exercise the Google flow itself.
jest.mock("../features/user-auth/data/google-signin", () => ({
  signInWithGoogle: jest.fn(),
}));

// The school screens reach Firestore through the school service; the gate tests
// only need its list call.
jest.mock("../features/school-management/data/repository", () => ({
  schoolService: { listSchools: jest.fn() },
}));
// The student screens are registered as routes; keep the Firebase SDK and the
// native image and date pickers out of the module graph. The gate tests never open them.
jest.mock("../features/student-management/data/repository", () => ({ studentService: {} }));
jest.mock("../features/student-management/ui/pickPhoto", () => ({ pickPhoto: jest.fn() }));
jest.mock("../features/student-management/ui/openDatePicker", () => ({ openDatePicker: jest.fn() }));
jest.mock("../features/class-management/data/repository", () => ({ classService: {} }));
jest.mock("../features/class-management/ui/openTimePicker", () => ({ openTimePicker: jest.fn() }));
jest.mock("../features/attendance-tracking/data/repository", () => ({ attendanceService: {} }));
jest.mock("../features/fee-management/data/repository", () => ({ feeService: {} }));
jest.mock("../features/event-calendar/data/repository", () => ({ eventService: {} }));

const listSchoolsMock = schoolService.listSchools as jest.MockedFunction<typeof schoolService.listSchools>;
const useSessionMock = useSession as jest.MockedFunction<typeof useSession>;
const signOutUserMock = signOutUser as jest.MockedFunction<typeof signOutUser>;

const USER = { uid: "uid-1", email: "profe@ulji.com.ar", displayName: null };
const refresh = jest.fn();

function givenSession(session: SessionState) {
  useSessionMock.mockReturnValue({ session, refresh });
}

const activeWith = (scope: UserScope): SessionState => ({
  status: "active",
  user: USER,
  scope,
});

describe("RootNavigator auth gate", () => {
  beforeEach(() => {
    useSessionMock.mockReset();
    signOutUserMock.mockReset();
    signOutUserMock.mockResolvedValue();
    refresh.mockReset();
  });

  it("shows the splash while the session is still unknown", async () => {
    givenSession({ status: "loading" });

    await render(<RootNavigator />);

    expect(screen.getByText(SESSION_COPY.loading)).toBeTruthy();
    expect(screen.queryByText(AUTH_COPY.loginTitle)).toBeNull();
  });

  it("shows the login screen when nobody is signed in", async () => {
    givenSession({ status: "signed-out" });

    await render(<RootNavigator />);

    expect(screen.getByText(AUTH_COPY.loginTitle)).toBeTruthy();
  });

  it("links the Home hub to the schools of the user's scope", async () => {
    const scope: UserScope = { kind: "school", schoolIds: ["school-1"] };
    listSchoolsMock.mockResolvedValue([{ id: "school-1", associationId: "assoc-1", name: "Escuela ULJI" }]);
    givenSession(activeWith(scope));

    await render(<RootNavigator />);
    await fireEvent.press(screen.getByText(SCHOOL_COPY.homeLink));

    expect(await screen.findByText("Escuela ULJI")).toBeTruthy();
    expect(listSchoolsMock).toHaveBeenCalledWith(scope);
  });

  it("shows the Home hub to a scoped instructor", async () => {
    givenSession(activeWith({ kind: "school", schoolIds: ["school-1"] }));

    await render(<RootNavigator />);

    expect(screen.getByTestId("home-hub")).toBeTruthy();
    expect(screen.queryByText(AUTH_COPY.loginTitle)).toBeNull();
  });

  it("keeps an unassigned user out of the Home hub and says who can fix it", async () => {
    givenSession(activeWith({ kind: "unassigned" }));

    await render(<RootNavigator />);

    expect(screen.getByText(SESSION_COPY.unassignedTitle)).toBeTruthy();
    expect(screen.queryByTestId("home-hub")).toBeNull();
  });

  it("offers a retry when the scope could not be read", async () => {
    givenSession(activeWith({ kind: "unavailable" }));

    await render(<RootNavigator />);

    // A failed read is transient — telling this user to contact an admin
    // would send them down the wrong path entirely.
    expect(screen.getByText(SESSION_COPY.unavailableTitle)).toBeTruthy();
    expect(screen.queryByText(SESSION_COPY.unassignedTitle)).toBeNull();
    expect(screen.queryByTestId("home-hub")).toBeNull();
  });

  it("re-resolves the scope when the user presses retry", async () => {
    givenSession(activeWith({ kind: "unavailable" }));
    await render(<RootNavigator />);

    await fireEvent.press(screen.getByText(SESSION_COPY.retry));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["the Home hub", { kind: "school", schoolIds: ["school-1"] }],
    ["the unassigned state", { kind: "unassigned" }],
    ["the unavailable state", { kind: "unavailable" }],
  ] satisfies [string, UserScope][])("signs out from %s", async (_surface, scope) => {
    givenSession(activeWith(scope));
    await render(<RootNavigator />);

    await fireEvent.press(screen.getByText(AUTH_COPY.signOut));

    expect(signOutUserMock).toHaveBeenCalledTimes(1);
  });

  it("reports a sign-out failure without ending the current session", async () => {
    signOutUserMock.mockRejectedValueOnce(new Error("offline"));
    givenSession(activeWith({ kind: "school", schoolIds: ["school-1"] }));
    await render(<RootNavigator />);

    await fireEvent.press(screen.getByText(AUTH_COPY.signOut));

    expect(await screen.findByText(AUTH_COPY.errors.unknown)).toBeTruthy();
    expect(screen.getByTestId("home-hub")).toBeTruthy();
  });
});
