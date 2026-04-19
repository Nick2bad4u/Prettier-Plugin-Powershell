import { readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const TEST_DIR = path.join(process.cwd(), "tests");

describe("enforce formatAndAssert usage", () => {
    it("does not use prettier.format directly in tests", () => {
        expect.hasAssertions();

        const filePaths: string[] = [];
        const walk = (dir: string) => {
            for (const entry of readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    walk(full);
                } else if (entry.isFile() && full.endsWith(".ts")) {
                    // Skip the format-and-assert helper itself (normalize path for cross-platform)
                    const rel = path
                        .relative(TEST_DIR, full)
                        .split(path.sep)
                        .join("/");
                    if (
                        rel !== "utils/format-and-assert.ts" &&
                        rel !== "utils/no-prettier-format.test.ts"
                    ) {
                        filePaths.push(full);
                    }
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

        expect(
            matches,
            "Found direct prettier.format usages in tests; use formatAndAssert helper instead"
        ).toStrictEqual([]);
    });
});
