export class PlatformNotSupportedError extends Error {
  constructor(exportName: string | symbol) {
    super(`${String(exportName)} from winapi-bindings is not supported on ${process.platform}`);
    this.name = "PlatformNotSupportedError";
  }
}

function loadWinapi() {
  if (process.platform !== "win32") {
    return undefined;
  }
  try {
    return eval("require")("winapi-bindings");
  } catch {
    return undefined;
  }
}

const winapi = loadWinapi();
export const isAvailable = winapi !== undefined;

function unsupported(exportName: string | symbol) {
  return () => {
    throw new PlatformNotSupportedError(exportName);
  };
}

function getExport(exportName: string) {
  return winapi?.[exportName] ?? unsupported(exportName);
}

export type Privilege = string;

type WinapiBindings = {
  [key: string]: (...args: any[]) => any;
  SetProcessPreferredUILanguages: (languages: string[]) => void;
  GetNativeArch: () => { nativeArch: string };
  SupportsAppContainer: () => boolean;
  GetVolumePathName: (filePath: string) => string;
  GetDiskFreeSpaceEx: (filePath: string) => unknown;
  RegGetValue: (root: string, key: string, value: string) => { type: string; value: unknown };
  GetProcessList: () => Array<{ exeFile: string; processID: number }>;
  GetProcessWindowList: (processId: number) => unknown[];
  SetForegroundWindow: (window: unknown) => void;
  ShellExecuteEx: (...args: any[]) => any;
  AbortSystemShutdown: () => void;
  InitiateSystemShutdown: (
    message: string,
    timeoutSeconds: number,
    forceAppsClosed: boolean,
    rebootAfterShutdown: boolean,
  ) => void;
  RunTask: (...args: any[]) => any;
  CreateTask: (...args: any[]) => any;
  GetTasks: (...args: any[]) => any;
  DeleteTask: (...args: any[]) => any;
  GetUserSID: (...args: any[]) => any;
  AddUserPrivilege: (sid: string, privilege: Privilege) => void;
  RemoveUserPrivilege: (sid: string, privilege: Privilege) => void;
  GetUserPrivilege: (sid: string) => Privilege[];
  CheckYourPrivilege: () => Privilege[];
};

const winapiProxy = new Proxy(
  {},
  {
    get(_target, key) {
      if (key === "__esModule") {
        return true;
      }
      if (key === "default") {
        return winapiProxy;
      }
      return winapi?.[key] ?? unsupported(key);
    },
  },
) as WinapiBindings;

export const SetProcessPreferredUILanguages =
  winapi?.SetProcessPreferredUILanguages ?? (() => undefined);

export const GetNativeArch =
  winapi?.GetNativeArch ??
  (() => ({
    nativeArch: process.arch,
  }));

export const SupportsAppContainer = winapi?.SupportsAppContainer ?? (() => false);

/** @platform win32 */
export const GetVolumePathName = getExport("GetVolumePathName");
/** @platform win32 */
export const GetDiskFreeSpaceEx = getExport("GetDiskFreeSpaceEx");
/** @platform win32 */
export const RegGetValue = getExport("RegGetValue");
/** @platform win32 */
export const GetProcessList = getExport("GetProcessList");
/** @platform win32 */
export const GetProcessWindowList = getExport("GetProcessWindowList");
/** @platform win32 */
export const SetForegroundWindow = getExport("SetForegroundWindow");
/** @platform win32 */
export const ShellExecuteEx = getExport("ShellExecuteEx");
/** @platform win32 */
export const AbortSystemShutdown = getExport("AbortSystemShutdown");
/** @platform win32 */
export const InitiateSystemShutdown = getExport("InitiateSystemShutdown");
/** @platform win32 */
export const RunTask = getExport("RunTask");
/** @platform win32 */
export const CreateTask = getExport("CreateTask");
/** @platform win32 */
export const GetTasks = getExport("GetTasks");
/** @platform win32 */
export const DeleteTask = getExport("DeleteTask");
/** @platform win32 */
export const GetUserSID = getExport("GetUserSID");
/** @platform win32 */
export const AddUserPrivilege = getExport("AddUserPrivilege");
/** @platform win32 */
export const RemoveUserPrivilege = getExport("RemoveUserPrivilege");
/** @platform win32 */
export const GetUserPrivilege = getExport("GetUserPrivilege");
/** @platform win32 */
export const CheckYourPrivilege = getExport("CheckYourPrivilege");

export default winapiProxy;
