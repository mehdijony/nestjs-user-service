#!/usr/bin/env node

"use strict";

// ─── Check Node version ───
const [major] = process.versions.node.split(".").map(Number);
if (major < 18) {
  console.error("\x1b[31mError: Node.js 18 or higher is required.\x1b[0m");
  console.error(`Current: ${process.versions.node}`);
  process.exit(1);
}

// ─── Check if inside a NestJS project ───
const fs = require("fs");
const path = require("path");
const pkgPath = path.join(process.cwd(), "package.json");

if (!fs.existsSync(pkgPath)) {
  console.error("\x1b[31mError: No package.json found.\x1b[0m");
  console.error("Please run this inside your NestJS project root.");
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };

// Allow rollback even if nest isn't detected
const args = process.argv.slice(2);
const isRollback = args.includes("rollback");
const isStatus = args.includes("status");

if (!isRollback && !isStatus) {
  if (!deps["@nestjs/common"] && !deps["@nestjs/core"]) {
    console.error("\x1b[31mError: Not a NestJS project.\x1b[0m");
    process.exit(1);
  }
}

// ─── Run setup ───
// Require and immediately call run()
const setup = require("../dist/setup/index");
const runFn = setup.run || (setup.default && setup.default.run);

if (typeof runFn !== "function") {
  console.error("\x1b[31mError: Setup module not loaded correctly.\x1b[0m");
  console.error("Try rebuilding: npm run build");
  process.exit(1);
}

runFn().catch((err) => {
  console.error("\x1b[31mFatal error:\x1b[0m", err.message);
  process.exit(1);
});
