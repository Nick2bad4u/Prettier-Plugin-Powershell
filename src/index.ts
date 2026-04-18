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

const parsers: Plugin["parsers"] = {
    powershell: {
        astFormat: "powershell-ast",
        hasPragma() {
            return false;
        },
        locEnd,
        locStart,
        parse: parsePowerShell,
    },
} as const;

const printers: Plugin["printers"] = {
    "powershell-ast": powerShellPrinter,
};

const plugin: Plugin = {
    defaultOptions,
    languages,
    options: pluginOptions,
    parsers,
    printers,
};

/* c8 ignore next */
export default plugin;
