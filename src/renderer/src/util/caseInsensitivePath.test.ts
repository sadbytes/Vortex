import { afterEach, describe, expect, it, vi } from "vitest";

const fsMocks = vi.hoisted(() => ({
  access: vi.fn(),
  accessSync: vi.fn(),
  readdir: vi.fn(),
  readdirSync: vi.fn(),
}));

vi.mock("fs-extra", () => ({
  ...fsMocks,
  default: fsMocks,
}));

import { resolvePathCaseInsensitive, resolvePathCaseInsensitiveSync } from "./caseInsensitivePath";

function mockLinuxResolution() {
  fsMocks.access.mockImplementation(async (input: string) => {
    if (input === "/Games") {
      return undefined;
    }
    throw Object.assign(new Error("not found"), { code: "ENOENT" });
  });
  fsMocks.readdir.mockImplementation(async (input: string) => {
    if (input === "/Games") {
      return ["Data"];
    }
    throw Object.assign(new Error("not found"), { code: "ENOENT" });
  });
  fsMocks.accessSync.mockImplementation((input: string) => {
    if (input === "/Games") {
      return undefined;
    }
    throw Object.assign(new Error("not found"), { code: "ENOENT" });
  });
  fsMocks.readdirSync.mockImplementation((input: string) => {
    if (input === "/Games") {
      return ["Data"];
    }
    throw Object.assign(new Error("not found"), { code: "ENOENT" });
  });
}

describe("resolvePathCaseInsensitive", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.values(fsMocks).forEach((mockFn) => mockFn.mockReset());
  });

  it("stores cache entries after a cache miss", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("linux");
    mockLinuxResolution();
    const cache = new Map<string, string>();

    await expect(resolvePathCaseInsensitive("/Games/data", cache)).resolves.toBe("/Games/Data");
    expect(cache.get("/Games/data")).toBe("/Games/Data");
    expect(fsMocks.readdir).toHaveBeenCalledWith("/Games");
  });

  it("skips filesystem access on async cache hits", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("linux");
    mockLinuxResolution();
    const cache = new Map<string, string>();

    await expect(resolvePathCaseInsensitive("/Games/data", cache)).resolves.toBe("/Games/Data");

    fsMocks.access.mockReset();
    fsMocks.readdir.mockReset();

    await expect(resolvePathCaseInsensitive("/Games/data", cache)).resolves.toBe("/Games/Data");
    expect(fsMocks.access).not.toHaveBeenCalled();
    expect(fsMocks.readdir).not.toHaveBeenCalled();
  });

  it("still resolves paths when no cache is provided", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("linux");
    mockLinuxResolution();

    await expect(resolvePathCaseInsensitive("/Games/data")).resolves.toBe("/Games/Data");
    expect(fsMocks.readdir).toHaveBeenCalledWith("/Games");
  });

  it("skips filesystem access on sync cache hits", () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("linux");
    const cache = new Map<string, string>([["/Games/data", "/Games/Data"]]);

    expect(resolvePathCaseInsensitiveSync("/Games/data", cache)).toBe("/Games/Data");
    expect(fsMocks.accessSync).not.toHaveBeenCalled();
    expect(fsMocks.readdirSync).not.toHaveBeenCalled();
  });

  it("is a no-op on non-linux platforms regardless of cache", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    const cache = new Map<string, string>();

    await expect(resolvePathCaseInsensitive("C:\\Games\\Data", cache)).resolves.toBe(
      "C:\\Games\\Data",
    );
    expect(resolvePathCaseInsensitiveSync("C:\\Games\\Data", cache)).toBe("C:\\Games\\Data");
    expect(cache.size).toBe(0);
    expect(fsMocks.access).not.toHaveBeenCalled();
    expect(fsMocks.accessSync).not.toHaveBeenCalled();
    expect(fsMocks.readdir).not.toHaveBeenCalled();
    expect(fsMocks.readdirSync).not.toHaveBeenCalled();
  });
});
