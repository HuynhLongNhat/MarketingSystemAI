import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Node's test runner does not execute main.ts/worker.ts, where development
// environment loading normally happens. Keep this preload side-effect-only.
config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env.local"),
  quiet: true,
});
