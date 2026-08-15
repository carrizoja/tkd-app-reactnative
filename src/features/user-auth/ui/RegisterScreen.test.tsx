/**
 * Task 3.1 — registration at the screen level. The Auth emulator suite
 * (`auth-tests/registration.test.ts`) covers the data layer; here the auth
 * service is mocked so the test pins the form's behavior: valid input reaches
 * the service, a duplicate address surfaces as Spanish copy, and invalid input
 * never leaves the screen.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { registerWithEmail } from "../data/auth-service";
import { AuthError } from "../model/auth-user";
import { AUTH_COPY } from "./copy";
import { RegisterScreen } from "./RegisterScreen";

jest.mock("../data/auth-service", () => ({
  registerWithEmail: jest.fn(),
}));

const registerMock = registerWithEmail as jest.MockedFunction<
  typeof registerWithEmail
>;

const EMAIL = "profe@ulji.com.ar";
const PASSWORD = "Secret123!";

// Testing Library v14 is fully async: `render` and every `fireEvent` return a
// promise that flushes React's act queue.
async function fillAndSubmit(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText(AUTH_COPY.emailLabel), email);
  await fireEvent.changeText(
    screen.getByLabelText(AUTH_COPY.passwordLabel),
    password,
  );
  await fireEvent.press(screen.getByText(AUTH_COPY.submitRegister));
}

describe("RegisterScreen", () => {
  beforeEach(() => {
    registerMock.mockReset();
  });

  it("registers with the submitted credentials", async () => {
    registerMock.mockResolvedValue({ uid: "uid-1", email: EMAIL, displayName: null });
    await render(<RegisterScreen />);

    await fillAndSubmit(EMAIL, PASSWORD);

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith(EMAIL, PASSWORD);
    });
  });

  it("reports a duplicate address", async () => {
    registerMock.mockRejectedValue(
      new AuthError("email-already-in-use", "That address is already taken."),
    );
    await render(<RegisterScreen />);

    await fillAndSubmit(EMAIL, PASSWORD);

    expect(
      await screen.findByText(AUTH_COPY.errors["email-already-in-use"]),
    ).toBeTruthy();
  });

  it("rejects invalid input without calling the service", async () => {
    await render(<RegisterScreen />);

    await fillAndSubmit("not-an-address", "123");

    expect(await screen.findByText(AUTH_COPY.validation.email)).toBeTruthy();
    expect(screen.getByText(AUTH_COPY.validation.passwordMin)).toBeTruthy();
    expect(registerMock).not.toHaveBeenCalled();
  });
});
