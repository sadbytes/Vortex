import * as path from "path";

import * as fs from "fs-extra";

type ResolvedPathCache = Map<string, string>;

// Splits an absolute/relative path into the portion we start resolving from
// (the filesystem root or the first segment) and the remaining segments.
function splitPathSegments(targetPath: string): { root: string; rest: string[] } {
  const segments = targetPath.split(path.sep);
  const rooted = segments[0] === "";
  return {
    root: rooted ? path.sep : segments[0],
    rest: segments.slice(rooted ? 1 : 0).filter((segment) => segment !== ""),
  };
}

// Picks the on-disk entry that matches `segment` ignoring case, falling back to
// the caller's original casing when nothing matches (so new files/directories
// are created with the requested name).
function matchSegment(entries: string[], segment: string): string {
  const segLower = segment.toLowerCase();
  return entries.find((entry) => entry.toLowerCase() === segLower) ?? segment;
}

/**
 * On case-sensitive filesystems (Linux), resolves a path by matching each
 * segment against what actually exists on disk, ignoring case. On
 * case-insensitive systems (Windows, macOS), returns the path unchanged.
 *
 * Segments that don't exist on disk keep the caller's original casing,
 * so new files/directories are created with whatever name the caller passes.
 */
export async function resolvePathCaseInsensitive(
  targetPath: string,
  cache?: ResolvedPathCache,
): Promise<string> {
  if (process.platform !== "linux") {
    return targetPath;
  }

  const cached = cache?.get(targetPath);
  if (cached !== undefined) {
    return cached;
  }

  try {
    await fs.access(targetPath);
    cache?.set(targetPath, targetPath);
    return targetPath;
  } catch {
    // exact path not found — walk segments
  }

  const { root, rest } = splitPathSegments(targetPath);
  let resolved = root;

  for (let i = 0; i < rest.length; i++) {
    const exactPath = path.join(resolved, rest[i]);
    try {
      await fs.access(exactPath);
      resolved = exactPath;
      continue;
    } catch {
      // exact case not found
    }

    try {
      resolved = path.join(resolved, matchSegment(await fs.readdir(resolved), rest[i]));
    } catch {
      resolved = path.join(resolved, ...rest.slice(i));
      break;
    }
  }

  cache?.set(targetPath, resolved);
  return resolved;
}

/**
 * Synchronous variant for hot paths that can't be async (e.g. fs watchers).
 */
export function resolvePathCaseInsensitiveSync(
  targetPath: string,
  cache?: ResolvedPathCache,
): string {
  if (process.platform !== "linux") {
    return targetPath;
  }

  const cached = cache?.get(targetPath);
  if (cached !== undefined) {
    return cached;
  }

  try {
    fs.accessSync(targetPath);
    cache?.set(targetPath, targetPath);
    return targetPath;
  } catch {
    // exact path not found
  }

  const { root, rest } = splitPathSegments(targetPath);
  let resolved = root;

  for (let i = 0; i < rest.length; i++) {
    const exactPath = path.join(resolved, rest[i]);
    try {
      fs.accessSync(exactPath);
      resolved = exactPath;
      continue;
    } catch {
      // exact case not found
    }

    try {
      resolved = path.join(resolved, matchSegment(fs.readdirSync(resolved), rest[i]));
    } catch {
      resolved = path.join(resolved, ...rest.slice(i));
      break;
    }
  }

  cache?.set(targetPath, resolved);
  return resolved;
}
