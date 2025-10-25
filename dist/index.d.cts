import { SupportOptions, SupportLanguage, Plugin } from 'prettier';

declare const pluginOptions: SupportOptions;
declare const defaultOptions: {
    tabWidth: number;
};

declare const languages: SupportLanguage[];
declare const parsers: Plugin['parsers'];
declare const printers: Plugin['printers'];
declare const plugin: Plugin;

export { plugin as default, defaultOptions, languages, pluginOptions as options, parsers, printers };
