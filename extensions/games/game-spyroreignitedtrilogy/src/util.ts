import path from "path";

import { fs, selectors, types, util } from "@nexusmods/vortex-api";
import turbowalk from "turbowalk";

import { GAME_ID, LO_FILE_NAME, MOD_FILE_EXT } from "./common";
import { IProps } from "./types";

// Keep this local to avoid expanding the public extension API surface.
export function toBlue<T>(func: (...args: any[]) => Promise<T>): (...args: any[]) => Promise<T> {
  return (...args: any[]) => Promise.resolve(func(...args));
}

export function genProps(context: types.IExtensionContext, profileId?: string): IProps {
  const api = context.api;
  const state = api.getState();
  const profile: types.IProfile =
    profileId !== undefined
      ? selectors.profileById(state, profileId)
      : selectors.activeProfile(state);

  if (profile?.gameId !== GAME_ID) {
    return undefined;
  }

  const discovery: types.IDiscoveryResult = util.getSafe(
    state,
    ["settings", "gameMode", "discovered", GAME_ID],
    undefined,
  );
  if (discovery?.path === undefined) {
    return undefined;
  }

  const mods = util.getSafe(state, ["persistent", "mods", GAME_ID], {});
  return { api, state, profile, mods, discovery };
}

export async function ensureLOFile(
  context: types.IExtensionContext,
  profileId?: string,
  props?: IProps,
): Promise<string> {
  if (props === undefined) {
    props = genProps(context, profileId);
  }

  if (props === undefined) {
    return Promise.reject(new util.ProcessCanceled("failed to generate game props"));
  }

  const targetPath = path.join(props.discovery.path, props.profile.id + "_" + LO_FILE_NAME);
  try {
    await fs
      .statAsync(targetPath)
      .catch(
        util.only({ code: "ENOENT" }, () =>
          fs.writeFileAsync(targetPath, JSON.stringify([]), { encoding: "utf8" }),
        ),
      );
    return targetPath;
  } catch (err) {
    return Promise.reject(err);
  }
}

export function makePrefix(input: number) {
  let res = "";
  let rest = input;
  while (rest > 0) {
    res = String.fromCharCode(65 + (rest % 25)) + res;
    rest = Math.floor(rest / 25);
  }
  return util.pad(res as any, "A", 3);
}

export async function getPakFiles(basePath: string): Promise<string[]> {
  let filePaths: string[] = [];
  return turbowalk(
    basePath,
    (files) => {
      const filtered = files.filter(
        (entry) => !entry.isDirectory && path.extname(entry.filePath) === MOD_FILE_EXT,
      );
      filePaths = filePaths.concat(filtered.map((entry) => entry.filePath));
    },
    { recurse: true, skipLinks: true },
  )
    .catch((err) =>
      ["ENOENT", "ENOTFOUND"].includes(err.code) ? Promise.resolve() : Promise.reject(err),
    )
    .then(() => Promise.resolve(filePaths));
}
