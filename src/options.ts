import type { ParserOptions, SupportOptions } from 'prettier';

export type TrailingCommaOption = 'none' | 'multiline' | 'all';
export type IndentStyleOption = 'spaces' | 'tabs';

export interface PluginConfiguration {
  powershellIndentStyle: IndentStyleOption;
  powershellIndentSize: number;
  powershellTrailingComma: TrailingCommaOption;
  powershellSortHashtableKeys: boolean;
  powershellBlankLinesBetweenFunctions: number;
  powershellBlankLineAfterParam: boolean;
}

export const pluginOptions: SupportOptions = {
  powershellIndentStyle: {
    category: 'PowerShell',
    type: 'choice',
    default: 'spaces',
    description: 'Indent PowerShell code using spaces or tabs.',
    choices: [
      { value: 'spaces', description: 'Use spaces for indentation.' },
      { value: 'tabs', description: 'Use tabs for indentation.' }
    ]
  },
  powershellIndentSize: {
    category: 'PowerShell',
    type: 'int',
    default: 2,
    description: 'Number of indentation characters for each level.',
    range: { start: 1, end: 8, step: 1 }
  },
  powershellTrailingComma: {
    category: 'PowerShell',
    type: 'choice',
    default: 'multiline',
    description: 'Control trailing commas for array and hashtable literals.',
    choices: [
      { value: 'none', description: 'Never add a trailing comma or semicolon.' },
      { value: 'multiline', description: 'Add trailing comma/semicolon when the literal spans multiple lines.' },
      { value: 'all', description: 'Always add trailing comma/semicolon when possible.' }
    ]
  },
  powershellSortHashtableKeys: {
    category: 'PowerShell',
    type: 'boolean',
    default: false,
    description: 'Sort hashtable keys alphabetically when formatting.'
  },
  powershellBlankLinesBetweenFunctions: {
    category: 'PowerShell',
    type: 'int',
    default: 1,
    description: 'Number of blank lines to ensure between function declarations.',
    range: { start: 0, end: 3, step: 1 }
  },
  powershellBlankLineAfterParam: {
    category: 'PowerShell',
    type: 'boolean',
    default: true,
    description: 'Insert a blank line after param(...) blocks inside script blocks.'
  }
};

export const defaultOptions = {
  tabWidth: 2
};

export interface ResolvedOptions {
  indentStyle: IndentStyleOption;
  indentSize: number;
  trailingComma: TrailingCommaOption;
  sortHashtableKeys: boolean;
  blankLinesBetweenFunctions: number;
  blankLineAfterParam: boolean;
}

export function resolveOptions(options: ParserOptions): ResolvedOptions {
  const indentStyle = (options.powershellIndentStyle as IndentStyleOption | undefined) ?? 'spaces';
  const indentSize = (options.powershellIndentSize as number | undefined) ?? options.tabWidth ?? 2;

  if (indentStyle === 'tabs') {
    options.useTabs = true;
  } else {
    options.useTabs = false;
  }
  options.tabWidth = indentSize;

  const trailingComma = (options.powershellTrailingComma as TrailingCommaOption | undefined) ?? 'multiline';
  const sortHashtableKeys = Boolean(options.powershellSortHashtableKeys);
  const blankLinesBetweenFunctions = Math.max(
    0,
    Math.min(3, Number(options.powershellBlankLinesBetweenFunctions ?? 1))
  );
  const blankLineAfterParam = options.powershellBlankLineAfterParam === false ? false : true;

  return {
    indentStyle,
    indentSize,
    trailingComma,
    sortHashtableKeys,
    blankLinesBetweenFunctions,
    blankLineAfterParam
  } satisfies ResolvedOptions;
}
