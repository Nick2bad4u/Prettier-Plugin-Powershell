import { format } from "prettier";
import { describe, expect, it } from "vitest";

import powerShellPlugin from "../src/plugin.js";

describe("command barewords in PowerShell", () => {
    it.each([
        "Get-Variable -Name foo*",
        String.raw`Get-ChildItem C:\temp\*.log`,
        String.raw`.\scripts\build.ps1`,
        "Get-ChildItem src/build.ps1",
        "git log -n 5 --format=%H",
    ])("preserves contiguous command text: %s", async (source) => {
        expect.hasAssertions();

        const actual = await format(source, {
            filepath: "script.ps1",
            plugins: [powerShellPlugin],
        });

        expect(actual).toBe(`${source}\n`);
    });

    it("does not join a separate wildcard argument to the preceding name", async () => {
        expect.hasAssertions();

        const options = { filepath: "script.ps1", plugins: [powerShellPlugin] };
        const attached = await format("Get-Variable -Name foo*", options);
        const separate = await format("Get-Variable -Name foo *", options);

        expect(separate).toBe("Get-Variable -Name foo *\n");
        expect(attached).not.toBe(separate);
    });

    it("still inserts spaces around operators in expression mode", async () => {
        expect.hasAssertions();

        const actual = await format("$x=6/2*3%2", {
            filepath: "script.ps1",
            plugins: [powerShellPlugin],
        });

        expect(actual).toBe("$x = 6 / 2 * 3 % 2\n");
    });
});
