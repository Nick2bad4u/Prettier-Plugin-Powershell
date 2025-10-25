import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import prettier from 'prettier';
import plugin from '../src/index.js';

const baseConfig = {
  parser: 'powershell',
  plugins: [plugin],
  filepath: 'test.ps1'
};

const normalize = (text: string) => text.replace(/\r\n/g, '\n');

describe('PowerShell Prettier plugin', () => {
  it('formats the sample fixture as expected', async () => {
    const input = await readFile(new URL('./fixtures/sample-unformatted.ps1', import.meta.url), 'utf8');
    const expected = await readFile(new URL('./fixtures/sample-formatted.ps1', import.meta.url), 'utf8');

    const result = await prettier.format(input, baseConfig);

    expect(normalize(result)).toBe(normalize(expected));
  });

  it('is idempotent on formatted output', async () => {
    const formatted = await readFile(new URL('./fixtures/sample-formatted.ps1', import.meta.url), 'utf8');

    const once = await prettier.format(formatted, baseConfig);
    const twice = await prettier.format(once, baseConfig);

    expect(twice).toBe(once);
  });

  it('respects custom indentation size', async () => {
    const input = `function Test {
param(
[string] $Name
)
if ($true) {
Write-Host "Hello"
}
}`;

    const result = await prettier.format(input, {
      ...baseConfig,
      powershellIndentSize: 4
    });

    const expected = `function Test {
    param(
        [string] $Name
    )
    if ($true) {
        Write-Host "Hello"
    }
}`;

    expect(result.trim()).toBe(expected);
  });

  it('sorts hashtable keys when enabled', async () => {
    const input = `@{ z = 1; a = 2; m = 3 }`;
    const result = await prettier.format(input, {
      ...baseConfig,
      powershellSortHashtableKeys: true
    });

    expect(result.trim()).toBe(`@{ a = 2; m = 3; z = 1 }`);
  });

  it('expands compact param lists and inserts a blank line after param blocks', async () => {
    const input = `function Foo {
param([string] $Name, [int] $Count)
Write-Host $Name
}`;

    const result = await prettier.format(input, baseConfig);

    const expected = `function Foo {
  param(
    [string] $Name,
    [int] $Count
  )

  Write-Host $Name
}`;

    expect(result.trim()).toBe(expected);
  });

  it('honors the blank-line-after-param option when disabled', async () => {
    const input = `function Foo {
param([string] $Name, [int] $Count)
Write-Host $Name
}`;

    const result = await prettier.format(input, {
      ...baseConfig,
      powershellBlankLineAfterParam: false
    });

    const expected = `function Foo {
  param(
    [string] $Name,
    [int] $Count
  )
  Write-Host $Name
}`;

    expect(result.trim()).toBe(expected);
  });

  it('keeps statements following here-strings aligned to the enclosing block', async () => {
    const input = `function Foo {
$here = @"
line
"@
return $here
}`;

    const result = await prettier.format(input, baseConfig);

    expect(result).toContain(`\n  return $here\n`);
  });

  it('applies trailing delimiter rules for arrays and hashtables', async () => {
    const arrayInput = `@(
1,
2
)`;
    const hashInput = `@{
a = 1
b = 2
}`;

    const arrayResult = await prettier.format(arrayInput, {
      ...baseConfig,
      powershellTrailingComma: 'all'
    });

    const hashResult = await prettier.format(hashInput, {
      ...baseConfig,
      powershellTrailingComma: 'all'
    });

    expect(arrayResult).toMatch(new RegExp(',\\s*\\)'));
    expect(hashResult).toMatch(new RegExp(';\\s*\\}'));
  });
});
