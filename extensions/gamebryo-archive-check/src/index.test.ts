import { fs, selectors } from "@nexusmods/vortex-api";
import { describe, expect, it, vi, beforeEach } from "vitest";

import main from "./index";

describe("checkForErrors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not report an error when the discovered game data folder is missing", async () => {
    const state = {
      loadOrder: {
        "example.esp": { enabled: true },
      },
      persistent: {
        mods: {
          skyrimse: {},
        },
      },
      settings: {
        gameMode: {
          discovered: {
            skyrimse: {
              path: "/missing/Skyrim Special Edition",
            },
          },
        },
      },
      session: {
        plugins: {
          pluginInfo: {
            "example.esp": {
              id: "example.esp",
              isNative: false,
              loadOrder: 0,
              loadsArchive: true,
              name: "example.esp",
            },
          },
        },
      },
    };
    const api = {
      dismissNotification: vi.fn(),
      getState: vi.fn(() => state),
      showErrorNotification: vi.fn(),
      store: {
        dispatch: vi.fn(),
      },
      translate: vi.fn((value) => value),
    } as any;
    const enoent = Object.assign(new Error("ENOENT: no such file or directory"), {
      code: "ENOENT",
      path: "/missing/Skyrim Special Edition/data",
    });

    vi.mocked(selectors.activeGameId).mockReturnValue("skyrimse");
    vi.mocked(fs.readdirAsync).mockRejectedValue(enoent);

    let testRunner: () => Promise<any>;
    main({
      api,
      registerTest: (_id: string, _trigger: string, runner: () => Promise<any>) => {
        testRunner = runner;
      },
      requireExtension: vi.fn(),
    } as any);

    const result = await testRunner();

    expect(result).toBeUndefined();
    expect(api.showErrorNotification).not.toHaveBeenCalled();
    expect(api.dismissNotification).not.toHaveBeenCalledWith("checking-archives-all");
  });
});
