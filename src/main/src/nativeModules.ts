import { constants } from "node:fs";
import { access, chmod, stat } from "node:fs/promises";
import { createRequire } from "node:module";

type NativeFunction = (...args: unknown[]) => unknown;
type RegistryValue = {
  type: string;
  value: { toString(): string } | number;
};
type NativeModule = Record<string | symbol, NativeFunction | undefined> & {
  RegGetValue?: (root: string, key: string, value: string) => RegistryValue;
  SetProcessPreferredUILanguages?: (languages: string[]) => unknown;
};
type AdminCheck = () => Promise<boolean>;
type PermissionsModule = {
  default?: {
    allow?: (
      targetPath: string,
      userId: string,
      accessMode: string,
      options?: unknown,
    ) => Promise<unknown>;
  };
  allow: (
    targetPath: string,
    userId: string,
    accessMode: string,
    options?: unknown,
  ) => Promise<unknown>;
};

const nativeRequire = createRequire(import.meta.url);

export class PlatformNotSupportedError extends Error {
  constructor(moduleName: string, exportName: string | symbol) {
    super(`${String(exportName)} from ${moduleName} is not supported on ${process.platform}`);
    this.name = "PlatformNotSupportedError";
  }
}

function unsupportedModule(moduleName: string): NativeModule {
  return new Proxy(
    {},
    {
      get(_target, key) {
        if (key === "__esModule") {
          return undefined;
        }
        return () => {
          throw new PlatformNotSupportedError(moduleName, key);
        };
      },
    },
  );
}

export function getWinapi(): NativeModule {
  if (process.platform !== "win32") {
    return unsupportedModule("winapi-bindings");
  }
  return nativeRequire("winapi-bindings") as NativeModule;
}

export function isAdmin(): Promise<boolean> {
  if (process.platform !== "win32") {
    return Promise.resolve(typeof process.getuid === "function" && process.getuid() === 0);
  }
  const adminCheck = nativeRequire("is-admin") as unknown;
  if (typeof adminCheck === "function") {
    return (adminCheck as AdminCheck)();
  }
  return (adminCheck as { default: AdminCheck }).default();
}

export const permissions = {
  async allow(targetPath: string, userId: string, accessMode: string, options?: unknown) {
    if (process.platform === "win32") {
      const permissionsModule = nativeRequire("permissions") as PermissionsModule;
      return (
        permissionsModule.default?.allow?.(targetPath, userId, accessMode, options) ??
        permissionsModule.allow(targetPath, userId, accessMode, options)
      );
    }

    const currentMode = (await stat(targetPath)).mode;
    const mode =
      (accessMode.includes("r") ? constants.S_IRGRP | constants.S_IROTH : 0) |
      (accessMode.includes("w") ? constants.S_IWGRP | constants.S_IWOTH : 0) |
      (accessMode.includes("x") ? constants.S_IXGRP | constants.S_IXOTH : 0);
    await access(targetPath);
    await chmod(targetPath, currentMode | mode);
  },
};
