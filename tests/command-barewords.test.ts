import { format } from "prettier";
import { describe, expect, it } from "vitest";

import powerShellPlugin from "../src/plugin.js";

describe("PowerShell command barewords", () => {
    it.each([
        "Get-Variable -Name foo*",
        String.raw`Get-ChildItem C:\temp\*.log`,
        String.raw`.\scripts\build.ps1`,
        "Get-ChildItem src/build.ps1",
        "git log -n 5 --format=%H",
    ])("preserves contiguous command text: %s", async (source) => {
        const actual = await format(source, {
            filepath: "script.ps1",
            plugins: [powerShellPlugin],
        });

        expect(actual).toBe(`${source}\n`);
    });

    it("still inserts spaces around operators in expression mode", async () => {
        const actual = await format("$x=6/2*3%2", {
            filepath: "script.ps1",
            plugins: [powerShellPlugin],
        });

        expect(actual).toBe("$x = 6 / 2 * 3 % 2\n");
    });
});
