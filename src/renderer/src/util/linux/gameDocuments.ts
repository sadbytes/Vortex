import * as path from "path";

import getVortexPath from "../getVortexPath";
import { createWinePathCache } from "./winePathCache";
import { resolveWineDocuments } from "./winePaths";

const cache = createWinePathCache({
  resolveFromPrefix: resolveWineDocuments,
  fallback: () => getVortexPath("documents"),
  label: "Documents",
});

export const resolveGameDocumentsBase = cache.resolveBase;
export const updateGameDocumentsBase = cache.updateBase;
export const initGameDocumentsBase = cache.initBase;

export function resolveGameMyGamesPath(gameId: string, gamePath: string): string {
  return path.join(resolveGameDocumentsBase(gameId), "My Games", gamePath);
}
