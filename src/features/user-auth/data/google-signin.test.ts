import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { googleWebClientId } from "../../../lib/env";
import { AuthError, type AuthUser } from "../model/auth-user";
import { signInWithGoogleToken } from "./auth-service";
import { signInWithGoogle } from "./google-signin";

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
  },
}));
jest.mock("./auth-service", () => ({ signInWithGoogleToken: jest.fn() }));
jest.mock("../../../lib/env", () => ({ googleWebClientId: jest.fn() }));

const configure = GoogleSignin.configure as jest.MockedFunction<typeof GoogleSignin.configure>;
const hasPlayServices = GoogleSignin.hasPlayServices as jest.MockedFunction<
  typeof GoogleSignin.hasPlayServices
>;
const signIn = GoogleSignin.signIn as jest.Mock;
const exchange = signInWithGoogleToken as jest.MockedFunction<typeof signInWithGoogleToken>;
const webClientId = googleWebClientId as jest.MockedFunction<typeof googleWebClientId>;

const USER: AuthUser = { uid: "uid-1", email: "profe@ulji.com.ar", displayName: "Profe" };

const successResponse = (idToken: string | null) => ({
  type: "success",
  data: { idToken, user: {}, scopes: [], serverAuthCode: null },
});

describe("signInWithGoogle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    webClientId.mockReturnValue("web-client-id");
    hasPlayServices.mockResolvedValue(true);
    exchange.mockResolvedValue(USER);
  });

  it("returns the Firebase user for a completed sign-in", async () => {
    signIn.mockResolvedValue(successResponse("google-id-token"));

    await expect(signInWithGoogle()).resolves.toEqual(USER);
  });

  it("exchanges the Google id token for a Firebase session", async () => {
    signIn.mockResolvedValue(successResponse("google-id-token"));

    await signInWithGoogle();

    expect(exchange).toHaveBeenCalledWith("google-id-token");
  });

  it("configures Google with the web client id", async () => {
    signIn.mockResolvedValue(successResponse("google-id-token"));

    await signInWithGoogle();

    // The Android client id would yield a token Firebase Auth rejects.
    expect(configure).toHaveBeenCalledWith({ webClientId: "web-client-id" });
  });

  it("checks Play Services before opening the sheet", async () => {
    signIn.mockResolvedValue(successResponse("google-id-token"));

    await signInWithGoogle();

    expect(hasPlayServices).toHaveBeenCalled();
  });

  it("reports cancellation when the user dismisses the sheet", async () => {
    signIn.mockResolvedValue({ type: "cancelled" });

    await expect(signInWithGoogle()).rejects.toMatchObject({ code: "cancelled" });
  });

  it("does not attempt a Firebase exchange when the user cancels", async () => {
    signIn.mockResolvedValue({ type: "cancelled" });

    await expect(signInWithGoogle()).rejects.toBeInstanceOf(AuthError);

    expect(exchange).not.toHaveBeenCalled();
  });

  it("fails when Google returns no id token", async () => {
    // Happens when webClientId is missing or wrong; without this guard we would
    // hand `null` to Firebase and get an opaque error instead.
    signIn.mockResolvedValue(successResponse(null));

    await expect(signInWithGoogle()).rejects.toBeInstanceOf(AuthError);
    expect(exchange).not.toHaveBeenCalled();
  });

  it("translates a native sign-in failure into an AuthError", async () => {
    signIn.mockRejectedValue({ code: "auth/network-request-failed" });

    await expect(signInWithGoogle()).rejects.toMatchObject({ code: "network-error" });
  });

  it("lets an AuthError from the Firebase exchange through unchanged", async () => {
    signIn.mockResolvedValue(successResponse("google-id-token"));
    exchange.mockRejectedValue(
      new AuthError("account-exists-with-other-provider", "already claimed"),
    );

    await expect(signInWithGoogle()).rejects.toMatchObject({
      code: "account-exists-with-other-provider",
    });
  });
});
