
import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);

// Chạy từ thư mục gốc monorepo.
const apiRoot = resolve("apps/api");

require(resolve(apiRoot, "dist/env.js"));

const { db, member, user } = require(
  resolve("packages/db/dist/node.js"),
);
