import type { IExtensionApi } from "../../types/IExtensionContext";
import { log } from "../log";

export type TDiscoveryMap = {
  [gameId: string]: {
    winePrefixPath?: string;
  };
};

interface IWinePathCacheOptions {
  // resolves the concrete on-disk path inside a given Wine prefix
  resolveFromPrefix: (prefixPath: string) => Promise<string>;
  // native (non-Wine) location used when no prefix is configured
  fallback: () => string;
  // human readable name of the path, used in log messages (e.g. "Documents")
  label: string;
}

export interface IWinePathCache {
  resolveBase: (gameId: string) => string;
  updateBase: (discovered: TDiscoveryMap) => Promise<void>;
  initBase: (api: IExtensionApi) => Promise<void>;
}

/**
 * Builds a per-game cache that maps a game's configured Wine prefix to a
 * concrete path inside it (Documents, Local AppData, ...). The cache is kept in
 * sync with the discovered-games state and falls back to the native location on
 * non-Linux platforms or when no prefix is known.
 */
export function createWinePathCache(options: IWinePathCacheOptions): IWinePathCache {
  const { resolveFromPrefix, fallback, label } = options;
  const cache: { [gameId: string]: string } = {};
  const initializedApis = new WeakSet<IExtensionApi>();

  const resolveBase = (gameId: string): string =>
    process.platform === "linux" && cache[gameId] !== undefined ? cache[gameId] : fallback();

  const updateBase = async (discovered: TDiscoveryMap): Promise<void> => {
    if (process.platform !== "linux") {
      return;
    }

    await Promise.all(
      Object.keys(discovered).map(async (gameId) => {
        const prefixPath = discovered[gameId]?.winePrefixPath;
        if (prefixPath === undefined) {
          delete cache[gameId];
          return;
        }

        try {
          cache[gameId] = await resolveFromPrefix(prefixPath);
        } catch (err: any) {
          delete cache[gameId];
          log("warn", `failed to resolve Wine ${label} path`, {
            gameId,
            prefixPath,
            error: err?.message,
          });
        }
      }),
    );
  };

  const initBase = (api: IExtensionApi): Promise<void> => {
    const update = (discovered: TDiscoveryMap) =>
      updateBase(discovered).catch((err: any) => {
        log("warn", `failed to update Wine ${label} path cache`, {
          error: err?.message,
        });
      });

    if (!initializedApis.has(api)) {
      initializedApis.add(api);
      api.onStateChange(["settings", "gameMode", "discovered"], (previous, current) => {
        update(current).then(() => null);
      });
    }

    return update(api.store.getState().settings.gameMode.discovered);
  };

  return { resolveBase, updateBase, initBase };
}
