import { describe, expect, it } from "vitest";

import { getWinePrefixPathForGameStoreEntry } from "./steamGameStoreEntry";

describe("getWinePrefixPathForGameStoreEntry", () => {
  it("returns the Proton prefix path for Proton Steam entries", () => {
    expect(
      getWinePrefixPathForGameStoreEntry({
        usesProton: true,
        compatDataPath: "/home/user/.steam/steam/steamapps/compatdata/489830",
      }),
    ).toBe("/home/user/.steam/steam/steamapps/compatdata/489830/pfx");
  });

  it("does not return a prefix for native entries", () => {
    expect(
      getWinePrefixPathForGameStoreEntry({
        usesProton: false,
        compatDataPath: "/home/user/.steam/steam/steamapps/compatdata/489830",
      }),
    ).toBeUndefined();
  });
});
