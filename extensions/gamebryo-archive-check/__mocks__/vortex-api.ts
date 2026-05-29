import { vi } from "vitest";

export const actions = {
  addNotification: vi.fn((notification) => notification),
};

export const fs = {
  createReadStream: vi.fn(),
  readdirAsync: vi.fn(),
};

export const log = vi.fn();

export const selectors = {
  activeGameId: vi.fn(),
};

export const types = {};

export const util = {
  getSafe: vi.fn((source, path, fallback) => {
    let current = source;
    for (const segment of path) {
      if (current?.[segment] === undefined) {
        return fallback;
      }
      current = current[segment];
    }
    return current;
  }),
};
