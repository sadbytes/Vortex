import path from "path";

import TOML from "@iarna/toml";
import { fs, selectors, types, util } from "@nexusmods/vortex-api";

/* eslint-disable */
import { BEPINEX_CONFIG_FILE, getSupportMap } from "./common";
import { IBepInExGameConfig } from "./types";

// Keep this local to avoid expanding the public extension API surface.
export function toBlue<T>(func: (...args: any[]) => Promise<T>): (...args: any[]) => Promise<T> {
  return (...args: any[]) => Promise.resolve(func(...args));
}

export async function createDirectories(api: types.IExtensionApi, config: IBepInExGameConfig) {
  const state = api.getState();
  const modTypes: { [typeId: string]: string } = selectors.modPathsForGame(state, config.gameId);
  for (const id of Object.keys(modTypes)) {
    await fs.ensureDirWritableAsync(modTypes[id]);
  }
}

export async function resolveBepInExConfiguration(gameId: string): Promise<Buffer> {
  const gameConfig = getSupportMap()[gameId];
  const game = util.getGame(gameId);
  try {
    if (!!gameConfig.bepinexConfigObject) {
      return Buffer.from(TOML.stringify(gameConfig.bepinexConfigObject), "utf8");
    }
    const configExists = await fs
      .statAsync(path.join(game.extensionPath, BEPINEX_CONFIG_FILE))
      .then(() => true)
      .catch(() => false);
    if (configExists) {
      return fs.readFileAsync(path.join(game.extensionPath, BEPINEX_CONFIG_FILE), "utf8");
    }
  } catch (err) {
    // no-op
  }

  // If we don't have a config file at this point, we will use the default one.
  return await fs.readFileAsync(path.join(__dirname, "BepInEx.cfg"), "utf8");
}

export function dismissNotifications(api: types.IExtensionApi, profileId: string) {
  const profile = selectors.profileById(api.getState(), profileId);
  api.dismissNotification("bix-update");
  api.dismissNotification("bepis_injector" + profile.gameId);
}
