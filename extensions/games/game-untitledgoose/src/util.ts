import { log, util } from "@nexusmods/vortex-api";

import { GAME_ID } from "./statics";

// Keep this local to avoid expanding the public extension API surface.
export function toBlue<T>(func: (...args: any[]) => Promise<T>): (...args: any[]) => Promise<T> {
  return (...args: any[]) => Promise.resolve(func(...args));
}

export function getDiscoveryPath(state) {
  const discovery = util.getSafe(state, ["settings", "gameMode", "discovered", GAME_ID], undefined);
  if (discovery === undefined || discovery.path === undefined) {
    log("debug", "untitledgoosegame was not discovered");
    return undefined;
  }

  return discovery.path;
}
