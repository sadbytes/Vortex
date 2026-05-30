const path = require("path");

const fg = require("fast-glob");

/**
 * Platform-agnostic, fast-glob-backed drop-in replacement for the native
 * `node-turbowalk` package.
 *
 * The original turbowalk used a native (winapi-bindings) crawler on Windows and
 * a hand-patched pure-JS fallback elsewhere; the patch had to be shipped to
 * survive packaging and the native module caused asar breakage. This module
 * reproduces turbowalk's public surface on top of `fast-glob` (pure JS on every
 * platform) so every `require("turbowalk")` consumer keeps working unchanged.
 *
 * Field semantics mirror the native build: notably `mtime` is reported as
 * *seconds* since the unix epoch (not a Date).
 */

// fast-glob always yields POSIX separators; restore native separators so that
// downstream path.relative / path.join behave exactly as they did with turbowalk.
function toNative(input) {
  return path.sep === "/" ? input : input.split("/").join(path.sep);
}

function turbowalk(basePath, progress, options = {}) {
  const {
    terminators = false,
    details = false,
    threshold = 1024,
    recurse = true,
    skipHidden = true,
    skipLinks = true,
    skipInaccessible = true,
  } = options;

  return new Promise((resolve, reject) => {
    let buffer = [];
    const dirPaths = [];
    let failed = false;

    const flush = () => {
      if (buffer.length === 0) {
        return;
      }
      const batch = buffer;
      buffer = [];
      progress(batch);
    };

    const stream = fg.stream("**", {
      cwd: basePath,
      absolute: true,
      // turbowalk's skipHidden maps directly to fast-glob's dot handling
      dot: !skipHidden,
      onlyFiles: false,
      // skipLinks: list links but don't recurse into them
      followSymbolicLinks: !skipLinks,
      deep: recurse ? Infinity : 1,
      suppressErrors: skipInaccessible,
      // stats are always required: turbowalk's base entry exposes size/mtime
      stats: true,
      objectMode: true,
      throwErrorOnBrokenSymbolicLink: false,
    });

    stream.on("data", (raw) => {
      try {
        const stats = raw.stats;
        const isDirectory = stats.isDirectory();
        const filePath = toNative(raw.path);
        const entry = {
          filePath,
          isDirectory,
          isReparsePoint:
            typeof stats.isSymbolicLink === "function" ? stats.isSymbolicLink() : false,
          size: stats.size,
          mtime: stats.mtimeMs / 1000,
        };
        if (details) {
          entry.linkCount = stats.nlink;
          entry.id = stats.ino;
          entry.idStr = stats.ino.toString();
        }
        if (terminators && isDirectory) {
          dirPaths.push(filePath);
        }
        buffer.push(entry);
        if (buffer.length >= threshold) {
          flush();
        }
      } catch (err) {
        failed = true;
        if (typeof stream.destroy === "function") {
          stream.destroy();
        }
        reject(err);
      }
    });

    stream.on("error", (err) => {
      if (!failed) {
        failed = true;
        reject(err);
      }
    });

    stream.on("end", () => {
      if (failed) {
        return;
      }
      try {
        flush();
        // fast-glob can't tell us when a directory subtree finishes mid-stream, so
        // (unlike native turbowalk) the directory-done markers are emitted once the
        // whole walk completes. The only consumer uses them for progress estimation,
        // which degrades gracefully.
        if (terminators) {
          for (let i = 0; i < dirPaths.length; i += threshold) {
            progress(
              dirPaths.slice(i, i + threshold).map((dirPath) => ({
                filePath: dirPath,
                isDirectory: true,
                isReparsePoint: false,
                size: 0,
                mtime: 0,
                isTerminator: true,
              })),
            );
          }
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Export the walk function itself as module.exports and also expose it as the
// `default` member with an `__esModule` marker. This dual shape survives every
// interop we ship through: webpack/TS honour `__esModule` and pick up `.default`,
// while bundlers that ignore the marker (e.g. Vite/vitest's externalized-CJS
// interop) hand back module.exports directly — which is already the function.
turbowalk.default = turbowalk;
Object.defineProperty(turbowalk, "__esModule", { value: true });
module.exports = turbowalk;
