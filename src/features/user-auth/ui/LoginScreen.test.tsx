/**
 * Task 3.3 — login at the screen level. Session persistence and sign out are
 * covered against the Auth emulator (`auth-tests/login.test.ts`); this pins the
 * form: valid input reaches the service, and a rejected sign-in shows a generic
 * Spanish message that never says which field was wrong.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { loginWithEmail } from "../data/auth-service";
import { signInWithGoogle } from "../data/google-signin";
import { AuthError } from "../model/auth-user";
import { AUTH_COPY } from "./copy";
import { LoginScreen } from "./LoginScreen";

jest.mock("../data/auth-service", () => ({
  loginWithEmail: jest.fn(),
}));
jest.mock("../data/google-signin", () => ({
  signInWithGoogle: jest.fn(),
}));

const loginMock = loginWithEmail as jest.MockedFunction<typeof loginWithEmail>;
const googleMock = signInWithGoogle as jest.MockedFunction<typeof signInWithGoogle>;

const EMAIL = "profe@ulji.com.ar";
const PASSWORD = "Secret123!";

async function fillAndSubmit(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText(AUTH_COPY.emailLabel), email);
  await fireEvent.changeText(
    screen.getByLabelText(AUTH_COPY.passwordLabel),
    password,
  );
  await fireEvent.press(screen.getByText(AUTH_COPY.submitLogin));
}

describe("LoginScreen", () => {
  beforeEach(() => {
    loginMock.mockReset();
    googleMock.mockReset();
    googleMock.mockResolvedValue({ uid: "uid-1", email: EMAIL, displayName: null });
  });

  it("signs in with the submitted credentials", async () => {
    loginMock.mockResolvedValue({ uid: "uid-1", email: EMAIL, displayName: null });
    await render(<LoginScreen />);

    await fillAndSubmit(EMAIL, PASSWORD);

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith(EMAIL, PASSWORD);
    });
  });

  it("shows a generic error that does not reveal the failing field", async () => {
    loginMock.mockRejectedValue(
      new AuthError("invalid-credentials", "Invalid credentials."),
    );
    await render(<LoginScreen />);

    await fillAndSubmit(EMAIL, "WrongPass9!");

    const message = await screen.findByText(
      AUTH_COPY.errors["invalid-credentials"],
    );
    expect(message).toBeTruthy();
    expect(screen.queryByText(AUTH_COPY.validation.email)).toBeNull();
  });

  it("requires both fields before calling the service", async () => {
    await render(<LoginScreen />);

    await fillAndSubmit(EMAIL, "");

    expect(
      await screen.findByText(AUTH_COPY.validation.passwordRequired),
    ).toBeTruthy();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("offers Google as an alternative to the password form", async () => {
    await render(<LoginScreen />);

    expect(screen.getByText(AUTH_COPY.continueWithGoogle)).toBeTruthy();
  });

  it("starts the Google flow when that button is pressed", async () => {
    await render(<LoginScreen />);

    await fireEvent.press(screen.getByText(AUTH_COPY.continueWithGoogle));

    await waitFor(() => {
      expect(googleMock).toHaveBeenCalledTimes(1);
    });
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("stays silent when the user dismisses the Google sheet", async () => {
    googleMock.mockRejectedValue(new AuthError("cancelled", "dismissed"));
    await render(<LoginScreen />);

    await fireEvent.press(screen.getByText(AUTH_COPY.continueWithGoogle));

    // Backing out of the sheet is a deliberate user action, not a failure.
    await waitFor(() => {
      expect(googleMock).toHaveBeenCalled();
    });
    expect(screen.queryByText(AUTH_COPY.errors.cancelled)).toBeNull();
    expect(screen.queryByText(AUTH_COPY.errors.unknown)).toBeNull();
  });

  it("explains when the address already belongs to another provider", async () => {
    googleMock.mockRejectedValue(
      new AuthError("account-exists-with-other-provider", "already claimed"),
    );
    await render(<LoginScreen />);

    await fireEvent.press(screen.getByText(AUTH_COPY.continueWithGoogle));

    expect(
      await screen.findByText(AUTH_COPY.errors["account-exists-with-other-provider"]),
    ).toBeTruthy();
  });
});
