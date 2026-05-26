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
  return eval("require")("winapi-bindings");
}

const winapi = loadWinapi();

function unsupported(exportName: string | symbol) {
  return () => {
    throw new PlatformNotSupportedError(exportName);
  };
}

function getExport(exportName: string) {
  return winapi?.[exportName] ?? unsupported(exportName);
}

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
);

export const SetProcessPreferredUILanguages =
  winapi?.SetProcessPreferredUILanguages ?? (() => undefined);

export const GetNativeArch =
  winapi?.GetNativeArch ??
  (() => ({
    nativeArch: process.arch,
  }));

export const SupportsAppContainer = winapi?.SupportsAppContainer ?? (() => false);

export const GetVolumePathName = getExport("GetVolumePathName");
export const GetDiskFreeSpaceEx = getExport("GetDiskFreeSpaceEx");
export const RegGetValue = getExport("RegGetValue");
export const GetProcessList = getExport("GetProcessList");
export const GetProcessWindowList = getExport("GetProcessWindowList");
export const SetForegroundWindow = getExport("SetForegroundWindow");
export const ShellExecuteEx = getExport("ShellExecuteEx");
export const AbortSystemShutdown = getExport("AbortSystemShutdown");
export const InitiateSystemShutdown = getExport("InitiateSystemShutdown");
export const RunTask = getExport("RunTask");
export const CreateTask = getExport("CreateTask");
export const GetTasks = getExport("GetTasks");
export const DeleteTask = getExport("DeleteTask");
export const GetUserSID = getExport("GetUserSID");
export const AddUserPrivilege = getExport("AddUserPrivilege");
export const RemoveUserPrivilege = getExport("RemoveUserPrivilege");
export const GetUserPrivilege = getExport("GetUserPrivilege");
export const CheckYourPrivilege = getExport("CheckYourPrivilege");

export default winapiProxy;
