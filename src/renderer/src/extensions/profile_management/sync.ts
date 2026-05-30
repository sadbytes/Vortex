import * as path from "path";

import { map, only } from "../../util/asyncpromise";
import { UserCanceled } from "../../util/CustomErrors";
import * as fs from "../../util/fs";
import { copyFileAtomic } from "../../util/fsAtomic";
import { log } from "../../util/log";
export function syncToProfile(
  profilePath: string,
  sourceFiles: string[],
  onError: (error: string, details: string | Error, allowReport?: boolean) => void,
): Promise<void> {
  log("debug", "sync to profile", { profilePath, sourceFiles });
  return fs
    .ensureDirAsync(profilePath)
    .then(() =>
      map(sourceFiles, (filePath: string) => {
        const destPath = path.join(profilePath, path.basename(filePath));
        return copyFileAtomic(filePath, destPath)
          .catch(
            only(UserCanceled, () => {
              log("warn", "user canceled profile sync. That's not great...");
            }),
          )
          .catch((err: any) => {
            log("warn", "failed to copy to profile", { filePath, destPath });
            if (err.code !== "EBADF") {
              // EBADF would indicate the file doesn't exist, which isn't a problem,
              // it's as if the file was empty
              onError("failed to sync to profile: " + filePath, err);
            }
          });
      }),
    )
    .then(() => {
      log("debug", "sync to profile complete");
    })
    .catch((err: any) => Promise.reject(new Error("failed to sync to profile: " + err.message)));
}

export function syncFromProfile(
  profilePath: string,
  sourceFiles: string[],
  onError: (error: string, details: string | Error, allowReport?: boolean) => void,
): Promise<void> {
  log("debug", "sync from profile", { profilePath, sourceFiles });
  return map(sourceFiles, (filePath: string) => {
    const srcPath = path.join(profilePath, path.basename(filePath));
    return copyFileAtomic(srcPath, filePath)
      .catch(
        only(UserCanceled, () => {
          log("warn", "user canceled profile sync. That's not great...");
        }),
      )
      .catch((err: any) => {
        if (err.code === "EPERM") {
          onError("failed to sync from profile", `${filePath} is write protected`, false);
        } else if (err.code !== "ENOENT") {
          onError("failed to sync from profile", err);
        }
      });
  })
    .then(() => {
      log("debug", "sync from profile complete");
    })
    .catch((err: any) => Promise.reject(new Error("failed from sync to profile: " + err.message)));
}
