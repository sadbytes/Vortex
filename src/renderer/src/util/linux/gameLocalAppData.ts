import * as path from "path";

import getVortexPath from "../getVortexPath";
import { createWinePathCache } from "./winePathCache";
import { resolveWineLocalAppData } from "./winePaths";

const cache = createWinePathCache({
  resolveFromPrefix: resolveWineLocalAppData,
  fallback: () =>
    process.env.LOCALAPPDATA !== undefined
      ? process.env.LOCALAPPDATA
      : path.resolve(getVortexPath("appData"), "..", "Local"),
  label: "Local AppData",
});

export const resolveGameLocalAppDataBase = cache.resolveBase;
export const updateGameLocalAppDataBase = cache.updateBase;
export const initGameLocalAppDataBase = cache.initBase;

export function resolveGameLocalAppDataPath(gameId: string, relativePath: string): string {
  return path.join(resolveGameLocalAppDataBase(gameId), relativePath);
}
