import * as os from "os";
import * as path from "path";

import * as fsExtra from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";

import { verifyGamePathMarkers } from "./gamePathValidation";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const tempDir = await fsExtra.mkdtemp(path.join(os.tmpdir(), "vortex-game-path-"));
  tempDirs.push(tempDir);
  return tempDir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((tempDir) => fsExtra.remove(tempDir)));
});

describe("verifyGamePathMarkers", () => {
  it("accepts classic Skyrim when TESV.exe exists", async () => {
    const gamePath = await makeTempDir();
    await fsExtra.ensureFile(path.join(gamePath, "TESV.exe"));

    await expect(verifyGamePathMarkers("skyrim", gamePath, ["TESV.exe"])).resolves.toBeUndefined();
  });

  it("accepts Skyrim SE on Linux when the game data marker exists without the executable", async () => {
    const gamePath = await makeTempDir();
    await fsExtra.ensureFile(path.join(gamePath, "Data", "Skyrim.esm"));

    await expect(
      verifyGamePathMarkers("skyrimse", gamePath, ["SkyrimSE.exe"]),
    ).resolves.toBeUndefined();
  });

  it("accepts Linux marker paths with different casing", async () => {
    const gamePath = await makeTempDir();
    await fsExtra.ensureFile(path.join(gamePath, "data", "skyrim.esm"));

    await expect(
      verifyGamePathMarkers("skyrimse", gamePath, ["SkyrimSE.exe"]),
    ).resolves.toBeUndefined();
  });

  it("rejects unknown game folders when neither required files nor minimal markers exist", async () => {
    const gamePath = await makeTempDir();

    await expect(
      verifyGamePathMarkers("skyrimse", gamePath, ["SkyrimSE.exe"]),
    ).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
