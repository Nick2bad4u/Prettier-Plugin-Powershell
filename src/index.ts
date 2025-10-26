import type { Plugin, SupportLanguage } from 'prettier';
import { parsePowerShell, locEnd, locStart } from './parser.js';
import { powerShellPrinter } from './printer.js';
import { pluginOptions, defaultOptions } from './options.js';

const languages: SupportLanguage[] = [
  {
    name: 'PowerShell',
    parsers: ['powershell'],
    extensions: ['.ps1', '.psm1', '.psd1'],
    tmScope: 'source.powershell',
    aceMode: 'powershell',
    linguistLanguageId: 131,
    vscodeLanguageIds: ['powershell'],
  },
] as const;

const parsers: Plugin['parsers'] = {
  powershell: {
    parse: parsePowerShell,
    astFormat: 'powershell-ast',
    locStart,
    locEnd,
    hasPragma() {
      return false;
    },
  },
} as const;

const printers: Plugin['printers'] = {
  'powershell-ast': powerShellPrinter,
};

const plugin: Plugin = {
  languages,
  parsers,
  printers,
  options: pluginOptions,
  defaultOptions,
};

export default plugin;
export { languages, parsers, printers, pluginOptions as options, defaultOptions };
