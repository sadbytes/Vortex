import * as os from "os";
import * as path from "path";

import * as fs from "../fs";
import { log } from "../log";

const SKIP_DIRS = new Set(["public"]);

async function findWineUserDir(prefixPath: string): Promise<string> {
  const usersDir = path.join(prefixPath, "drive_c", "users");
  let entries: string[];
  try {
    entries = await fs.readdirAsync(usersDir);
  } catch (err: any) {
    log("warn", "Wine prefix has no users directory", {
      prefixPath,
      error: err?.message,
    });
    throw err;
  }

  const candidates = entries.filter((e) => !SKIP_DIRS.has(e.toLowerCase()));

  const linuxUser = os.userInfo().username;
  const preferred = [linuxUser, "steamuser"];

  for (const name of preferred) {
    if (candidates.includes(name)) {
      return path.join(usersDir, name);
    }
  }

  if (candidates.length > 0) {
    log("info", "Wine prefix user directory resolved by fallback", {
      prefixPath,
      chosen: candidates[0],
      available: candidates,
    });
    return path.join(usersDir, candidates[0]);
  }

  log("warn", "Wine prefix has no user directories", { prefixPath });
  throw new Error(`No user directories found in Wine prefix: ${usersDir}`);
}

export async function resolveWineLocalAppData(prefixPath: string): Promise<string> {
  const userDir = await findWineUserDir(prefixPath);
  return path.join(userDir, "AppData", "Local");
}

export async function resolveWineAppData(prefixPath: string): Promise<string> {
  const userDir = await findWineUserDir(prefixPath);
  return path.join(userDir, "AppData", "Roaming");
}

export async function resolveWineDocuments(prefixPath: string): Promise<string> {
  const userDir = await findWineUserDir(prefixPath);
  return path.join(userDir, "Documents");
}
