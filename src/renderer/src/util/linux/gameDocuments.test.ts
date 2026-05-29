import { describe, it, expect, vi, beforeEach } from "vitest";

let mockWineDocuments: Record<string, string> = {};
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
  resolveWineDocuments: (prefixPath: string) => {
    const resolved = mockWineDocuments[prefixPath];
    if (resolved === undefined) {
      return Promise.reject(new Error(`missing prefix: ${prefixPath}`));
    }
    return Promise.resolve(resolved);
  },
}));

import {
  resolveGameDocumentsBase,
  resolveGameMyGamesPath,
  updateGameDocumentsBase,
} from "./gameDocuments";

describe("gameDocuments", () => {
  beforeEach(() => {
    mockWineDocuments = {};
    mockLogCalls = [];
  });

  it("falls back to the native Documents folder without a resolved Wine prefix", () => {
    expect(resolveGameDocumentsBase("fallout4")).toBe("/native/documents");
    expect(resolveGameMyGamesPath("fallout4", "Fallout4")).toBe(
      "/native/documents/My Games/Fallout4",
    );
  });

  it("uses the resolved Wine Documents folder on Linux", async () => {
    mockWineDocuments["/prefix"] = "/prefix/drive_c/users/steamuser/Documents";

    await updateGameDocumentsBase({
      skyrimse: { winePrefixPath: "/prefix" },
    });

    expect(resolveGameDocumentsBase("skyrimse")).toBe("/prefix/drive_c/users/steamuser/Documents");
    expect(resolveGameMyGamesPath("skyrimse", "Skyrim Special Edition")).toBe(
      "/prefix/drive_c/users/steamuser/Documents/My Games/Skyrim Special Edition",
    );
  });

  it("clears a cached Wine Documents folder when the prefix is removed", async () => {
    mockWineDocuments["/prefix"] = "/prefix/drive_c/users/steamuser/Documents";

    await updateGameDocumentsBase({
      falloutnv: { winePrefixPath: "/prefix" },
    });
    await updateGameDocumentsBase({
      falloutnv: {},
    });

    expect(resolveGameDocumentsBase("falloutnv")).toBe("/native/documents");
  });

  it("falls back and logs if the Wine Documents folder cannot be resolved", async () => {
    await updateGameDocumentsBase({
      oblivion: { winePrefixPath: "/missing" },
    });

    expect(resolveGameDocumentsBase("oblivion")).toBe("/native/documents");
    expect(mockLogCalls.some(([level]) => level === "warn")).toBe(true);
  });
});
