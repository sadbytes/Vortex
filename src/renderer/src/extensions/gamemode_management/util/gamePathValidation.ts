import * as path from "path";

import { getErrorCode } from "@vortex/shared";
import PromiseBB from "bluebird";
import * as fsExtra from "fs-extra";

import { resolvePathCaseInsensitive } from "../../../util/caseInsensitivePath";

const minimalLinuxGameMarkers: { [gameId: string]: string[][] } = {
  skyrim: [[path.join("Data", "Skyrim.esm")]],
  skyrimse: [[path.join("Data", "Skyrim.esm")]],
  skyrimvr: [[path.join("Data", "SkyrimVR.esm")], [path.join("Data", "Skyrim.esm")]],
};

function statExact(filePath: string): PromiseBB<fsExtra.Stats> {
  return PromiseBB.resolve(fsExtra.stat(filePath));
}

function statRelativePath(root: string, relativePath: string): PromiseBB<fsExtra.Stats> {
  const exactPath = path.join(root, relativePath);
  return statExact(exactPath).catch((err) => {
    if (process.platform === "win32" || getErrorCode(err) !== "ENOENT") {
      return PromiseBB.reject(err);
    }

    // on a case-sensitive FS, retry against the on-disk casing. Missing
    // segments keep their original casing, so the follow-up stat still
    // rejects with ENOENT just as a direct stat would.
    return PromiseBB.resolve(resolvePathCaseInsensitive(exactPath)).then((resolved) =>
      statExact(resolved),
    );
  });
}

function verifyFiles(gamePath: string, files: string[]): PromiseBB<void> {
  return PromiseBB.map(files || [], (file) => statRelativePath(gamePath, file)).then(
    () => undefined,
  );
}

function verifyMinimalLinuxMarkers(gameId: string, gamePath: string): PromiseBB<void> {
  const markerGroups = process.platform === "linux" ? minimalLinuxGameMarkers[gameId] : undefined;

  if (markerGroups === undefined) {
    return PromiseBB.reject(new Error("no minimal linux markers configured"));
  }

  return PromiseBB.any(markerGroups.map((markers) => verifyFiles(gamePath, markers))).then(
    () => undefined,
  );
}

export function verifyGamePathMarkers(
  gameId: string,
  gamePath: string,
  requiredFiles: string[],
): PromiseBB<void> {
  return verifyFiles(gamePath, requiredFiles).catch((err) => {
    if (getErrorCode(err) !== "ENOENT") {
      return undefined;
    }

    return verifyMinimalLinuxMarkers(gameId, gamePath).catch(() => PromiseBB.reject(err));
  });
}
