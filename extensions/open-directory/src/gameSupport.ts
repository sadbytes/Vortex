import { selectors, types, util } from "@nexusmods/vortex-api";
import * as Redux from "redux";

interface IGameSupport {
  settingsPath?: () => string;
  appDataPath?: string;
}

const gameSupport = util.makeOverlayableDictionary<string, IGameSupport>(
  {
    fallout3: {
      settingsPath: () => util.resolveGameMyGamesPath("fallout3", "Fallout3"),
      appDataPath: "Fallout3",
    },
    falloutnv: {
      settingsPath: () => util.resolveGameMyGamesPath("falloutnv", "FalloutNV"),
      appDataPath: "FalloutNV",
    },
    fallout4: {
      settingsPath: () => util.resolveGameMyGamesPath("fallout4", "Fallout4"),
      appDataPath: "Fallout4",
    },
    fallout4vr: {
      settingsPath: () => util.resolveGameMyGamesPath("fallout4vr", "Fallout4VR"),
      appDataPath: "Fallout4VR",
    },
    starfield: {
      settingsPath: () => util.resolveGameMyGamesPath("starfield", "Starfield"),
      appDataPath: "Starfield",
    },
    oblivion: {
      settingsPath: () => util.resolveGameMyGamesPath("oblivion", "Oblivion"),
      appDataPath: "Oblivion",
    },
    skyrim: {
      settingsPath: () => util.resolveGameMyGamesPath("skyrim", "Skyrim"),
      appDataPath: "Skyrim",
    },
    skyrimse: {
      settingsPath: () => util.resolveGameMyGamesPath("skyrimse", "Skyrim Special Edition"),
      appDataPath: "Skyrim Special Edition",
    },
    skyrimvr: {
      settingsPath: () => util.resolveGameMyGamesPath("skyrimvr", "SkyrimVR"),
      appDataPath: "SkyrimVR",
    },
  },
  {
    xbox: {
      skyrimse: {
        settingsPath: () => util.resolveGameMyGamesPath("skyrimse", "Skyrim Special Edition MS"),
        appDataPath: "Skyrim Special Edition MS",
      },
      fallout4: {
        settingsPath: () => util.resolveGameMyGamesPath("fallout4", "Fallout4 MS"),
        appDataPath: "Fallout4 MS",
      },
    },
    gog: {
      skyrimse: {
        settingsPath: () => util.resolveGameMyGamesPath("skyrimse", "Skyrim Special Edition GOG"),
        appDataPath: "Skyrim Special Edition GOG",
      },
      enderalspecialedition: {
        settingsPath: () =>
          util.resolveGameMyGamesPath("enderalspecialedition", "Enderal Special Edition GOG"),
        appDataPath: "Enderal Special Edition GOG",
      },
    },
    epic: {
      skyrimse: {
        settingsPath: () => util.resolveGameMyGamesPath("skyrimse", "Skyrim Special Edition EPIC"),
        appDataPath: "Skyrim Special Edition EPIC",
      },
      fallout4: {
        settingsPath: () => util.resolveGameMyGamesPath("fallout4", "Fallout4 EPIC"),
        appDataPath: "Fallout4 EPIC",
      },
    },
  },
  (gameId) => gameStoreForGame(gameId),
);

let gameStoreForGame: (gameId: string) => string = () => undefined;

export function initGameSupport(api: types.IExtensionApi) {
  gameStoreForGame = (gameId: string) =>
    selectors.discoveryByGame(api.store.getState(), gameId)?.store;
}

export function settingsPath(game: types.IGame): string {
  return gameSupport.get(game.id, "settingsPath")?.() ?? game.details?.settingsPath?.();
}

export function appDataPath(game: types.IGame): string {
  const relativePath = gameSupport.get(game.id, "appDataPath");
  return relativePath !== undefined
    ? util.resolveGameLocalAppDataPath(game.id, relativePath)
    : game.details?.appDataPath?.();
}
