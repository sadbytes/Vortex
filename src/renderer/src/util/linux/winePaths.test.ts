import { describe, it, expect, vi, beforeEach } from "vitest";

let mockUserName = "testuser";
vi.mock("os", () => ({
  userInfo: () => ({ username: mockUserName }),
}));

let mockDirEntries: Record<string, string[]> = {};
let mockLogCalls: Array<[string, string, any]> = [];

vi.mock("../fs", () => ({
  readdirAsync: (dirPath: string) => {
    const entries = mockDirEntries[dirPath];
    if (entries === undefined) {
      return Promise.reject(new Error(`ENOENT: ${dirPath}`));
    }
    return Promise.resolve(entries);
  },
}));

vi.mock("../log", () => ({
  log: (...args: any[]) => {
    mockLogCalls.push(args as [string, string, any]);
  },
}));

import { resolveWineLocalAppData, resolveWineAppData, resolveWineDocuments } from "./winePaths";

describe("winePaths", () => {
  beforeEach(() => {
    mockDirEntries = {};
    mockLogCalls = [];
    mockUserName = "testuser";
  });

  describe("Proton prefix layout (steamuser)", () => {
    const prefix = "/home/testuser/.steam/steam/steamapps/compatdata/489830/pfx";

    beforeEach(() => {
      mockDirEntries[`${prefix}/drive_c/users`] = ["Public", "steamuser"];
    });

    it("resolves LocalAppData", async () => {
      expect(await resolveWineLocalAppData(prefix)).toBe(
        `${prefix}/drive_c/users/steamuser/AppData/Local`,
      );
    });

    it("resolves AppData (Roaming)", async () => {
      expect(await resolveWineAppData(prefix)).toBe(
        `${prefix}/drive_c/users/steamuser/AppData/Roaming`,
      );
    });

    it("resolves Documents", async () => {
      expect(await resolveWineDocuments(prefix)).toBe(
        `${prefix}/drive_c/users/steamuser/Documents`,
      );
    });
  });

  describe("Heroic prefix layout (linux username)", () => {
    const prefix = "/home/testuser/Games/Heroic/Prefixes/default/Skyrim AE";

    beforeEach(() => {
      mockDirEntries[`${prefix}/drive_c/users`] = ["Public", "testuser"];
    });

    it("prefers linux username over steamuser", async () => {
      mockDirEntries[`${prefix}/drive_c/users`] = ["Public", "steamuser", "testuser"];
      expect(await resolveWineLocalAppData(prefix)).toBe(
        `${prefix}/drive_c/users/testuser/AppData/Local`,
      );
    });

    it("resolves Documents", async () => {
      expect(await resolveWineDocuments(prefix)).toBe(`${prefix}/drive_c/users/testuser/Documents`);
    });
  });

  describe("fallback behavior", () => {
    const prefix = "/tmp/wineprefix";

    it("falls back to first non-Public entry when neither linux user nor steamuser exists", async () => {
      mockDirEntries[`${prefix}/drive_c/users`] = ["Public", "customuser"];
      expect(await resolveWineLocalAppData(prefix)).toBe(
        `${prefix}/drive_c/users/customuser/AppData/Local`,
      );
      expect(mockLogCalls.some(([level]) => level === "info")).toBe(true);
    });

    it("throws when no user directories exist", async () => {
      mockDirEntries[`${prefix}/drive_c/users`] = ["Public"];
      await expect(resolveWineLocalAppData(prefix)).rejects.toThrow("No user directories found");
    });

    it("throws when users directory is missing", async () => {
      await expect(resolveWineLocalAppData(prefix)).rejects.toThrow("ENOENT");
      expect(
        mockLogCalls.some(([level, msg]) => level === "warn" && msg.includes("no users directory")),
      ).toBe(true);
    });
  });
});
