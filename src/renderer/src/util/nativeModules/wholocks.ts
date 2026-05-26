interface LockingProcess {
  appName: string;
  pid: number;
}

function whoLocks(filePath: string): LockingProcess[] {
  if (process.platform !== "win32") {
    return [];
  }
  const wholocks = eval("require")("wholocks");
  const implementation = wholocks.default ?? wholocks;
  return implementation(filePath);
}

export default whoLocks;
