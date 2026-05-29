import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let mockWineLocalAppData: Record<string, string> = {};
let mockLogCalls: Array<[string, string, any]> = [];

vi.mock("../getVortexPath", () => ({
  default: (name: string) => `/native/${name}`,
}));

vi.mock("../log", () => ({
  log: (...args: any[]) => {
    mockLogCalls.push(args as [string, string, any]);
  },
}));

vi.mock("./winePaths", () => ({
  resolveWineLocalAppData: (prefixPath: string) => {
    const resolved = mockWineLocalAppData[prefixPath];
    if (resolved === undefined) {
      return Promise.reject(new Error(`missing prefix: ${prefixPath}`));
    }
    return Promise.resolve(resolved);
  },
}));

import {
  resolveGameLocalAppDataBase,
  resolveGameLocalAppDataPath,
  updateGameLocalAppDataBase,
} from "./gameLocalAppData";

describe("gameLocalAppData", () => {
  const originalLocalAppData = process.env.LOCALAPPDATA;

  beforeEach(() => {
    mockWineLocalAppData = {};
    mockLogCalls = [];
    process.env.LOCALAPPDATA = "/native/localappdata";
  });

  it("falls back to the native LocalAppData folder without a resolved Wine prefix", () => {
    expect(resolveGameLocalAppDataBase("fallout4")).toBe("/native/localappdata");
    expect(resolveGameLocalAppDataPath("fallout4", "Fallout4")).toBe(
      "/native/localappdata/Fallout4",
    );
  });

  it("uses the resolved Wine LocalAppData folder on Linux", async () => {
    mockWineLocalAppData["/prefix"] = "/prefix/drive_c/users/steamuser/AppData/Local";

    await updateGameLocalAppDataBase({
      skyrimse: { winePrefixPath: "/prefix" },
    });

    expect(resolveGameLocalAppDataBase("skyrimse")).toBe(
      "/prefix/drive_c/users/steamuser/AppData/Local",
    );
    expect(resolveGameLocalAppDataPath("skyrimse", "Skyrim Special Edition")).toBe(
      "/prefix/drive_c/users/steamuser/AppData/Local/Skyrim Special Edition",
    );
  });

  it("clears a cached Wine LocalAppData folder when the prefix is removed", async () => {
    mockWineLocalAppData["/prefix"] = "/prefix/drive_c/users/steamuser/AppData/Local";

    await updateGameLocalAppDataBase({
      falloutnv: { winePrefixPath: "/prefix" },
    });
    await updateGameLocalAppDataBase({
      falloutnv: {},
    });

    expect(resolveGameLocalAppDataBase("falloutnv")).toBe("/native/localappdata");
  });

  it("falls back and logs if the Wine LocalAppData folder cannot be resolved", async () => {
    await updateGameLocalAppDataBase({
      oblivion: { winePrefixPath: "/missing" },
    });

    expect(resolveGameLocalAppDataBase("oblivion")).toBe("/native/localappdata");
    expect(mockLogCalls.some(([level]) => level === "warn")).toBe(true);
  });

  it("falls back to the native Local folder when LOCALAPPDATA is unset", () => {
    delete process.env.LOCALAPPDATA;

    expect(resolveGameLocalAppDataBase("fallout4")).toBe("/native/Local");
    expect(resolveGameLocalAppDataPath("fallout4", "Fallout4")).toBe("/native/Local/Fallout4");
  });

  afterEach(() => {
    if (originalLocalAppData === undefined) {
      delete process.env.LOCALAPPDATA;
    } else {
      process.env.LOCALAPPDATA = originalLocalAppData;
    }
  });
});
