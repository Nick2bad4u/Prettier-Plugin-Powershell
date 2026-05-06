import type { Plugin, SupportLanguage } from "prettier";

import { defaultOptions, pluginOptions } from "./options.js";
import { locEnd, locStart, parsePowerShell } from "./parser.js";
import { powerShellPrinter } from "./printer.js";

const languages: SupportLanguage[] = [
    {
        aceMode: "powershell",
        extensions: [
            ".ps1",
            ".psm1",
            ".psd1",
        ],
        linguistLanguageId: 131,
        name: "PowerShell",
        parsers: ["powershell"],
        tmScope: "source.powershell",
        vscodeLanguageIds: ["powershell"],
    },
] as const;

/**
 * PowerShell pragma marker recognised by both `hasPragma` and `insertPragma`. A
 * line comment `# @format` or `# @prettier` anywhere in the file (not just the
 * first line) signals that this file should be formatted. The `m` flag makes
 * `^` match after every newline so the pragma can live on any line.
 */
const PRAGMA_PATTERN = /^#[\t ]*@(?:format|prettier)\b/mu;

const parsers: Plugin["parsers"] = {
    powershell: {
        astFormat: "powershell-ast",
        hasPragma(text: string) {
            return PRAGMA_PATTERN.test(text);
        },
        locEnd,
        locStart,
        parse: parsePowerShell,
    },
} as const;

const printers: Plugin["printers"] = {
    "powershell-ast": powerShellPrinter,
};

/**
 * Prettier plugin entry object exported for runtime registration.
 */
const plugin: Plugin = {
    defaultOptions,
    languages,
    options: pluginOptions,
    parsers,
    printers,
};

/* c8 ignore next */
export default plugin;
