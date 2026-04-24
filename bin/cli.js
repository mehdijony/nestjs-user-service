#!/usr/bin/env node

// bin/cli.js
const { run } = require("../dist/cli/index");
run().catch(console.error);
