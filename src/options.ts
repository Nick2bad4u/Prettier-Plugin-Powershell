import type { ParserOptions, SupportOptions } from 'prettier';

export type TrailingCommaOption = 'none' | 'multiline' | 'all';
export type IndentStyleOption = 'spaces' | 'tabs';
export type BraceStyleOption = '1tbs' | 'allman';
export type KeywordCaseOption = 'preserve' | 'lower' | 'upper' | 'pascal';

export interface PluginConfiguration {
  powershellIndentStyle: IndentStyleOption;
  powershellIndentSize: number;
  powershellTrailingComma: TrailingCommaOption;
  powershellSortHashtableKeys: boolean;
  powershellBlankLinesBetweenFunctions: number;
  powershellBlankLineAfterParam: boolean;
  powershellBraceStyle: BraceStyleOption;
  powershellLineWidth: number;
  powershellPreferSingleQuote: boolean;
  powershellKeywordCase: KeywordCaseOption;
  powershellRewriteAliases: boolean;
  powershellRewriteWriteHost: boolean;
}

export const pluginOptions: SupportOptions = {
  powershellIndentStyle: {
    category: 'PowerShell',
    type: 'choice',
    default: 'spaces',
    description: 'Indent PowerShell code using spaces or tabs.',
    choices: [
      { value: 'spaces', description: 'Use spaces for indentation.' },
      { value: 'tabs', description: 'Use tabs for indentation.' },
    ],
  },
  powershellIndentSize: {
    category: 'PowerShell',
    type: 'int',
    default: 2,
    description: 'Number of indentation characters for each level.',
    range: { start: 1, end: 8, step: 1 },
  },
  powershellTrailingComma: {
    category: 'PowerShell',
    type: 'choice',
    default: 'multiline',
    description: 'Control trailing commas for array and hashtable literals.',
    choices: [
      { value: 'none', description: 'Never add a trailing comma or semicolon.' },
      {
        value: 'multiline',
        description: 'Add trailing comma/semicolon when the literal spans multiple lines.',
      },
      { value: 'all', description: 'Always add trailing comma/semicolon when possible.' },
    ],
  },
  powershellSortHashtableKeys: {
    category: 'PowerShell',
    type: 'boolean',
    default: false,
    description: 'Sort hashtable keys alphabetically when formatting.',
  },
  powershellBlankLinesBetweenFunctions: {
    category: 'PowerShell',
    type: 'int',
    default: 1,
    description: 'Number of blank lines to ensure between function declarations.',
    range: { start: 0, end: 3, step: 1 },
  },
  powershellBlankLineAfterParam: {
    category: 'PowerShell',
    type: 'boolean',
    default: true,
    description: 'Insert a blank line after param(...) blocks inside script blocks.',
  },
  powershellBraceStyle: {
    category: 'PowerShell',
    type: 'choice',
    default: '1tbs',
    description: 'Control placement of opening braces for script blocks and functions.',
    choices: [
      {
        value: '1tbs',
        description: 'One True Brace Style – keep opening braces on the same line.',
      },
      { value: 'allman', description: 'Allman style – place opening braces on the next line.' },
    ],
  },
  powershellLineWidth: {
    category: 'PowerShell',
    type: 'int',
    default: 120,
    description: 'Maximum preferred line width for PowerShell documents.',
    range: { start: 40, end: 200, step: 1 },
  },
  powershellPreferSingleQuote: {
    category: 'PowerShell',
    type: 'boolean',
    default: false,
    description: 'Prefer single-quoted strings when no interpolation is required.',
  },
  powershellKeywordCase: {
    category: 'PowerShell',
    type: 'choice',
    default: 'preserve',
    description: 'Normalise the casing of PowerShell keywords.',
    choices: [
      { value: 'preserve', description: 'Leave keyword casing unchanged.' },
      { value: 'lower', description: 'Convert keywords to lower-case.' },
      { value: 'upper', description: 'Convert keywords to upper-case.' },
      { value: 'pascal', description: 'Capitalise keywords (PascalCase).' },
    ],
  },
  powershellRewriteAliases: {
    category: 'PowerShell',
    type: 'boolean',
    default: false,
    description: 'Rewrite common cmdlet aliases to their canonical names.',
  },
  powershellRewriteWriteHost: {
    category: 'PowerShell',
    type: 'boolean',
    default: false,
    description: 'Rewrite Write-Host invocations to Write-Output to discourage host-only output.',
  },
};

export const defaultOptions = {
  tabWidth: 2,
};

export interface ResolvedOptions {
  indentStyle: IndentStyleOption;
  indentSize: number;
  trailingComma: TrailingCommaOption;
  sortHashtableKeys: boolean;
  blankLinesBetweenFunctions: number;
  blankLineAfterParam: boolean;
  braceStyle: BraceStyleOption;
  lineWidth: number;
  preferSingleQuote: boolean;
  keywordCase: KeywordCaseOption;
  rewriteAliases: boolean;
  rewriteWriteHost: boolean;
}

export function resolveOptions(options: ParserOptions): ResolvedOptions {
  const indentStyle = (options.powershellIndentStyle as IndentStyleOption | undefined) ?? 'spaces';
  const rawIndentOverride = options.powershellIndentSize;
  const normalizedIndentOverride = Number(rawIndentOverride);
  const normalizedTabWidth = Number(options.tabWidth);
  const indentSize =
    Number.isFinite(normalizedIndentOverride) && normalizedIndentOverride > 0
      ? Math.floor(normalizedIndentOverride)
      : Number.isFinite(normalizedTabWidth) && normalizedTabWidth > 0
        ? Math.floor(normalizedTabWidth)
        : 2;

  if (indentStyle === 'tabs') {
    options.useTabs = true;
  } else {
    options.useTabs = false;
  }
  options.tabWidth = indentSize;

  const trailingComma =
    (options.powershellTrailingComma as TrailingCommaOption | undefined) ?? 'multiline';
  const sortHashtableKeys = Boolean(options.powershellSortHashtableKeys);
  const rawBlankLines = Number(options.powershellBlankLinesBetweenFunctions ?? 1);
  const normalizedBlankLines = Number.isFinite(rawBlankLines) ? rawBlankLines : 1;
  const blankLinesBetweenFunctions = Math.max(0, Math.min(3, Math.floor(normalizedBlankLines)));
  let blankLineAfterParam = true;
  /* c8 ignore next */
  if (options.powershellBlankLineAfterParam === false) {
    blankLineAfterParam = false;
  }
  const braceStyle = (options.powershellBraceStyle as BraceStyleOption | undefined) ?? '1tbs';
  const lineWidth = Math.max(40, Math.min(200, Number(options.powershellLineWidth ?? 120)));
  const preferSingleQuote = options.powershellPreferSingleQuote === true;
  const keywordCase =
    (options.powershellKeywordCase as KeywordCaseOption | undefined) ?? 'preserve';
  const rewriteAliases = options.powershellRewriteAliases === true;
  const rewriteWriteHost = options.powershellRewriteWriteHost === true;

  if (!options.printWidth || options.printWidth > lineWidth) {
    options.printWidth = lineWidth;
  }

  return {
    indentStyle,
    indentSize,
    trailingComma,
    sortHashtableKeys,
    blankLinesBetweenFunctions,
    blankLineAfterParam,
    braceStyle,
    lineWidth,
    preferSingleQuote,
    keywordCase,
    rewriteAliases,
    rewriteWriteHost,
  } satisfies ResolvedOptions;
}
