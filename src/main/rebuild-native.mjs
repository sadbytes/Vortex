#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import * as path from "node:path";

const mainDir = import.meta.dirname;
const workspaceRoot = path.resolve(mainDir, "../..");

function run(command, args, options = {}) {
  console.log(`> ${command} ${args.join(" ")}`);
  execFileSync(command, args, {
    cwd: options.cwd ?? mainDir,
    stdio: "inherit",
  });
}

if (process.platform !== "linux") {
  run("pnpm", ["exec", "electron-rebuild"]);
  process.exit(0);
}

run("pnpm", ["exec", "electron-rebuild", "--only", "drivelist,leveldown,xxhash-addon"]);

const themeSwitcherDir = path.join(workspaceRoot, "extensions/theme-switcher");
if (existsSync(path.join(themeSwitcherDir, "package.json"))) {
  run(
    "pnpm",
    [
      "--filter",
      "@vortex/main",
      "exec",
      "electron-rebuild",
      "--module-dir",
      themeSwitcherDir,
      "--only",
      "font-scanner",
    ],
    { cwd: workspaceRoot },
  );
} else {
  console.log("Skipping font-scanner rebuild (theme-switcher not found at deploy location)");
}
