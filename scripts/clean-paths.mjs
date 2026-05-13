#!/usr/bin/env node

import { rm } from "node:fs/promises";
import path from "node:path";

const targets = process.argv.slice(2);

if (targets.length === 0) {
    throw new TypeError("Expected at least one path to remove.");
}

await Promise.all(
    targets.map(async (target) =>
        rm(path.resolve(process.cwd(), target), {
            force: true,
            maxRetries: 3,
            recursive: true,
        })
    )
);
