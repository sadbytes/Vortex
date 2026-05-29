import { afterEach, describe, expect, it, vi } from "vitest";

describe("winapiBindings", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("reports unavailable and preserves safe fallbacks on non-win32", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("linux");

    const winapi = await import("./winapiBindings.js");

    expect(winapi.isAvailable).toBe(false);
    expect(winapi.GetNativeArch()).toEqual({ nativeArch: process.arch });
    expect(winapi.SupportsAppContainer()).toBe(false);
    expect(winapi.SetProcessPreferredUILanguages(["en-US"])).toBeUndefined();
    expect(() => winapi.GetVolumePathName("/tmp")).toThrow(winapi.PlatformNotSupportedError);
  });
});
