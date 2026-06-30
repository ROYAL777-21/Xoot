import { render, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NativeInteractionLayer } from "./NativeInteractionLayer";

// ---------------------------------------------------------------------------
// Mock useNavigate so we can spy on navigation calls without a real router
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// ---------------------------------------------------------------------------
// Module-level Capacitor mocks
//
// We define a mutable "config" object that each mock factory reads at call
// time, so individual tests can control behaviour without re-mocking.
// ---------------------------------------------------------------------------

type AppUrlOpenCb = (event: { url?: string }) => void;
type PushActionCb = (event: { notification?: Record<string, unknown> }) => void;

// Stored callbacks so tests can invoke them imperatively
let capturedAppUrlOpenCb: AppUrlOpenCb | null = null;
let capturedPushActionCb: PushActionCb | null = null;

const appRemoveHandle = { remove: vi.fn() };
const pushRemoveHandle = { remove: vi.fn() };

const appMock = {
  getLaunchUrl: vi.fn().mockResolvedValue(null),
  addListener: vi.fn().mockImplementation((_event: string, cb: AppUrlOpenCb) => {
    capturedAppUrlOpenCb = cb;
    return Promise.resolve(appRemoveHandle);
  }),
};

const pushMock = {
  addListener: vi.fn().mockImplementation((_event: string, cb: PushActionCb) => {
    capturedPushActionCb = cb;
    return Promise.resolve(pushRemoveHandle);
  }),
};

vi.mock("@capacitor/app", () => ({ App: appMock }));
vi.mock("@capacitor/push-notifications", () => ({ PushNotifications: pushMock }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const renderLayer = () =>
  render(
    <MemoryRouter>
      <NativeInteractionLayer />
    </MemoryRouter>,
  );

const fireNativeRoute = (detail: unknown) =>
  window.dispatchEvent(new CustomEvent("zoot:native-route", { detail }));

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  capturedAppUrlOpenCb = null;
  capturedPushActionCb = null;

  // Default: no launch URL
  appMock.getLaunchUrl.mockResolvedValue(null);
  appMock.addListener.mockImplementation((_event: string, cb: AppUrlOpenCb) => {
    capturedAppUrlOpenCb = cb;
    return Promise.resolve(appRemoveHandle);
  });
  pushMock.addListener.mockImplementation((_event: string, cb: PushActionCb) => {
    capturedPushActionCb = cb;
    return Promise.resolve(pushRemoveHandle);
  });
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("NativeInteractionLayer – rendering", () => {
  it("renders nothing into the DOM", () => {
    const { container } = renderLayer();
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// zoot:native-route custom event handling
// ---------------------------------------------------------------------------

describe("NativeInteractionLayer – zoot:native-route custom events", () => {
  it("navigates when the event detail is a recognized path string", async () => {
    renderLayer();
    act(() => fireNativeRoute("/app/loyalty"));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/app/loyalty"));
  });

  it("navigates when the event detail is a structured push payload", async () => {
    renderLayer();
    act(() => fireNativeRoute({ type: "booking_update", bookingId: "bk-evt" }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/app/bookings/bk-evt"));
  });

  it("navigates for a zoot:// URL in the event detail", async () => {
    renderLayer();
    act(() => fireNativeRoute("zoot://bookings/bk-zoot"));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/app/bookings/bk-zoot"));
  });

  it("does not navigate when the event detail resolves to null (unknown route)", async () => {
    renderLayer();
    act(() => fireNativeRoute("/admin/ops"));
    // Small delay to let async work settle
    await new Promise((r) => setTimeout(r, 10));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("does not navigate when the event detail is null", async () => {
    renderLayer();
    act(() => fireNativeRoute(null));
    await new Promise((r) => setTimeout(r, 10));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("handles multiple consecutive events correctly", async () => {
    renderLayer();
    act(() => {
      fireNativeRoute("/app/loyalty");
      fireNativeRoute({ screen: "support" });
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenNthCalledWith(1, "/app/loyalty");
      expect(mockNavigate).toHaveBeenNthCalledWith(2, "/app/support");
    });
  });
});

// ---------------------------------------------------------------------------
// Event listener cleanup on unmount
// ---------------------------------------------------------------------------

describe("NativeInteractionLayer – cleanup on unmount", () => {
  it("stops reacting to zoot:native-route events after unmount", async () => {
    const { unmount } = renderLayer();
    unmount();

    act(() => fireNativeRoute("/app/loyalty"));
    await new Promise((r) => setTimeout(r, 10));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("calls remove() on the Capacitor App listener handle when unmounted", async () => {
    const { unmount } = renderLayer();
    await waitFor(() => expect(appMock.addListener).toHaveBeenCalled());
    unmount();
    await waitFor(() => expect(appRemoveHandle.remove).toHaveBeenCalled());
  });

  it("calls remove() on the PushNotifications listener handle when unmounted", async () => {
    const { unmount } = renderLayer();
    await waitFor(() => expect(pushMock.addListener).toHaveBeenCalled());
    unmount();
    await waitFor(() => expect(pushRemoveHandle.remove).toHaveBeenCalled());
  });
});

// ---------------------------------------------------------------------------
// Capacitor App – launch URL
// ---------------------------------------------------------------------------

describe("NativeInteractionLayer – Capacitor App launch URL", () => {
  it("navigates to the launch URL when the app starts with a deep link", async () => {
    appMock.getLaunchUrl.mockResolvedValue({
      url: "https://zoot.co.za/app/bookings/bk-launch",
    });

    renderLayer();
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/app/bookings/bk-launch"),
    );
  });

  it("does not navigate when getLaunchUrl returns null", async () => {
    appMock.getLaunchUrl.mockResolvedValue(null);

    renderLayer();
    await new Promise((r) => setTimeout(r, 20));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("does not navigate when the launch URL is not a recognized route", async () => {
    appMock.getLaunchUrl.mockResolvedValue({
      url: "https://zoot.co.za/admin/panel",
    });

    renderLayer();
    await new Promise((r) => setTimeout(r, 20));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("navigates using a zoot:// launch URL", async () => {
    appMock.getLaunchUrl.mockResolvedValue({ url: "zoot://bookings/bk-deep" });

    renderLayer();
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/app/bookings/bk-deep"),
    );
  });
});

// ---------------------------------------------------------------------------
// Capacitor App – appUrlOpen listener
// ---------------------------------------------------------------------------

describe("NativeInteractionLayer – Capacitor App appUrlOpen listener", () => {
  it("registers an appUrlOpen listener with the Capacitor App plugin", async () => {
    renderLayer();
    await waitFor(() =>
      expect(appMock.addListener).toHaveBeenCalledWith("appUrlOpen", expect.any(Function)),
    );
  });

  it("navigates when the appUrlOpen callback fires with a recognized URL", async () => {
    renderLayer();
    await waitFor(() => expect(capturedAppUrlOpenCb).not.toBeNull());

    act(() => capturedAppUrlOpenCb!({ url: "zoot://bookings/bk-url-open" }));
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/app/bookings/bk-url-open"),
    );
  });

  it("does not navigate when the appUrlOpen URL is unrecognized", async () => {
    renderLayer();
    await waitFor(() => expect(capturedAppUrlOpenCb).not.toBeNull());

    act(() => capturedAppUrlOpenCb!({ url: "https://evil.example.com/admin" }));
    await new Promise((r) => setTimeout(r, 10));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("does not navigate when appUrlOpen fires with no URL", async () => {
    renderLayer();
    await waitFor(() => expect(capturedAppUrlOpenCb).not.toBeNull());

    act(() => capturedAppUrlOpenCb!({}));
    await new Promise((r) => setTimeout(r, 10));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Capacitor PushNotifications – pushNotificationActionPerformed listener
// ---------------------------------------------------------------------------

describe("NativeInteractionLayer – Capacitor PushNotifications listener", () => {
  it("registers a pushNotificationActionPerformed listener", async () => {
    renderLayer();
    await waitFor(() =>
      expect(pushMock.addListener).toHaveBeenCalledWith(
        "pushNotificationActionPerformed",
        expect.any(Function),
      ),
    );
  });

  it("navigates using notification.data when present", async () => {
    renderLayer();
    await waitFor(() => expect(capturedPushActionCb).not.toBeNull());

    act(() =>
      capturedPushActionCb!({
        notification: { data: { type: "booking_update", bookingId: "bk-push" } },
      }),
    );
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/app/bookings/bk-push"),
    );
  });

  it("falls back to the notification object itself when notification.data is absent", async () => {
    renderLayer();
    await waitFor(() => expect(capturedPushActionCb).not.toBeNull());

    act(() =>
      capturedPushActionCb!({ notification: { screen: "loyalty" } }),
    );
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/app/loyalty"),
    );
  });

  it("does not navigate for a push notification with an unrecognized payload", async () => {
    renderLayer();
    await waitFor(() => expect(capturedPushActionCb).not.toBeNull());

    act(() => capturedPushActionCb!({ notification: { category: "unknown_cat" } }));
    await new Promise((r) => setTimeout(r, 10));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("handles a push notification with a nested zoot_cred event type", async () => {
    renderLayer();
    await waitFor(() => expect(capturedPushActionCb).not.toBeNull());

    act(() =>
      capturedPushActionCb!({
        notification: { data: { event_type: "zoot_cred" } },
      }),
    );
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/app/loyalty"),
    );
  });
});

// ---------------------------------------------------------------------------
// Disposed flag: prevent navigation after unmount
// ---------------------------------------------------------------------------

describe("NativeInteractionLayer – disposed flag", () => {
  it("does not navigate from a delayed launch URL after unmount", async () => {
    let resolveLaunchUrl!: (v: { url: string } | null) => void;
    appMock.getLaunchUrl.mockReturnValue(
      new Promise<{ url: string } | null>((r) => {
        resolveLaunchUrl = r;
      }),
    );

    const { unmount } = renderLayer();
    // Unmount before the promise resolves
    unmount();

    act(() => resolveLaunchUrl({ url: "https://zoot.co.za/app/loyalty" }));
    await new Promise((r) => setTimeout(r, 20));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});