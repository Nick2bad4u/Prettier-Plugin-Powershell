import type { ParserOptions, SupportOptions } from "prettier";
import type { UnknownRecord } from "type-fest";

import { isDefined, isFinite, objectEntries, safeCastTo } from "ts-extras";

/**
 * Brace placement styles supported by the plugin.
 */
export type BraceStyleOption = "1tbs" | "allman";

/**
 * Indentation mode for formatted output.
 */
export type IndentStyleOption = "spaces" | "tabs";

/**
 * Keyword casing normalization mode.
 */
export type KeywordCaseOption = "lower" | "pascal" | "preserve" | "upper";

/**
 * Full PowerShell-specific option bag accepted by the plugin.
 */
export interface PluginConfiguration {
    powershellBlankLineAfterParam: boolean;
    powershellBlankLinesBetweenFunctions: number;
    powershellBraceStyle: BraceStyleOption;
    powershellIndentSize: number;
    powershellIndentStyle: IndentStyleOption;
    powershellKeywordCase: KeywordCaseOption;
    powershellLineWidth: number;
    powershellPreferSingleQuote: boolean;
    powershellPreset: PresetOption;
    powershellRewriteAliases: boolean;
    powershellRewriteWriteHost: boolean;
    powershellSortHashtableKeys: boolean;
    powershellTrailingComma: TrailingCommaOption;
}

/**
 * Named preset modes that apply grouped defaults.
 */
export type PresetOption = "invoke-formatter" | "none";

/**
 * Trailing delimiter behavior for multiline literals.
 */
export type TrailingCommaOption = "all" | "multiline" | "none";

/**
 * Prettier option descriptors exposed by the plugin.
 */
export const pluginOptions: SupportOptions = {
    powershellBlankLineAfterParam: {
        category: "PowerShell",
        default: true,
        description:
            "Insert a blank line after param(...) blocks inside script blocks.",
        type: "boolean",
    },
    powershellBlankLinesBetweenFunctions: {
        category: "PowerShell",
        default: 1,
        description:
            "Number of blank lines to ensure between function declarations.",
        range: { end: 3, start: 0, step: 1 },
        type: "int",
    },
    powershellBraceStyle: {
        category: "PowerShell",
        choices: [
            {
                description:
                    "One True Brace Style – keep opening braces on the same line.",
                value: "1tbs",
            },
            {
                description:
                    "Allman style – place opening braces on the next line.",
                value: "allman",
            },
        ],
        default: "1tbs",
        description:
            "Control placement of opening braces for script blocks and functions.",
        type: "choice",
    },
    powershellIndentSize: {
        category: "PowerShell",
        default: 4,
        description: "Number of indentation characters for each level.",
        range: { end: 8, start: 1, step: 1 },
        type: "int",
    },
    powershellIndentStyle: {
        category: "PowerShell",
        choices: [
            { description: "Use spaces for indentation.", value: "spaces" },
            { description: "Use tabs for indentation.", value: "tabs" },
        ],
        default: "spaces",
        description: "Indent PowerShell code using spaces or tabs.",
        type: "choice",
    },
    powershellKeywordCase: {
        category: "PowerShell",
        choices: [
            {
                description: "Leave keyword casing unchanged.",
                value: "preserve",
            },
            { description: "Convert keywords to lower-case.", value: "lower" },
            { description: "Convert keywords to upper-case.", value: "upper" },
            {
                description: "Capitalise keywords (PascalCase).",
                value: "pascal",
            },
        ],
        default: "lower",
        description:
            "Normalise the casing of PowerShell keywords (defaults to lowercase to match PSScriptAnalyzer).",
        type: "choice",
    },
    powershellLineWidth: {
        category: "PowerShell",
        default: 120,
        description: "Maximum preferred line width for PowerShell documents.",
        range: { end: 200, start: 40, step: 1 },
        type: "int",
    },
    powershellPreferSingleQuote: {
        category: "PowerShell",
        default: false,
        description:
            "Prefer single-quoted strings when no interpolation is required.",
        type: "boolean",
    },
    powershellPreset: {
        category: "PowerShell",
        choices: [
            {
                description:
                    "Do not apply a preset; rely solely on explicit options.",
                value: "none",
            },
            {
                description:
                    "Match the defaults used by Invoke-Formatter / PSScriptAnalyzer's CodeFormatting profile.",
                value: "invoke-formatter",
            },
        ],
        default: "none",
        description:
            "Apply a predefined bundle of formatting preferences (e.g. Invoke-Formatter parity).",
        type: "choice",
    },
    powershellRewriteAliases: {
        category: "PowerShell",
        default: false,
        description: "Rewrite common cmdlet aliases to their canonical names.",
        type: "boolean",
    },
    powershellRewriteWriteHost: {
        category: "PowerShell",
        default: false,
        description:
            "Rewrite Write-Host invocations to Write-Output to discourage host-only output.",
        type: "boolean",
    },
    powershellSortHashtableKeys: {
        category: "PowerShell",
        default: false,
        description: "Sort hashtable keys alphabetically when formatting.",
        type: "boolean",
    },
    powershellTrailingComma: {
        category: "PowerShell",
        choices: [
            {
                description: "Never add a trailing comma or semicolon.",
                value: "none",
            },
            {
                description:
                    "Add trailing comma/semicolon when the literal spans multiple lines.",
                value: "multiline",
            },
            {
                description:
                    "Always add trailing comma/semicolon when possible.",
                value: "all",
            },
        ],
        default: "none",
        description:
            "Control trailing commas for array and hashtable literals.",
        type: "choice",
    },
};

/**
 * Plugin-level default options merged by Prettier.
 */
export const defaultOptions = {
    tabWidth: 4,
};

/**
 * Fully-resolved runtime options consumed by parser/printer code.
 */
export interface ResolvedOptions {
    blankLineAfterParam: boolean;
    blankLinesBetweenFunctions: number;
    braceStyle: BraceStyleOption;
    indentSize: number;
    indentStyle: IndentStyleOption;
    keywordCase: KeywordCaseOption;
    lineWidth: number;
    preferSingleQuote: boolean;
    rewriteAliases: boolean;
    rewriteWriteHost: boolean;
    sortHashtableKeys: boolean;
    trailingComma: TrailingCommaOption;
}

type PresetDefaults = Partial<
    Record<"tabWidth" | keyof PluginConfiguration, unknown>
>;

const PRESET_DEFAULTS: Record<PresetOption, PresetDefaults> = {
    "invoke-formatter": {
        powershellBlankLineAfterParam: true,
        powershellBlankLinesBetweenFunctions: 1,
        powershellBraceStyle: "1tbs",
        powershellIndentSize: 4,
        powershellIndentStyle: "spaces",
        powershellKeywordCase: "lower",
        powershellLineWidth: 120,
        powershellPreferSingleQuote: false,
        powershellRewriteAliases: false,
        powershellRewriteWriteHost: false,
        powershellSortHashtableKeys: false,
        powershellTrailingComma: "none",
        tabWidth: 4,
    },
    none: {},
};

const PRESET_OPTIONS = new Set<PresetOption>(["invoke-formatter", "none"]);
const INDENT_STYLE_OPTIONS = new Set<IndentStyleOption>(["spaces", "tabs"]);
const TRAILING_COMMA_OPTIONS = new Set<TrailingCommaOption>([
    "all",
    "multiline",
    "none",
]);
const BRACE_STYLE_OPTIONS = new Set<BraceStyleOption>(["1tbs", "allman"]);
const KEYWORD_CASE_OPTIONS = new Set<KeywordCaseOption>([
    "lower",
    "pascal",
    "preserve",
    "upper",
]);

function readChoiceOption<T extends string>(
    options: Readonly<ParserOptions>,
    key: string,
    allowedValues: ReadonlySet<T>
): T | undefined {
    const value = options[key];
    if (typeof value !== "string") {
        return undefined;
    }
    for (const allowed of allowedValues) {
        if (value === allowed) {
            return allowed;
        }
    }
    return undefined;
}

/**
 * Applies preset defaults for missing options only.
 *
 * @param options - Mutable parser options object.
 * @param preset - Selected preset name.
 */
const applyPresetDefaults = (
    options: Readonly<ParserOptions>,
    preset: PresetOption
): void => {
    const overrides = PRESET_DEFAULTS[preset];
    if (!isDefined(overrides)) {
        return;
    }

    const target = safeCastTo<UnknownRecord>(options);
    for (const [key, value] of objectEntries(overrides)) {
        if (!isDefined(target[key])) {
            target[key] = value;
        }
    }
};

/**
 * Resolves PowerShell-specific options and normalizes Prettier options.
 *
 * Note: This function mutates the input `options` object by setting `useTabs`,
 * `tabWidth`, and `printWidth` to ensure consistency between
 * PowerShell-specific settings and Prettier's core settings.
 */
export function resolveOptions(
    options: Readonly<ParserOptions>
): ResolvedOptions {
    const preset =
        readChoiceOption(options, "powershellPreset", PRESET_OPTIONS) ?? "none";
    applyPresetDefaults(options, preset);

    // Use a mutable alias for Prettier's core settings we must write back.
    const mutableOptions = safeCastTo<ParserOptions>(options);

    const indentStyle =
        readChoiceOption(
            options,
            "powershellIndentStyle",
            INDENT_STYLE_OPTIONS
        ) ?? "spaces";
    const rawIndentOverride = options["powershellIndentSize"];
    const normalizedIndentOverride = Number(rawIndentOverride);
    const normalizedTabWidth = options.tabWidth;
    // Default to 4; overridden by explicit override or tabWidth when valid.
    let indentSize = 4;
    if (isFinite(normalizedIndentOverride) && normalizedIndentOverride > 0) {
        indentSize = Math.floor(normalizedIndentOverride);
    } else if (isFinite(normalizedTabWidth) && normalizedTabWidth > 0) {
        indentSize = Math.floor(normalizedTabWidth);
    } else {
        // Keep the default indentation width.
    }

    mutableOptions.useTabs = indentStyle === "tabs";
    mutableOptions.tabWidth = indentSize;

    const trailingComma =
        readChoiceOption(
            options,
            "powershellTrailingComma",
            TRAILING_COMMA_OPTIONS
        ) ?? "none";
    const isSortHashtableKeys = Boolean(options["powershellSortHashtableKeys"]);
    const rawBlankLines = Number(
        options["powershellBlankLinesBetweenFunctions"] ?? 1
    );
    const normalizedBlankLines = isFinite(rawBlankLines) ? rawBlankLines : 1;
    const blankLinesBetweenFunctions = Math.max(
        0,
        Math.min(3, Math.floor(normalizedBlankLines))
    );
    const isBlankLineAfterParam =
        options["powershellBlankLineAfterParam"] !== false;
    const braceStyle =
        readChoiceOption(
            options,
            "powershellBraceStyle",
            BRACE_STYLE_OPTIONS
        ) ?? "1tbs";
    const lineWidth = Math.max(
        40,
        Math.min(200, Number(options["powershellLineWidth"] ?? 120))
    );
    const isPreferSingleQuote = options["powershellPreferSingleQuote"] === true;
    const keywordCase =
        readChoiceOption(
            options,
            "powershellKeywordCase",
            KEYWORD_CASE_OPTIONS
        ) ?? "lower";
    const isRewriteAliases = options["powershellRewriteAliases"] === true;
    const isRewriteWriteHost = options["powershellRewriteWriteHost"] === true;

    if (!options.printWidth || options.printWidth > lineWidth) {
        mutableOptions.printWidth = lineWidth;
    }

    return {
        blankLineAfterParam: isBlankLineAfterParam,
        blankLinesBetweenFunctions,
        braceStyle,
        indentSize,
        indentStyle,
        keywordCase,
        lineWidth,
        preferSingleQuote: isPreferSingleQuote,
        rewriteAliases: isRewriteAliases,
        rewriteWriteHost: isRewriteWriteHost,
        sortHashtableKeys: isSortHashtableKeys,
        trailingComma,
    } satisfies ResolvedOptions;
}
