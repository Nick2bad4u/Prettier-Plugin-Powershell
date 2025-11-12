import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, it, expect } from "vitest";

const TEST_DIR = join(process.cwd(), "tests");

describe("enforce formatAndAssert usage", () => {
    it("does not use prettier.format directly in tests", () => {
        const filePaths: string[] = [];
        const walk = (dir: string) => {
            for (const entry of readdirSync(dir, { withFileTypes: true })) {
                const full = join(dir, entry.name);
                if (entry.isDirectory()) {
                    walk(full);
                } else if (entry.isFile() && full.endsWith(".ts")) {
                    // skip the format-and-assert helper itself (normalize path for cross-platform)
                    const rel = relative(TEST_DIR, full).split(sep).join("/");
                    if (rel === "utils/format-and-assert.ts") {
                        continue;
                    }
                    // skip this test file itself to avoid matching the literal string we search for
                    if (rel === "utils/no-prettier-format.test.ts") {
                        continue;
                    }
                    filePaths.push(full);
                }
            }
        };
        walk(TEST_DIR);

        const matches: string[] = [];
        for (const file of filePaths) {
            const content = readFileSync(file, "utf8");
            if (content.includes("prettier.format(")) {
                matches.push(file);
            }
        }

        // If found, report files and fail
        if (matches.length > 0) {
            expect(
                matches,
                "Found direct prettier.format usages in tests; use formatAndAssert helper instead"
            ).toEqual([]);
        }
    });
});
