/**
 * Task 3.3 — login at the screen level. Session persistence and sign out are
 * covered against the Auth emulator (`auth-tests/login.test.ts`); this pins the
 * form: valid input reaches the service, and a rejected sign-in shows a generic
 * Spanish message that never says which field was wrong.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { loginWithEmail } from "../data/auth-service";
import { AuthError } from "../model/auth-user";
import { AUTH_COPY } from "./copy";
import { LoginScreen } from "./LoginScreen";

jest.mock("../data/auth-service", () => ({
  loginWithEmail: jest.fn(),
}));

const loginMock = loginWithEmail as jest.MockedFunction<typeof loginWithEmail>;

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
});
