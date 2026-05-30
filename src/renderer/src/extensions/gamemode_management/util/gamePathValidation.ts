import * as path from "path";

import { getErrorCode } from "@vortex/shared";
import * as fsExtra from "fs-extra";

import { map } from "../../../util/asyncpromise";
import { resolvePathCaseInsensitive } from "../../../util/caseInsensitivePath";
const minimalLinuxGameMarkers: { [gameId: string]: string[][] } = {
  skyrim: [[path.join("Data", "Skyrim.esm")]],
  skyrimse: [[path.join("Data", "Skyrim.esm")]],
  skyrimvr: [[path.join("Data", "SkyrimVR.esm")], [path.join("Data", "Skyrim.esm")]],
};

function statExact(filePath: string): Promise<fsExtra.Stats> {
  return Promise.resolve(fsExtra.stat(filePath));
}

function statRelativePath(root: string, relativePath: string): Promise<fsExtra.Stats> {
  const exactPath = path.join(root, relativePath);
  return statExact(exactPath).catch((err) => {
    if (process.platform === "win32" || getErrorCode(err) !== "ENOENT") {
      return Promise.reject(err);
    }

    // on a case-sensitive FS, retry against the on-disk casing. Missing
    // segments keep their original casing, so the follow-up stat still
    // rejects with ENOENT just as a direct stat would.
    return Promise.resolve(resolvePathCaseInsensitive(exactPath)).then((resolved) =>
      statExact(resolved),
    );
  });
}

function verifyFiles(gamePath: string, files: string[]): Promise<void> {
  return map(files || [], (file) => statRelativePath(gamePath, file)).then(() => undefined);
}

function verifyMinimalLinuxMarkers(gameId: string, gamePath: string): Promise<void> {
  const markerGroups = process.platform === "linux" ? minimalLinuxGameMarkers[gameId] : undefined;

  if (markerGroups === undefined) {
    return Promise.reject(new Error("no minimal linux markers configured"));
  }

  return Promise.any(markerGroups.map((markers) => verifyFiles(gamePath, markers))).then(
    () => undefined,
  );
}

export function verifyGamePathMarkers(
  gameId: string,
  gamePath: string,
  requiredFiles: string[],
): Promise<void> {
  return verifyFiles(gamePath, requiredFiles).catch((err) => {
    if (getErrorCode(err) !== "ENOENT") {
      return undefined;
    }

    return verifyMinimalLinuxMarkers(gameId, gamePath).catch(() => Promise.reject(err));
  });
}
