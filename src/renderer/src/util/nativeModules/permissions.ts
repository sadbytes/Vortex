import { constants } from "node:fs";
import { chmod, stat } from "node:fs/promises";

export function getUserId(): string {
  if (process.platform === "win32") {
    const permissions = eval("require")("permissions");
    return permissions.default?.getUserId?.() ?? permissions.getUserId();
  }
  return typeof process.getuid === "function" ? process.getuid().toString() : "";
}

export async function allow(
  targetPath: string,
  userId: string,
  accessMode: string,
  options?: unknown,
) {
  if (process.platform === "win32") {
    const permissions = eval("require")("permissions");
    return (
      permissions.default?.allow?.(targetPath, userId, accessMode, options) ??
      permissions.allow(targetPath, userId, accessMode, options)
    );
  }

  const currentMode = (await stat(targetPath)).mode;
  const requestedMode =
    (accessMode.includes("r") ? constants.S_IRGRP | constants.S_IROTH : 0) |
    (accessMode.includes("w") ? constants.S_IWGRP | constants.S_IWOTH : 0) |
    (accessMode.includes("x") ? constants.S_IXGRP | constants.S_IXOTH : 0);
  await chmod(targetPath, currentMode | requestedMode);
}

export default {
  allow,
  getUserId,
};
