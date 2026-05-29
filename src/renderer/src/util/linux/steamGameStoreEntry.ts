import type { IGameStoreEntry } from "../../types/IGameStoreEntry";
import { getWinePrefixPath } from "./proton";

export function getWinePrefixPathForGameStoreEntry(
  entry: Pick<IGameStoreEntry, "usesProton" | "compatDataPath">,
): string | undefined {
  if (entry.usesProton !== true || entry.compatDataPath === undefined) {
    return undefined;
  }

  return getWinePrefixPath(entry.compatDataPath);
}
