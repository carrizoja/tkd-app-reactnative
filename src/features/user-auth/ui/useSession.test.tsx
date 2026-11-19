import { act, renderHook } from "@testing-library/react-native";
import type { SessionState } from "../data/session";
import { observeSession } from "../data/session";
import { useSession } from "./useSession";

jest.mock("../data/session", () => ({ observeSession: jest.fn() }));

const observeSessionMock = observeSession as jest.MockedFunction<typeof observeSession>;

const USER = { uid: "uid-1", email: "profe@ulji.com.ar", displayName: null };
const ACTIVE: SessionState = {
  status: "active",
  user: USER,
  scope: { kind: "school", schoolIds: ["school-1"] },
};

/** Captures the listener so the test can drive session changes by hand. */
function captureListener() {
  let listener: (state: SessionState) => void = () => {};
  const unsubscribe = jest.fn();
  observeSessionMock.mockImplementation((l) => {
    listener = l;
    return unsubscribe;
  });
  return {
    emit: (state: SessionState) => act(async () => listener(state)),
    unsubscribe,
  };
}

describe("useSession", () => {
  beforeEach(() => {
    observeSessionMock.mockReset();
  });

  it("starts in loading before the observer reports", async () => {
    captureListener();

    const { result } = await renderHook(() => useSession());

    expect(result.current.session).toEqual({ status: "loading" });
  });

  it("exposes the latest session state", async () => {
    const { emit } = captureListener();
    const { result } = await renderHook(() => useSession());

    await emit(ACTIVE);

    expect(result.current.session).toEqual(ACTIVE);
  });

  it("unsubscribes when the component unmounts", async () => {
    const { unsubscribe } = captureListener();
    const { unmount } = await renderHook(() => useSession());

    await unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("subscribes once across re-renders", async () => {
    captureListener();
    const { rerender } = await renderHook(() => useSession());

    await rerender({});

    expect(observeSessionMock).toHaveBeenCalledTimes(1);
  });

  it("re-subscribes when refresh is called, re-reading the scope", async () => {
    captureListener();
    const { result } = await renderHook(() => useSession());

    await act(async () => result.current.refresh());

    // A user assigned a membership while signed in has no other way to pick it
    // up: scope is resolved once per subscription.
    expect(observeSessionMock).toHaveBeenCalledTimes(2);
  });

  it("tears down the previous subscription on refresh", async () => {
    const { unsubscribe } = captureListener();
    const { result } = await renderHook(() => useSession());

    await act(async () => result.current.refresh());

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
