import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const electron = require("electron");
const env = { ...process.env };

delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, ["."], {
  env,
  stdio: "inherit",
  windowsHide: false,
});

child.on("close", (code, signal) => {
  if (code === null) {
    console.error(`${electron} exited with signal ${signal}`);
    process.exit(1);
  }
  process.exit(code);
});

for (const signal of ["SIGINT", "SIGTERM", "SIGUSR2"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}
