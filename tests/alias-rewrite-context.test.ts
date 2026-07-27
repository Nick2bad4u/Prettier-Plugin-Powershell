import { describe, expect, it } from "vitest";

import { formatAndAssertRoundTrip } from "./utils/format-and-assert.js";

const rewriteAliasesConfig = {
    parser: "powershell" as const,
    plugins: ["./dist/index.cjs"],
    powershellRewriteAliases: true,
};

describe("command-aware alias rewriting", () => {
    it("rewrites aliases only at pipeline command positions", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `ls | % { $_.Name }
$processes = ps
& gci
`,
            rewriteAliasesConfig,
            { id: "command-aliases" }
        );

        expect(result).toContain("Get-ChildItem");
        expect(result).toContain("| ForEach-Object");
        expect(result).toContain("$processes = Get-Process");
        expect(result).toContain("& Get-ChildItem");
    });

    it("does not rewrite operators, members, keys, or function names", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `function ps {
    $remainder = 5 % 2
    $filtered = $items.Where({ $_ -gt 1 })
    [Console]::Write("x")
    $data = @{ where = 1; ps = 2; write = 3 }
}
`,
            rewriteAliasesConfig,
            { id: "non-command-aliases" }
        );

        expect(result).toContain("function ps");
        expect(result).toContain("$remainder = 5 % 2");
        expect(result).toContain("$items.Where(");
        expect(result).toContain('[Console]::Write("x")');
        expect(result).toContain("where = 1");
        expect(result).toContain("ps = 2");
        expect(result).toContain("write = 3");
        expect(result).not.toContain("5 ForEach-Object 2");
        expect(result).not.toContain(".Where-Object");
    });

    it("does not rewrite member names with the Write-Host option", async () => {
        expect.hasAssertions();

        const result = await formatAndAssertRoundTrip(
            `Write-Host "command"
function Write-Host { "custom" }
`,
            {
                ...rewriteAliasesConfig,
                powershellRewriteAliases: false,
                powershellRewriteWriteHost: true,
            },
            { id: "write-host-context" }
        );

        expect(result).toContain('Write-Output "command"');
        expect(result).toContain("function Write-Host");
    });
});
