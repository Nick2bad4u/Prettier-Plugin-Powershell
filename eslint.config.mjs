// @ts-nocheck -- ESLint plugins always have the wrong types and are a PITA to type correctly,
// and this file is already checked by ESLint itself, so we can skip type checking for the whole file.
/**
 * Optimized ESLint configuration
 *
 * @see {@link https://www.schemastore.org/eslintrc.json} for JSON schema validation
 */
/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair -- Eslint doesn't use default */
/* eslint-disable import-x/no-named-as-default-member, n/no-unsupported-features/node-builtins -- Rule wants packages not in dev, doesn't apply, eslint doesnt use default import */

import pluginDocusaurus from "@docusaurus/eslint-plugin";
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import eslintReactPlugin from "@eslint-react/eslint-plugin";
import { defineConfig, globalIgnores } from "@eslint/config-helpers";
import css from "@eslint/css";
import js from "@eslint/js";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import html from "@html-eslint/eslint-plugin";
import * as htmlParser from "@html-eslint/parser";
import stylistic from "@stylistic/eslint-plugin";
import tseslint from "@typescript-eslint/eslint-plugin";
import tseslintParser from "@typescript-eslint/parser";
import vite from "@typpi/eslint-plugin-vite";
import vitest from "@vitest/eslint-plugin";
import gitignore from "eslint-config-flat-gitignore";
import eslintConfigPrettier from "eslint-config-prettier";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import arrayFunc from "eslint-plugin-array-func";
import pluginCanonical from "eslint-plugin-canonical";
import pluginCasePolice from "eslint-plugin-case-police";
import eslintPluginCommentLength from "eslint-plugin-comment-length";
import copilot from "eslint-plugin-copilot";
import * as pluginCssModules from "eslint-plugin-css-modules";
import deMorgan from "eslint-plugin-de-morgan";
import depend from "eslint-plugin-depend";
import docusaurus2 from "eslint-plugin-docusaurus-2";
import eslintPluginEslintPlugin from "eslint-plugin-eslint-plugin";
import etcMisc from "eslint-plugin-etc-misc";
import progress from "eslint-plugin-file-progress-2";
import githubActions from "eslint-plugin-github-actions-2";
import immutable from "eslint-plugin-immutable-2";
import { importX } from "eslint-plugin-import-x";
import jsdocPlugin from "eslint-plugin-jsdoc";
import eslintPluginJsonc from "eslint-plugin-jsonc";
import eslintPluginJsxA11y from "eslint-plugin-jsx-a11y";
import listeners from "eslint-plugin-listeners";
import eslintPluginMath from "eslint-plugin-math";
import moduleInterop from "eslint-plugin-module-interop";
import nodePlugin from "eslint-plugin-n";
import nitpick from "eslint-plugin-nitpick";
import noBarrelFiles from "eslint-plugin-no-barrel-files";
import * as pluginNFDAR from "eslint-plugin-no-function-declare-after-return";
import pluginRegexLook from "eslint-plugin-no-lookahead-lookbehind-regexp";
import pluginNoOnly from "eslint-plugin-no-only-tests";
import noSecrets from "eslint-plugin-no-secrets";
import nounsanitized from "eslint-plugin-no-unsanitized";
import eslintPluginNoUseExtendNative from "eslint-plugin-no-use-extend-native";
import nodeDependencies from "eslint-plugin-node-dependencies";
import packageJson from "eslint-plugin-package-json";
import perfectionist from "eslint-plugin-perfectionist";
import pluginPrettier from "eslint-plugin-prettier";
import pluginPromise from "eslint-plugin-promise";
import pluginRedos from "eslint-plugin-redos";
import pluginRegexp from "eslint-plugin-regexp";
import * as pluginJSDoc from "eslint-plugin-require-jsdoc";
import sdl from "eslint-plugin-sdl-2";
import pluginSecurity from "eslint-plugin-security";
import sonarjs, { configs as sonarjsConfigs } from "eslint-plugin-sonarjs";
import stylelint2 from "eslint-plugin-stylelint-2";
import pluginTestingLibrary from "eslint-plugin-testing-library";
import eslintPluginToml from "eslint-plugin-toml";
import pluginTsdoc from "eslint-plugin-tsdoc";
import tsdocRequire from "eslint-plugin-tsdoc-require-2";
import typedocPlugin from "eslint-plugin-typedoc";
import pluginUndefinedCss from "eslint-plugin-undefined-css-classes";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import pluginUnusedImports from "eslint-plugin-unused-imports";
import writeGoodComments from "eslint-plugin-write-good-comments-2";
import eslintPluginYml from "eslint-plugin-yml";
import globals from "globals";
import * as jsoncEslintParser from "jsonc-eslint-parser";
import { createRequire } from "node:module";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as tomlEslintParser from "toml-eslint-parser";
import * as yamlEslintParser from "yaml-eslint-parser";

// NOTE: eslint-plugin-json-schema-validator may attempt to fetch remote schemas
// at lint time. That makes linting flaky/offline-hostile.
// Keep it opt-in via ENABLE_JSON_SCHEMA_VALIDATION=1.
const enableJsonSchemaValidation =
    globalThis.process.env["ENABLE_JSON_SCHEMA_VALIDATION"] === "1";

const jsonSchemaValidatorPackageName = "eslint-plugin-json-schema-validator";

let eslintPluginJsonSchemaValidator = undefined;

if (enableJsonSchemaValidation) {
    eslintPluginJsonSchemaValidator =
        // eslint-disable-next-line no-unsanitized/method -- Controlled package name constant; no user input reaches dynamic import.
        (await import(jsonSchemaValidatorPackageName)).default;
}

const jsonSchemaValidatorPlugins = enableJsonSchemaValidation
    ? { "json-schema-validator": eslintPluginJsonSchemaValidator }
    : {};

const jsonSchemaValidatorRules = enableJsonSchemaValidation
    ? { "json-schema-validator/no-invalid": "error" }
    : {};

const require = createRequire(import.meta.url);
// eslint-disable-next-line unicorn/prefer-import-meta-properties -- n/no-unsupported-features reports import.meta.dirname as unsupported in this config context.
const configDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const processEnvironment = globalThis.process.env;

/**
 * Controls eslint-plugin-file-progress behavior.
 *
 * @remarks
 * The file-progress rule is great for interactive CLI runs, but it produces
 * extremely large logs when output is redirected to a file.
 *
 * Supported values:
 *
 * - (unset) / "on": enable progress and show file names
 * - "nofile": enable progress but hide file names
 * - "off" / "0" / "false": disable progress
 */
const ESLINT_PROGRESS_MODE = (
    processEnvironment["ESLINT_PROGRESS"] ?? "on"
).toLowerCase();

const IS_CI = (processEnvironment["CI"] ?? "").toLowerCase() === "true";
const DISABLE_PROGRESS =
    ESLINT_PROGRESS_MODE === "off" ||
    ESLINT_PROGRESS_MODE === "0" ||
    ESLINT_PROGRESS_MODE === "false";
const HIDE_PROGRESS_FILENAMES = ESLINT_PROGRESS_MODE === "nofile";

/** @type {import("eslint").Linter.Config} */
const fileProgressOverridesConfig = {
    name: "CLI: file progress overrides",
    rules: {
        // The preset already auto-hides on CI, but we also support explicit
        // local toggles.
        "file-progress/activate": DISABLE_PROGRESS ? 0 : 1,
    },
    settings: {
        progress: {
            detailedSuccess: false, // Show multi-line final summary (duration, file count, exit code)
            failureMark: "✖", // Custom mark used for failure completion
            fileNameOnNewLine: true, // Show file names on a new line for better readability
            hide: IS_CI || DISABLE_PROGRESS, // Hide progress output (useful in CI)
            hideDirectoryNames: false, // Show only the filename (no directory path segments)
            hideFileName: HIDE_PROGRESS_FILENAMES, // Show generic "Linting..." instead of file names
            hidePrefix: false, // Hide plugin prefix text before progress/summary output
            prefixMark: "•", // Marker after plugin name prefix in progress lines
            spinnerStyle: "dots", // Line | dots | arc | bounce | clock
            successMark: "✔", // Custom mark used for success completion
            successMessage: "Linting complete!", // Custom message on successful completion
        },
    },
};

const configuredRecheckJar = processEnvironment["RECHECK_JAR"];

if (
    typeof configuredRecheckJar !== "string" ||
    configuredRecheckJar.length === 0
) {
    const resolvedRecheckJarPath = (() => {
        try {
            return require.resolve("recheck-jar/recheck.jar");
        } catch {
            console.warn(
                '[eslint.config] Unable to resolve "recheck-jar/recheck.jar". eslint-plugin-redos will rely on its internal resolution logic.'
            );
            return undefined;
        }
    })();
    if (
        typeof resolvedRecheckJarPath === "string" &&
        resolvedRecheckJarPath.length > 0
    ) {
        processEnvironment["RECHECK_JAR"] = path.normalize(
            resolvedRecheckJarPath
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// #region 🌍 Global Configs and Rules
// SECTION: Global Configs and Rules
// ═══════════════════════════════════════════════════════════════════════════════
export default defineConfig([
    globalIgnores([
        "**/CHANGELOG.md",
        ".remarkrc.mjs",
        "tests/fixtures/**",
        "docs/docusaurus/site-contract.config.d.mts",
        "docs/docusaurus/site-contract.config.mjs",
    ]),
    gitignore({
        name: "Global - .gitignore Rules",
        root: true,
        strict: true,
    }),
    // Stylistic.configs.customize({
    //     arrowParens: true,
    //     blockSpacing: true,
    //     braceStyle: "stroustrup",
    //     commaDangle: "always-multiline",
    //     experimental: true,
    //     // The following options are the default values
    //     indent: 4,
    //     jsx: true,
    //     pluginName: "@stylistic",
    //     quoteProps: "as-needed",
    //     quotes: 'double',
    //     semi: true,
    //     severity: "warn",
    //     // ...
    //   }),
    {
        // NOTE: In ESLint flat config, ignore-only entries are safest when
        // placed near the start of the config array.
        // ═══════════════════════════════════════════════════════════════════════════════
        // SECTION: Global Ignore Patterns
        // Add patterns here to ignore files and directories globally
        // ═══════════════════════════════════════════════════════════════════════════════
        ignores: [
            "**/**-instructions.md",
            "**/**.instructions.md",
            "**/**dist**/**",
            "**/.agentic-tools*",
            "**/.cache/**",
            "**/Coverage/**",
            "**/_ZENTASKS*",
            "**/chatproject.md",
            "**/coverage-results.json",
            "**/coverage/**",
            "**/dist-scripts/**",
            "**/dist/**",
            "**/*.css.d.ts",
            "**/*.module.css.d.ts",
            "**/html/**",
            "**/node_modules/**",
            "**/package-lock.json",
            "**/release/**",
            ".devskim.json",
            ".github/ISSUE_TEMPLATE/**",
            ".github/PULL_REQUEST_TEMPLATE/**",
            ".github/chatmodes/**",
            ".github/instructions/**",
            ".github/prompts/**",
            ".stryker-tmp/**",
            "**/CHANGELOG.md",
            "coverage-report.json",
            "config/testing/types/**/*.d.ts",
            "docs/Archive/**",
            "docs/Logger-Error-report.md",
            "docs/Packages/**",
            "docs/Reviews/**",
            "docs/docusaurus/.docusaurus/**",
            "docs/docusaurus/build/**",
            "docs/docusaurus/docs/**",
            "docs/docusaurus/static/eslint-inspector/**",
            "docs/docusaurus/static/stylelint-inspector/**",
            "docs/docusaurus/static/*-inspector/**",
            "report/**",
            "reports/**",
            "scripts/devtools-snippets/**",
            "playwright/reports/**",
            "playwright/test-results/**",
            "public/mockServiceWorker.js",
            "temp/**",
            ".temp/**",
        ],
        name: "Global: Ignore Patterns **/**",
    },
    // #endregion
    // #region 🧱 Base Flat Configs
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION:  Base Flat Configs
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        ...importX.flatConfigs.typescript,
        files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,cts,mts}"],
        name: "Import-X TypeScript (code files only)",
    },
    {
        ...docusaurus2.configs.all,
        rules: {
            ...docusaurus2.configs.all.rules,
            ...docusaurus2.configs["strict-mdx-upgrade"].rules,
            ...docusaurus2.configs.content.rules,
            "docusaurus-2/local-search-will-not-work-in-dev": "off",
        },
    },
    progress.configs["recommended-ci"],
    copilot.configs.all,
    sdl.configs.required,
    githubActions.configs.all,
    vite.configs.all,
    stylelint2.configs.all,
    {
        ...typedocPlugin.configs.recommended,
        name: "TypeDoc recommended (repo tuned)",
        rules: {
            ...typedocPlugin.configs.recommended.rules,

            "typedoc/no-empty-private-remarks-tag": "off",
            "typedoc/no-extra-type-param-tags": "off",
            "typedoc/no-unknown-tags": "warn",
            "typedoc/require-code-fence-language": "off",
            "typedoc/require-default-value-tag": "off",
            "typedoc/require-example-tag": "off",
            "typedoc/require-package-documentation": "off",
            "typedoc/require-package-documentation-description": "off",
            "typedoc/require-param-tag-description": "off",
            "typedoc/require-param-tags": "off",
            "typedoc/require-returns-description": "off",
            "typedoc/require-returns-tag": "off",
            "typedoc/require-see-tag-link": "off",
            "typedoc/require-since-tag-description": "off",
            "typedoc/require-throws-description": "off",
            "typedoc/require-throws-tag": "off",
            "typedoc/require-type-param-tag-description": "off",
            "typedoc/require-type-param-tags": "off",
        },
    },
    {
        ...immutable.configs.all,
        files: ["functional/*.{js,jsx,mjs,cjs,ts,tsx,cts,mts}"],
        name: "Immutable: functional (not used in this repo)",
    },
    {
        ...writeGoodComments.configs.all,
        files: ["src/*.{js,jsx,mjs,cjs,ts,tsx,cts,mts}"],
        name: "Write Good Comments: (not used in this repo)",
        rules: {
            "write-good-comments/inclusive-language-comments": "off",
            "write-good-comments/no-profane-comments": "off",
            "write-good-comments/readability-comments": "off",
            "write-good-comments/spellcheck-comments": "off",
            "write-good-comments/task-comment-format": "off",
            "write-good-comments/write-good-comments": "off",
        },
    },
    fileProgressOverridesConfig,
    {
        ...noBarrelFiles.flat,
        files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,cts,mts}"],
        name: "No barrel files (code files only)",
    },
    {
        ...nitpick.configs.recommended,
        files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,cts,mts}"],
        name: "Nitpick recommended (code files only)",
    },
    {
        ...comments.recommended,
        files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,cts,mts}"],
        name: "ESLint comments recommended (code files only)",
    },
    {
        ...arrayFunc.configs.all,
        files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,cts,mts}"],
        name: "Array func all (code files only)",
    },
    deMorgan.configs.recommended,
    ...pluginCasePolice.configs.recommended,
    // ...jsdocPlugin.configs["examples-and-default-expressions"],
    // #endregion
    // #region 🧩 Custom Flat Configs
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION:  Github Config Rules
    // ═══════════════════════════════════════════════════════════════════════════════
    // NOTE:
    // `eslint-plugin-github` rules are written for JS/TS and assume the ESLint
    // rule context supports scope analysis (e.g. `context.getScope`). When
    // ESLint is linting non-JS languages (YAML via `yaml-eslint-parser`, TOML,
    // etc.), that API surface is not available and those rules can crash while
    // trying to bind missing methods.
    //
    // Scope GitHub rules to code files only so they never run on `.yml` like
    // `.codecov.yml`.
    // {
    //     ...github.getFlatConfigs().recommended,
    //     files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,cts,mts}"],
    //     name: "GitHub: recommended (code files only)",
    // },
    // {
    //     ...github.getFlatConfigs().react,
    //     files: ["**/*.{jsx,tsx}"],
    //     name: "GitHub: react (jsx/tsx only)",
    // },
    // ...github.getFlatConfigs().typescript.map(
    //     /**
    //      * @param {EslintConfig} config
    //      */
    //     (config) => ({
    //     ...config,
    //     files: ["**/*.{ts,tsx,cts,mts}"],
    //     name: config.name
    //         ? `GitHub: typescript (${config.name})`
    //         : "GitHub: typescript (ts/tsx only)",
    //     })
    // ),
    // #endregion
    // #region 🧭 Custom Global Rules
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: Custom Global Rules
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        name: "Array conversion: prefer spread",
        rules: {
            // Conflicts with `unicorn/prefer-spread` and can cause circular
            // autofix loops. We prefer spread (`[...iterable]`) for iterables
            // and only reach for Array.from when we specifically need its
            // mapping function or array-like support.
            "array-func/prefer-array-from": "off",
        },
    },
    // #endregion
    // #region 🗣️ Global Language Options
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION:  Global Language Options
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...vitest.environments.env.globals,
                __dirname: "readonly",
                __filename: "readonly",
                afterAll: "readonly",
                afterEach: "readonly",
                beforeAll: "readonly",
                beforeEach: "readonly",
                Buffer: "readonly",
                describe: "readonly",
                document: "readonly",
                expect: "readonly",
                global: "readonly",
                globalThis: "readonly",
                it: "readonly",
                module: "readonly",
                process: "readonly",
                require: "readonly",
                test: "readonly",
                vi: "readonly",
                window: "readonly",
            },
        },
        name: "Global Language Options **/**",
    },
    {
        files: ["**/*.d.{ts,mts,cts}"],
        languageOptions: {
            parser: tseslintParser,
            parserOptions: {
                ecmaVersion: "latest",
                jsDocParsingMode: "all",
                sourceType: "module",
                warnOnUnsupportedTypeScriptVersion: true,
            },
        },
        name: "Type Declarations - TypeScript Parser",
    },
    // #endregion
    // #region 📃 TSDoc Setup
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: 📃 TSDoc (tsdoc/*)
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: ["**/*.{ts,mts,cts,tsx}"],
        name: "TSDoc rules (TypeScript files)",
        plugins: {
            tsdoc: pluginTsdoc,
        },
        rules: {
            "tsdoc/syntax": "warn",
        },
    },
    {
        files: ["src/**/*.{ts,mts,cts,tsx}"],
        name: "TSDoc rules (TypeScript files)",
        plugins: {
            "tsdoc-require-2": tsdocRequire,
        },
        rules: {
            "tsdoc-require-2/require": "warn",
            "tsdoc-require-2/require-abstract": "off",
            "tsdoc-require-2/require-alpha": "off",
            "tsdoc-require-2/require-author": "off",
            "tsdoc-require-2/require-beta": "off",
            "tsdoc-require-2/require-category": "off",
            "tsdoc-require-2/require-class": "off",
            "tsdoc-require-2/require-decorator": "off",
            "tsdoc-require-2/require-default-value": "off",
            "tsdoc-require-2/require-deprecated": "off",
            "tsdoc-require-2/require-document": "off",
            "tsdoc-require-2/require-enum": "off",
            "tsdoc-require-2/require-event": "off",
            "tsdoc-require-2/require-event-property": "off",
            "tsdoc-require-2/require-example": "off",
            "tsdoc-require-2/require-expand": "off",
            "tsdoc-require-2/require-experimental": "off",
            "tsdoc-require-2/require-function": "off",
            "tsdoc-require-2/require-group": "off",
            "tsdoc-require-2/require-hidden": "off",
            "tsdoc-require-2/require-hideconstructor": "off",
            "tsdoc-require-2/require-ignore": "off",
            "tsdoc-require-2/require-import": "off",
            "tsdoc-require-2/require-include": "off",
            "tsdoc-require-2/require-inherit-doc": "off",
            "tsdoc-require-2/require-inline": "off",
            "tsdoc-require-2/require-interface": "off",
            "tsdoc-require-2/require-internal": "off",
            "tsdoc-require-2/require-label": "off",
            "tsdoc-require-2/require-license": "off",
            "tsdoc-require-2/require-link": "off",
            "tsdoc-require-2/require-merge-module-with": "off",
            "tsdoc-require-2/require-module": "off",
            "tsdoc-require-2/require-namespace": "off",
            "tsdoc-require-2/require-overload": "off",
            "tsdoc-require-2/require-override": "off",
            "tsdoc-require-2/require-package-documentation": "off",
            "tsdoc-require-2/require-param": "off",
            "tsdoc-require-2/require-primary-export": "off",
            "tsdoc-require-2/require-private": "off",
            "tsdoc-require-2/require-private-remarks": "off",
            "tsdoc-require-2/require-property": "off",
            "tsdoc-require-2/require-protected": "off",
            "tsdoc-require-2/require-public": "off",
            "tsdoc-require-2/require-readonly": "off",
            "tsdoc-require-2/require-remarks": "off",
            "tsdoc-require-2/require-returns": "off",
            "tsdoc-require-2/require-sealed": "off",
            "tsdoc-require-2/require-see": "off",
            "tsdoc-require-2/require-since": "off",
            "tsdoc-require-2/require-sort-strategy": "off",
            "tsdoc-require-2/require-summary": "off",
            "tsdoc-require-2/require-template": "off",
            "tsdoc-require-2/require-throws": "off",
            "tsdoc-require-2/require-type-param": "off",
            "tsdoc-require-2/require-use-declared-type": "off",
            "tsdoc-require-2/require-virtual": "off",
            "tsdoc-require-2/restrict-tags": "off",
        },
    },
    // #endregion
    // #region 🎨 CSS files
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: CSS (css/*)
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: ["**/*.css"],
        ignores: ["docs/**", "**/tests/**"],
        language: "css/css",
        languageOptions: {
            tolerant: true,
        },
        name: "CSS - **/*.CSS",
        plugins: {
            css: css,
            "css-modules": pluginCssModules,
            "undefined-css-classes": pluginUndefinedCss,
        },
        rules: {
            ...css.configs.recommended.rules,
            ...pluginUndefinedCss.default?.configs?.recommended?.rules,
            ...pluginCssModules.configs.recommended.rules,
            // CSS Eslint Rules (css/*)
            "css/no-empty-blocks": "error",
            "css/no-invalid-at-rules": "warn",
            "css/no-invalid-properties": "warn",
            "css/prefer-logical-properties": "warn",
            "css/relative-font-units": "warn",
            "css/selector-complexity": "warn",
            "css/use-baseline": "warn",
            "css/use-layers": "off",
            // CSS Classes Rules (undefined-css-classes/*)
            "undefined-css-classes/no-undefined-css-classes": "warn",
        },
    },
    // #endregion
    // #region 🦖 Docusaurus files
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: Docusaurus (docusaurus/*)
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: ["docs/docusaurus/**/*.{js,mjs,cjs,ts,mts,cts,tsx,jsx}"],
        ignores: [
            "docs/docusaurus/.docusaurus/**",
            "docs/docusaurus/build/**",
            "docs/docusaurus/static/eslint-inspector/**",
        ],
        languageOptions: {
            parser: tseslintParser,
            parserOptions: {
                ecmaFeatures: {
                    impliedStrict: true,
                    jsx: true,
                },
                ecmaVersion: "latest",
                jsDocParsingMode: "all",
                projectService: {
                    allowDefaultProject: [
                        "docs/docusaurus/typedoc.local.config.mjs",
                        "docs/docusaurus/typedoc-plugins/*.mjs",
                        "docs/docusaurus/typedoc-plugins/*.mts",
                    ],
                },
                sourceType: "module",
                tsconfigRootDir: import.meta.dirname,
                warnOnUnsupportedTypeScriptVersion: true,
            },
        },
        name: "Docusaurus Workspace Files",
        plugins: {
            "@docusaurus": pluginDocusaurus,
            "@eslint-react": eslintReactPlugin,
            "jsx-a11y": eslintPluginJsxA11y,
        },
        rules: {
            ...eslintReactPlugin.configs["strict-type-checked"].rules,
            ...eslintPluginJsxA11y.flatConfigs.recommended.rules,
            "@docusaurus/no-html-links": "warn",
            "@docusaurus/no-untranslated-text": "off",
            "@docusaurus/prefer-docusaurus-heading": "warn",
            "@docusaurus/string-literal-i18n-messages": "off",
            // Keep only the @eslint-react rules that are not already covered by
            // the current strict-type-checked preset and still exist after the
            // plugin upgrade.
            "@eslint-react/dom-prefer-namespace-import": "warn",
            "@eslint-react/immutability": "warn",
            "@eslint-react/jsx-no-leaked-dollar": "warn",
            "@eslint-react/no-duplicate-key": "warn",
            "@eslint-react/no-implicit-children": "warn",
            "@eslint-react/no-implicit-key": "warn",
            "@eslint-react/no-implicit-ref": "warn",
            "@eslint-react/no-missing-component-display-name": "warn",
            "@eslint-react/no-missing-context-display-name": "warn",
            "@eslint-react/prefer-namespace-import": "warn",
            "@eslint-react/refs": "warn",
            "@eslint-react/x-component-hook-factories": "warn",
            "@eslint-react/x-error-boundaries": "warn",
            "@eslint-react/x-exhaustive-deps": "warn",
            "@eslint-react/x-immutability": "warn",
            "@eslint-react/x-no-access-state-in-setstate": "warn",
            "@eslint-react/x-no-array-index-key": "warn",
            "@eslint-react/x-no-children-count": "warn",
            "@eslint-react/x-no-children-for-each": "warn",
            "@eslint-react/x-no-children-map": "warn",
            "@eslint-react/x-no-children-only": "warn",
            "@eslint-react/x-no-children-to-array": "warn",
            "@eslint-react/x-no-class-component": "warn",
            "@eslint-react/x-no-clone-element": "warn",
            "@eslint-react/x-no-component-will-mount": "warn",
            "@eslint-react/x-no-component-will-receive-props": "warn",
            "@eslint-react/x-no-component-will-update": "warn",
            "@eslint-react/x-no-context-provider": "warn",
            "@eslint-react/x-no-create-ref": "warn",
            "@eslint-react/x-no-direct-mutation-state": "warn",
            "@eslint-react/x-no-duplicate-key": "warn",
            "@eslint-react/x-no-forward-ref": "warn",
            "@eslint-react/x-no-implicit-children": "warn",
            "@eslint-react/x-no-implicit-key": "warn",
            "@eslint-react/x-no-implicit-ref": "warn",
            "@eslint-react/x-no-leaked-conditional-rendering": "warn",
            "@eslint-react/x-no-missing-component-display-name": "warn",
            "@eslint-react/x-no-missing-context-display-name": "warn",
            "@eslint-react/x-no-missing-key": "warn",
            "@eslint-react/x-no-misused-capture-owner-stack": "warn",
            "@eslint-react/x-no-nested-component-definitions": "warn",
            "@eslint-react/x-no-nested-lazy-component-declarations": "warn",
            "@eslint-react/x-no-redundant-should-component-update": "warn",
            "@eslint-react/x-no-set-state-in-component-did-mount": "warn",
            "@eslint-react/x-no-set-state-in-component-did-update": "warn",
            "@eslint-react/x-no-set-state-in-component-will-update": "warn",
            "@eslint-react/x-no-unnecessary-use-callback": "warn",
            "@eslint-react/x-no-unnecessary-use-memo": "warn",
            "@eslint-react/x-no-unnecessary-use-prefix": "warn",
            "@eslint-react/x-no-unsafe-component-will-mount": "warn",
            "@eslint-react/x-no-unsafe-component-will-receive-props": "warn",
            "@eslint-react/x-no-unsafe-component-will-update": "warn",
            "@eslint-react/x-no-unstable-context-value": "warn",
            "@eslint-react/x-no-unstable-default-props": "warn",
            "@eslint-react/x-no-unused-class-component-members": "warn",
            "@eslint-react/x-no-unused-props": "warn",
            "@eslint-react/x-no-unused-state": "warn",
            "@eslint-react/x-no-use-context": "warn",
            "@eslint-react/x-prefer-destructuring-assignment": "warn",
            "@eslint-react/x-prefer-namespace-import": "warn",
            "@eslint-react/x-purity": "warn",
            "@eslint-react/x-refs": "warn",
            "@eslint-react/x-rules-of-hooks": "warn",
            "@eslint-react/x-set-state-in-effect": "warn",
            "@eslint-react/x-set-state-in-render": "warn",
            "@eslint-react/x-unsupported-syntax": "warn",
            "@eslint-react/x-use-memo": "warn",
            "@eslint-react/x-use-state": "warn",
            "jsx-a11y/lang": "warn",
            "jsx-a11y/no-aria-hidden-on-focusable": "warn",
            "jsx-a11y/prefer-tag-over-role": "warn",
        },
        settings: {
            ...eslintReactPlugin.configs["strict-type-checked"]?.settings,
        },
    },
    // #endregion
    // #region 🚢 Local Plugin Import
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: 🚢 Local Plugin Import
    // ═══════════════════════════════════════════════════════════════════════════════
    // {
    //     files: [
    //         "src/**/*.{ts,tsx,mts,cts}",
    //         //    "tests/**/*.{ts,tsx,mts,cts}"
    //     ],
    //     name: "Local Plugin Rules from Source",
    //     plugins: {
    //         typefest: typefest,
    //     },
    //     rules: {
    //         ...typefest.configs.all.rules,
    //     },
    // },
    // #endregion
    // #region ⌨ Etc-Misc
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: ⌨ Etc-Misc (etc-misc/*)
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: [
            "src/**/*.{ts,tsx,mts,cts}",
            //    "tests/**/*.{ts,tsx,mts,cts}"
        ],
        name: "Etc-Misc Rules for Source",
        plugins: {
            "etc-misc": etcMisc,
        },
        rules: {
            // Enable rules as needed or the config:
            // ...etcMisc.configs.recommended.rules
            "etc-misc/class-match-filename": "off",
            "etc-misc/comment-spacing": "off",
            "etc-misc/consistent-empty-lines": "off",
            "etc-misc/consistent-enum-members": "off",
            "etc-misc/consistent-import": "off",
            "etc-misc/consistent-optional-props": "off",
            "etc-misc/consistent-symbol-description": "off",
            "etc-misc/default-case": "off",
            "etc-misc/disallow-import": "off",
            "etc-misc/export-matching-filename-only": "off",
            "etc-misc/match-filename": "off",
            "etc-misc/max-identifier-blocks": "off",
            "etc-misc/no-assign-mutated-array": "off",
            "etc-misc/no-at-sign-import": "off",
            "etc-misc/no-at-sign-internal-import": "off",
            "etc-misc/no-chain-coalescence-mixture": "off",
            "etc-misc/no-const-enum": "off",
            "etc-misc/no-enum": "off",
            "etc-misc/no-expression-empty-lines": "off",
            "etc-misc/no-foreach": "off",
            "etc-misc/no-implicit-any-catch": "off",
            "etc-misc/no-index-import": "off",
            "etc-misc/no-internal": "off",
            "etc-misc/no-internal-modules": "off",
            "etc-misc/no-language-mixing": "off",
            "etc-misc/no-misused-generics": "off",
            "etc-misc/no-negated-conditions": "off",
            "etc-misc/no-nodejs-modules": "off",
            "etc-misc/no-param-reassign": "off",
            "etc-misc/no-sibling-import": "off",
            "etc-misc/no-single-line-comment": "off",
            "etc-misc/no-t": "off",
            "etc-misc/no-underscore-export": "off",
            "etc-misc/no-unnecessary-as-const": "off",
            "etc-misc/no-unnecessary-break": "off",
            "etc-misc/no-unnecessary-initialization": "off",
            "etc-misc/no-unnecessary-template-literal": "off",
            "etc-misc/no-writeonly": "off",
            "etc-misc/object-format": "off",
            "etc-misc/only-export-name": "off",
            "etc-misc/prefer-arrow-function-property": "off",
            "etc-misc/prefer-const-require": "off",
            "etc-misc/prefer-less-than": "off",
            "etc-misc/prefer-only-export": "off",
            "etc-misc/require-syntax": "off",
            "etc-misc/restrict-identifier-characters": "off",
            "etc-misc/sort-array": "off",
            "etc-misc/sort-call-signature": "off",
            "etc-misc/sort-construct-signature": "off",
            "etc-misc/sort-export-specifiers": "off",
            "etc-misc/sort-keys": "off",
            "etc-misc/sort-top-comments": "off",
            "etc-misc/template-literal-format": "off",
            "etc-misc/throw-error": "off",
            "etc-misc/typescript/array-callback-return-type": "off",
            "etc-misc/typescript/consistent-array-type-name": "off",
            "etc-misc/typescript/define-function-in-one-statement": "off",
            "etc-misc/typescript/no-boolean-literal-type": "off",
            "etc-misc/typescript/no-complex-declarator-type": "off",
            "etc-misc/typescript/no-complex-return-type": "off",
            "etc-misc/typescript/no-multi-type-tuples": "off",
            "etc-misc/typescript/no-never": "off",
            "etc-misc/typescript/no-redundant-undefined-const": "off",
            "etc-misc/typescript/no-redundant-undefined-default-parameter":
                "off",
            "etc-misc/typescript/no-redundant-undefined-let": "off",
            "etc-misc/typescript/no-redundant-undefined-optional": "off",
            "etc-misc/typescript/no-redundant-undefined-promise-return-type":
                "off",
            "etc-misc/typescript/no-redundant-undefined-readonly-property":
                "off",
            "etc-misc/typescript/no-redundant-undefined-return-type": "off",
            "etc-misc/typescript/no-redundant-undefined-var": "off",
            "etc-misc/typescript/no-unsafe-object-assign": "off",
            "etc-misc/typescript/no-unsafe-object-assignment": "off",
            "etc-misc/typescript/prefer-array-type-alias": "off",
            "etc-misc/typescript/prefer-class-method": "off",
            "etc-misc/typescript/prefer-enum": "off",
            "etc-misc/typescript/prefer-named-tuple-members": "off",
            "etc-misc/typescript/prefer-readonly-array": "off",
            "etc-misc/typescript/prefer-readonly-array-parameter": "off",
            "etc-misc/typescript/prefer-readonly-index-signature": "off",
            "etc-misc/typescript/prefer-readonly-map": "off",
            "etc-misc/typescript/prefer-readonly-property": "off",
            "etc-misc/typescript/prefer-readonly-record": "off",
            "etc-misc/typescript/prefer-readonly-set": "off",
            "etc-misc/typescript/require-prop-type-annotation": "off",
            "etc-misc/typescript/require-readonly-array-property-type": "off",
            "etc-misc/typescript/require-readonly-array-return-type": "off",
            "etc-misc/typescript/require-readonly-array-type-alias": "off",
            "etc-misc/typescript/require-readonly-map-parameter-type": "off",
            "etc-misc/typescript/require-readonly-map-property-type": "off",
            "etc-misc/typescript/require-readonly-map-return-type": "off",
            "etc-misc/typescript/require-readonly-map-type-alias": "off",
            "etc-misc/typescript/require-readonly-record-parameter-type": "off",
            "etc-misc/typescript/require-readonly-record-property-type": "off",
            "etc-misc/typescript/require-readonly-record-return-type": "off",
            "etc-misc/typescript/require-readonly-record-type-alias": "off",
            "etc-misc/typescript/require-readonly-set-parameter-type": "off",
            "etc-misc/typescript/require-readonly-set-property-type": "off",
            "etc-misc/typescript/require-readonly-set-return-type": "off",
            "etc-misc/typescript/require-readonly-set-type-alias": "off",
            "etc-misc/typescript/require-this-void": "off",
            "etc-misc/underscore-internal": "off",
        },
    },
    // #endregion
    // #region ⚙️ Global Settings
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION:  Global Settings
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        name: "Global Settings Options **/**",
        settings: {
            "import-x/resolver": {
                node: true,
                noWarnOnMultipleProjects: true, // Don't warn about multiple projects
            },
            "import-x/resolver-next": [
                createTypeScriptImportResolver({
                    alwaysTryTypes: true, // Always try to resolve types under `<root>@types` directory even if it doesn't contain any source code, like `@types/unist`
                    bun: true, // Resolve Bun modules (https://github.com/import-js/eslint-import-resolver-typescript#bun)
                    noWarnOnMultipleProjects: true, // Don't warn about multiple projects
                    // Use an array
                    project: [
                        "./tsconfig.eslint.json",
                        "./tsconfig.json",
                        "./tsconfig.build.json",
                        "./tsconfig.js.json",
                    ],
                }),
            ],
        },
    },
    // #endregion
    // #region 🔌 ESLint Plugin config
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: ESLint Plugin config
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: [
            "*.{ts,mts,cts,tsx}",
            "src/**/*.{ts,mts,cts,tsx}",
            "tests/**/*.{ts,mts,cts,tsx}",
            "benchmarks/**/*.{ts,mts,cts,tsx}",
        ],
        ignores: ["plugin.mjs"],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                document: "readonly",
                globalThis: "readonly",
                window: "readonly",
            },
            parser: tseslintParser,
            parserOptions: {
                ecmaFeatures: {
                    impliedStrict: true,
                },
                ecmaVersion: "latest",
                jsDocParsingMode: "all",
                project: ["./tsconfig.eslint.json"],
                sourceType: "module",
                tsconfigRootDir: configDirectoryPath,
                warnOnUnsupportedTypeScriptVersion: true,
            },
        },
        name: "ESLint Plugin Source Files - project/**/*.*",
        plugins: {
            "@typescript-eslint": tseslint,
            canonical: pluginCanonical,
            "comment-length": eslintPluginCommentLength,
            "eslint-comments": comments,
            "eslint-plugin": eslintPluginEslintPlugin,
            "import-x": importX,
            js: js,
            jsdoc: jsdocPlugin,
            listeners,
            math: eslintPluginMath,
            "module-interop": moduleInterop,
            n: nodePlugin,
            "no-function-declare-after-return": pluginNFDAR,
            "no-lookahead-lookbehind-regexp": pluginRegexLook,
            "no-use-extend-native": eslintPluginNoUseExtendNative,
            perfectionist: perfectionist,
            promise: pluginPromise,
            redos: pluginRedos,
            regexp: pluginRegexp,
            "require-jsdoc": pluginJSDoc,
            security: pluginSecurity,
            sonarjs: sonarjs,
            "tsdoc-require-2": tsdocRequire,
            unicorn: eslintPluginUnicorn,
            "unused-imports": pluginUnusedImports,
        },
        rules: {
            // TypeScript backend rules
            ...js.configs.all.rules,
            ...tseslint.configs.recommendedTypeChecked,
            ...tseslint.configs.recommended?.rules,
            ...tseslint.configs.strictTypeChecked,
            ...tseslint.configs.strict?.rules,
            ...tseslint.configs.stylisticTypeChecked,
            ...tseslint.configs.stylistic?.rules,
            ...pluginRegexp.configs.all.rules,
            ...importX.flatConfigs.recommended.rules,
            ...importX.flatConfigs.electron.rules,
            ...importX.flatConfigs.typescript.rules,
            ...pluginPromise.configs["flat/recommended"].rules,
            ...eslintPluginUnicorn.configs.all.rules,
            ...sonarjsConfigs.recommended.rules,
            ...perfectionist.configs["recommended-natural"].rules,
            ...pluginSecurity.configs.recommended.rules,
            ...nodePlugin.configs["flat/all"].rules,
            ...eslintPluginMath.configs.recommended.rules,
            ...comments.recommended.rules,
            ...pluginCanonical.configs.recommended.rules,
            ...eslintPluginNoUseExtendNative.configs.recommended.rules,
            ...listeners.configs.strict?.rules,
            ...moduleInterop.configs.recommended.rules,

            "@eslint-community/eslint-comments/no-restricted-disable": "warn",
            // Deprecated rule - turned off
            "@eslint-community/eslint-comments/no-unused-disable": "off",
            "@eslint-community/eslint-comments/no-use": "off",
            "@eslint-community/eslint-comments/require-description": "warn",
            "@typescript-eslint/await-thenable": "error", // Prevent awaiting non-promises
            "@typescript-eslint/ban-ts-comment": "warn",
            "@typescript-eslint/ban-tslint-comment": "warn",
            "@typescript-eslint/class-literal-property-style": "warn",
            "@typescript-eslint/class-methods-use-this": "warn",
            "@typescript-eslint/consistent-generic-constructors": "warn",
            "@typescript-eslint/consistent-indexed-object-style": "warn",
            "@typescript-eslint/consistent-return": "warn",
            // Function and type safety rules
            "@typescript-eslint/consistent-type-assertions": "error",
            "@typescript-eslint/consistent-type-definitions": "warn",
            "@typescript-eslint/consistent-type-exports": "warn",
            "@typescript-eslint/consistent-type-imports": "warn",
            "@typescript-eslint/default-param-last": "warn",
            "@typescript-eslint/dot-notation": [
                "warn",
                {
                    allowPattern: "^[A-Z0-9_]+$",
                },
            ],
            "@typescript-eslint/explicit-function-return-type": [
                "warn",
                {
                    allowConciseArrowFunctionExpressionsStartingWithVoid: false,
                    allowDirectConstAssertionInArrowFunctions: true,
                    allowedNames: [],
                    allowExpressions: false,
                    allowFunctionsWithoutTypeParameters: false,
                    allowHigherOrderFunctions: true,
                    allowIIFEs: false,
                    allowTypedFunctionExpressions: true,
                },
            ],
            "@typescript-eslint/explicit-member-accessibility": "warn",
            "@typescript-eslint/explicit-module-boundary-types": "warn",
            "@typescript-eslint/init-declarations": "warn",
            "@typescript-eslint/max-params": [
                "warn",
                {
                    countVoidThis: false,
                    max: 20,
                },
            ],
            "@typescript-eslint/member-ordering": "warn",
            "@typescript-eslint/method-signature-style": "warn",
            "@typescript-eslint/naming-convention": "off",
            "@typescript-eslint/no-array-constructor": "warn",
            "@typescript-eslint/no-array-delete": "warn",
            "@typescript-eslint/no-base-to-string": "warn",
            "@typescript-eslint/no-confusing-non-null-assertion": "warn",
            "@typescript-eslint/no-confusing-void-expression": "warn",
            "@typescript-eslint/no-deprecated": "error",
            "@typescript-eslint/no-dupe-class-members": "warn",
            "@typescript-eslint/no-duplicate-enum-values": "warn",
            "@typescript-eslint/no-duplicate-type-constituents": "warn",
            "@typescript-eslint/no-dynamic-delete": "warn",
            "@typescript-eslint/no-empty-function": [
                "error",
                {
                    allow: ["arrowFunctions"], // Allow empty arrow functions for React useEffect cleanup
                },
            ],
            "@typescript-eslint/no-empty-object-type": "error",
            // Disable overly strict rules for this project
            "@typescript-eslint/no-explicit-any": "warn", // Sometimes needed
            "@typescript-eslint/no-extra-non-null-assertion": "warn",
            "@typescript-eslint/no-extraneous-class": "warn",
            // Advanced type-checked rules for async safety and runtime error prevention
            "@typescript-eslint/no-floating-promises": [
                "error",
                {
                    ignoreIIFE: false, // Catch floating IIFEs which can cause issues
                    ignoreVoid: true, // Allow void for intentionally ignored promises
                },
            ],
            "@typescript-eslint/no-for-in-array": "warn",
            "@typescript-eslint/no-implied-eval": "warn",
            // Keep enabled: Helps with bundle optimization and makes type vs runtime imports clearer.
            // Can be resolved incrementally as warnings.
            "@typescript-eslint/no-import-type-side-effects": "warn",
            "@typescript-eslint/no-inferrable-types": "warn", // Allow explicit types for React components
            "@typescript-eslint/no-invalid-this": "warn",
            "@typescript-eslint/no-invalid-void-type": "warn",
            "@typescript-eslint/no-loop-func": "warn",
            "@typescript-eslint/no-magic-numbers": "off",
            "@typescript-eslint/no-meaningless-void-operator": "warn",
            "@typescript-eslint/no-misused-new": "warn",
            "@typescript-eslint/no-misused-promises": [
                "error",
                {
                    checksConditionals: true, // Check if Promises used in conditionals
                    checksSpreads: true, // Check Promise spreads
                    checksVoidReturn: true, // Critical for IPC handlers
                },
            ],
            "@typescript-eslint/no-misused-spread": "warn",
            "@typescript-eslint/no-mixed-enums": "warn",
            "@typescript-eslint/no-namespace": "warn",
            "@typescript-eslint/no-non-null-asserted-nullish-coalescing":
                "warn",
            "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
            "@typescript-eslint/no-non-null-assertion": "warn", // Zustand patterns
            "@typescript-eslint/no-redeclare": "warn",
            "@typescript-eslint/no-redundant-type-constituents": "warn",
            "@typescript-eslint/no-require-imports": "warn",
            // Granular selector rules still need to be added manually here.
            "@typescript-eslint/no-restricted-imports": "warn",
            "@typescript-eslint/no-restricted-types": [
                "error",
                {
                    types: {
                        Function: {
                            message: [
                                "The `Function` type accepts any function-like value.",
                                "It provides no type safety when calling the function, which can be a common source of bugs.",
                                "If you are expecting the function to accept certain arguments, you should explicitly define the function shape.",
                                "Use '(...args: unknown[]) => unknown' for generic handlers or define specific function signatures.",
                            ].join("\n"),
                        },
                    },
                },
            ],
            "@typescript-eslint/no-shadow": "warn",
            "@typescript-eslint/no-this-alias": "warn",
            "@typescript-eslint/no-unnecessary-boolean-literal-compare": "warn",
            // Null safety for backend operations
            "@typescript-eslint/no-unnecessary-condition": [
                "warn",
                {
                    allowConstantLoopConditions: true, // Allow while(true) patterns in services
                },
            ],
            "@typescript-eslint/no-unnecessary-parameter-property-assignment":
                "warn",
            "@typescript-eslint/no-unnecessary-qualifier": "warn",
            "@typescript-eslint/no-unnecessary-template-expression": "warn",
            "@typescript-eslint/no-unnecessary-type-arguments": "warn",
            // Enhanced type safety for backend services
            "@typescript-eslint/no-unnecessary-type-assertion": "error", // Remove redundant type assertions
            "@typescript-eslint/no-unnecessary-type-constraint": "warn",
            "@typescript-eslint/no-unnecessary-type-conversion": "warn",
            "@typescript-eslint/no-unnecessary-type-parameters": "warn",
            "@typescript-eslint/no-unsafe-argument": "warn", // Warn on passing any to typed parameters
            "@typescript-eslint/no-unsafe-assignment": "warn", // Warn on unsafe assignments to any
            "@typescript-eslint/no-unsafe-call": "warn", // Warn on calling any-typed functions
            "@typescript-eslint/no-unsafe-declaration-merging": "warn",
            "@typescript-eslint/no-unsafe-enum-comparison": "warn",
            "@typescript-eslint/no-unsafe-function-type": "error",
            "@typescript-eslint/no-unsafe-member-access": "warn", // Warn on accessing any-typed properties
            "@typescript-eslint/no-unsafe-return": "warn", // Warn on returning any from typed functions
            "@typescript-eslint/no-unsafe-type-assertion": "warn",
            "@typescript-eslint/no-unsafe-unary-minus": "warn",
            "@typescript-eslint/no-unused-expressions": "warn",
            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/no-use-before-define": [
                "warn",
                { functions: false },
            ],
            "@typescript-eslint/no-useless-constructor": "warn",
            "@typescript-eslint/no-useless-empty-export": "warn",
            "@typescript-eslint/no-wrapper-object-types": "error",
            "@typescript-eslint/non-nullable-type-assertion-style": "warn",
            "@typescript-eslint/only-throw-error": "warn",
            "@typescript-eslint/parameter-properties": "warn",
            "@typescript-eslint/prefer-as-const": "warn",
            "@typescript-eslint/prefer-destructuring": "warn",
            "@typescript-eslint/prefer-enum-initializers": "warn",
            "@typescript-eslint/prefer-find": "warn",
            "@typescript-eslint/prefer-for-of": "warn",
            "@typescript-eslint/prefer-function-type": "error",
            "@typescript-eslint/prefer-includes": "warn",
            "@typescript-eslint/prefer-literal-enum-member": "warn",
            "@typescript-eslint/prefer-namespace-keyword": "warn",
            "@typescript-eslint/prefer-nullish-coalescing": [
                "error",
                {
                    ignoreConditionalTests: false, // Check conditionals for nullish coalescing opportunities
                    ignoreMixedLogicalExpressions: false, // Check complex logical expressions
                },
            ],
            "@typescript-eslint/prefer-optional-chain": "error", // Use optional chaining instead of logical AND
            "@typescript-eslint/prefer-promise-reject-errors": "warn",
            // Backend-specific type safety
            "@typescript-eslint/prefer-readonly": "warn", // Prefer readonly for service class properties
            // Keep signal strong on explicitly typed APIs while avoiding noisy
            // churn for inferred callback/test parameters.
            "@typescript-eslint/prefer-readonly-parameter-types": [
                "warn",
                {
                    allow: [
                        {
                            from: "lib",
                            name: ["Readonly"],
                        },
                        {
                            from: "package",
                            name: ["RuleContext", "SourceCode"],
                            package: "@typescript-eslint/utils",
                        },
                        {
                            from: "package",
                            name: [
                                "BinaryExpression",
                                "CallExpression",
                                "Expression",
                                "MemberExpression",
                                "Node",
                                "Program",
                                "Statement",
                                "ThrowStatement",
                                "TSTypeReference",
                                "TSUnionType",
                                "TypeNode",
                            ],
                            package: "@typescript-eslint/types",
                        },
                        {
                            from: "package",
                            name: [
                                "Signature",
                                "Type",
                                "TypeChecker",
                            ],
                            package: "typescript",
                        },
                    ],
                    ignoreInferredTypes: true,
                    treatMethodsAsReadonly: true,
                },
            ],
            "@typescript-eslint/prefer-reduce-type-parameter": "warn",
            "@typescript-eslint/prefer-regexp-exec": "warn",
            "@typescript-eslint/prefer-return-this-type": "warn",
            "@typescript-eslint/prefer-string-starts-ends-with": "warn",
            // Configured: Allows non-async functions that return promises (like utility wrappers around Promise.all)
            // But encourages async for most cases.
            "@typescript-eslint/promise-function-async": [
                "warn",
                {
                    allowAny: true,
                    allowedPromiseNames: ["Promise"],
                    checkArrowFunctions: false,
                },
            ],
            "@typescript-eslint/related-getter-setter-pairs": "warn",
            "@typescript-eslint/require-array-sort-compare": "warn",
            "@typescript-eslint/require-await": "error", // Functions marked async must use await
            "@typescript-eslint/restrict-plus-operands": "warn",
            "@typescript-eslint/restrict-template-expressions": "warn",
            "@typescript-eslint/return-await": ["error", "in-try-catch"], // Proper await handling in try-catch
            "@typescript-eslint/strict-boolean-expressions": "warn",
            "@typescript-eslint/switch-exhaustiveness-check": "error", // Ensure switch statements are exhaustive
            "@typescript-eslint/triple-slash-reference": "warn",
            "@typescript-eslint/unbound-method": "warn",
            "@typescript-eslint/unified-signatures": "warn",
            "@typescript-eslint/use-unknown-in-catch-callback-variable": "warn",
            "canonical/export-specifier-newline": "off",
            "canonical/filename-match-exported": "off",
            "canonical/filename-match-regex": "off", // Taken care of by unicorn rules
            "canonical/filename-no-index": "error",
            "canonical/import-specifier-newline": "off",
            "canonical/no-barrel-import": "error",
            "canonical/no-export-all": "error",
            "canonical/no-import-namespace-destructure": "warn",
            "canonical/no-re-export": "warn",
            "canonical/no-reassign-imports": "error",
            "canonical/no-restricted-imports": "off",
            "canonical/prefer-import-alias": [
                "off",
                {
                    aliases: [
                        {
                            alias: "@plugin/",
                            matchParent: path.resolve(import.meta.dirname),
                            matchPath: "^plugin/",
                            maxRelativeDepth: 0,
                        },
                    ],
                },
            ],
            "canonical/prefer-inline-type-import": "off",
            "canonical/prefer-react-lazy": "off",
            "canonical/prefer-use-mount": "warn",
            "canonical/sort-react-dependencies": "warn",
            "comment-length/limit-multi-line-comments": [
                "warn",
                {
                    ignoreCommentsWithCode: false,
                    ignoreUrls: true,
                    logicalWrap: true,
                    maxLength: 120,
                    mode: "compact-on-overflow",
                    semanticComments: [
                        "@abstract",
                        "@async",
                        "@author",
                        "@callback",
                        "@constructs",
                        "@deprecated",
                        "@emits",
                        "@event",
                        "@example",
                        "@fires",
                        "@generator",
                        "@internal",
                        "@link",
                        "@listens",
                        "@memberof",
                        "@mixes",
                        "@mixin",
                        "@module",
                        "@namespace",
                        "@override",
                        "@packageDocumentation",
                        "@param",
                        "@private",
                        "@protected",
                        "@public",
                        "@readonly",
                        "@remarks",
                        "@returns",
                        "@see",
                        "@since",
                        "@template",
                        "@typeParam",
                        "@typedef",
                        "@version",
                        "@virtual",
                        "@yields",
                        "*`*",
                    ],
                    tabSize: 4,
                },
            ],
            "comment-length/limit-single-line-comments": [
                "warn",
                {
                    ignoreCommentsWithCode: false,
                    ignoreUrls: true,
                    logicalWrap: true,
                    maxLength: 120,
                    mode: "compact-on-overflow",
                    semanticComments: [
                        "@abstract",
                        "@async",
                        "@author",
                        "@callback",
                        "@constructs",
                        "@deprecated",
                        "@emits",
                        "@event",
                        "@example",
                        "@fires",
                        "@generator",
                        "@internal",
                        "@link",
                        "@listens",
                        "@memberof",
                        "@mixes",
                        "@mixin",
                        "@module",
                        "@namespace",
                        "@override",
                        "@packageDocumentation",
                        "@param",
                        "@private",
                        "@protected",
                        "@public",
                        "@readonly",
                        "@remarks",
                        "@returns",
                        "@see",
                        "@since",
                        "@template",
                        "@typeParam",
                        "@typedef",
                        "@version",
                        "@virtual",
                        "@yields",
                        "*`*",
                    ],
                    tabSize: 4,
                },
            ],
            "comment-length/limit-tagged-template-literal-comments": [
                "warn",
                {
                    ignoreCommentsWithCode: false,
                    ignoreUrls: true,
                    logicalWrap: true,
                    maxLength: 120,
                    mode: "compact-on-overflow",
                    semanticComments: [
                        "@abstract",
                        "@async",
                        "@author",
                        "@callback",
                        "@constructs",
                        "@deprecated",
                        "@emits",
                        "@event",
                        "@example",
                        "@fires",
                        "@generator",
                        "@internal",
                        "@link",
                        "@listens",
                        "@memberof",
                        "@mixes",
                        "@mixin",
                        "@module",
                        "@namespace",
                        "@override",
                        "@packageDocumentation",
                        "@param",
                        "@private",
                        "@protected",
                        "@public",
                        "@readonly",
                        "@remarks",
                        "@returns",
                        "@see",
                        "@since",
                        "@template",
                        "@typeParam",
                        "@typedef",
                        "@version",
                        "@virtual",
                        "@yields",
                        "*`*",
                    ],
                    tabSize: 4,
                },
            ],
            // Needs update for Eslint v10
            // "deprecation/deprecation": "off",
            "eslint-plugin/consistent-output": "error",
            "eslint-plugin/fixer-return": "error",
            "eslint-plugin/meta-property-ordering": [
                "error",
                [
                    "defaultOptions",
                    "deprecated",
                    "docs",
                    "fixable",
                    "hasSuggestions",
                    "messages",
                    "replacedBy",
                    "schema",
                    "type",
                ],
            ],
            "eslint-plugin/no-deprecated-context-methods": "error",
            "eslint-plugin/no-deprecated-report-api": "error",
            "eslint-plugin/no-identical-tests": "error",
            "eslint-plugin/no-matching-violation-suggest-message-ids": "error",
            "eslint-plugin/no-meta-replaced-by": "error",
            "eslint-plugin/no-meta-schema-default": "error",
            "eslint-plugin/no-missing-message-ids": "error",
            "eslint-plugin/no-missing-placeholders": "error",
            "eslint-plugin/no-only-tests": "error",
            "eslint-plugin/no-property-in-node": "error",
            "eslint-plugin/no-unused-message-ids": "error",
            "eslint-plugin/no-unused-placeholders": "error",
            "eslint-plugin/no-useless-token-range": "error",
            "eslint-plugin/prefer-message-ids": "error",
            "eslint-plugin/prefer-object-rule": "error",
            "eslint-plugin/prefer-output-null": "error",
            "eslint-plugin/prefer-placeholders": "warn",
            "eslint-plugin/prefer-replace-text": "error",
            "eslint-plugin/report-message-format": "warn",
            "eslint-plugin/require-meta-default-options": "error",
            "eslint-plugin/require-meta-docs-description": "warn",
            "eslint-plugin/require-meta-docs-recommended": "warn",
            "eslint-plugin/require-meta-docs-url": "error",
            "eslint-plugin/require-meta-fixable": "error",
            "eslint-plugin/require-meta-has-suggestions": "error",
            "eslint-plugin/require-meta-schema": "error",
            "eslint-plugin/require-meta-schema-description": "error",
            "eslint-plugin/require-meta-type": "error",
            "eslint-plugin/require-test-case-name": "warn",
            "eslint-plugin/test-case-property-ordering": "warn",
            "eslint-plugin/test-case-shorthand-strings": "error",
            "eslint-plugin/unique-test-case-names": "error",
            "import-x/consistent-type-specifier-style": "off",
            "import-x/default": "warn",
            "import-x/dynamic-import-chunkname": "off",
            "import-x/export": "warn",
            "import-x/exports-last": "off",
            "import-x/extensions": "warn",
            "import-x/first": "warn",
            "import-x/group-exports": "off",
            "import-x/max-dependencies": "off",
            "import-x/named": "warn",
            "import-x/namespace": "warn",
            "import-x/newline-after-import": "warn",
            "import-x/no-absolute-path": "warn",
            "import-x/no-amd": "warn",
            "import-x/no-anonymous-default-export": "warn",
            "import-x/no-commonjs": "warn",
            "import-x/no-cycle": "warn",
            "import-x/no-default-export": "off",
            "import-x/no-deprecated": "warn",
            "import-x/no-duplicates": "warn",
            "import-x/no-dynamic-require": "warn",
            "import-x/no-empty-named-blocks": "warn",
            "import-x/no-extraneous-dependencies": "warn",
            "import-x/no-import-module-exports": "warn",
            "import-x/no-internal-modules": "off",
            "import-x/no-mutable-exports": "warn",
            "import-x/no-named-as-default": "off",
            "import-x/no-named-as-default-member": "off",
            "import-x/no-named-default": "warn",
            "import-x/no-named-export": "off",
            "import-x/no-namespace": "off",
            "import-x/no-nodejs-modules": "off",
            "import-x/no-relative-packages": "warn",
            "import-x/no-relative-parent-imports": "off",
            "import-x/no-rename-default": "warn",
            "import-x/no-restricted-paths": "warn",
            "import-x/no-self-import": "warn",
            "import-x/no-unassigned-import": [
                "error",
                {
                    allow: ["**/*.css", "**/*.scss"], // Allow CSS imports without assignment
                },
            ],
            "import-x/no-unresolved": "off",
            "import-x/no-unused-modules": [
                "warn",
                {
                    missingExports: true,
                    suppressMissingFileEnumeratorAPIWarning: true,
                },
            ],
            "import-x/no-useless-path-segments": "warn",
            "import-x/no-webpack-loader-syntax": "warn",
            "import-x/order": "off",
            "import-x/prefer-default-export": "off",
            "import-x/prefer-namespace-import": "off",
            // NOTE(ESLint10): Re-enable once import-x/unambiguous is
            // compatible with ESLint 10 parser context assumptions.
            "import-x/unambiguous": "off",
            "jsdoc/require-description": "warn",
            "jsdoc/require-param-description": "warn",
            "jsdoc/require-returns-description": "warn",
            "math/abs": "warn",
            "math/prefer-exponentiation-operator": "warn",
            "math/prefer-math-sum-precise": "warn",
            "module-interop/no-import-cjs": "warn",
            "module-interop/no-require-esm": "warn",
            "n/file-extension-in-import": "off",
            "n/no-missing-file-extension": "off",
            "n/no-missing-import": "off",
            // NOTE(ESLint10): Re-enable once eslint-plugin-no-lookahead-lookbehind-regexp supports
            // ESLint 10 without legacy context helpers.
            "no-lookahead-lookbehind-regexp/no-lookahead-lookbehind-regexp":
                "off",
            "no-unused-private-class-members": "warn",
            "perfectionist/sort-arrays": [
                "off",
                {
                    customGroups: [],
                    fallbackSort: { type: "unsorted" },
                    groups: ["literal"],
                    ignoreCase: true,
                    newlinesBetween: "ignore",
                    newlinesInside: "ignore",
                    order: "asc",
                    partitionByNewLine: false,
                    specialCharacters: "keep",
                    type: "natural",
                    useConfigurationIf: {
                        matchesAstSelector: "TSAsExpression > ArrayExpression",
                    },
                },
            ],
            "promise/no-multiple-resolved": "warn",
            "promise/prefer-await-to-callbacks": "off",
            "promise/prefer-await-to-then": "warn",
            "promise/prefer-catch": "warn",
            "promise/spec-only": "warn",
            "sdl/no-nonnull-assertion-on-security-input": "error",
            "sdl/no-trusted-types-policy-pass-through": "error",
            "sdl/no-unsafe-cast-to-trusted-types": "error",
            "security/detect-non-literal-fs-filename": "off",
            "security/detect-object-injection": "off",
            "unused-imports/no-unused-imports": "error",
            "unused-imports/no-unused-vars": "error",
        },
    },
    {
        files: [
            "commitlint.config.mjs",
            "eslint.config.mjs",
            "plugin.mjs",
            "src/**/*.{js,mjs,cjs,ts,mts,cts,tsx}",
            "vite.config.ts",
        ],
        name: "ESLint Plugin Source - internal rule authoring overrides",
        rules: {
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/consistent-type-definitions": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-misused-spread": "off",
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-enum-comparison": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unsafe-type-assertion": "off",
            "@typescript-eslint/prefer-destructuring": "off",
            "@typescript-eslint/prefer-nullish-coalescing": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            camelcase: "off",
            canonical: "off",
            "canonical/destructuring-property-newline": "off",
            "canonical/id-match": "off",
            "capitalized-comments": [
                "error",
                "always",
                {
                    ignoreConsecutiveComments: true,
                    ignoreInlineComments: true,
                    ignorePattern:
                        "pragma|ignored|import|prettier|eslint|tslint|copyright|license|eslint-disable|@ts-.*|jsx-a11y.*|@eslint.*|global|jsx|jsdoc|prettier|istanbul|jcoreio|metamask|microsoft|no-unsafe-optional-chaining|no-unnecessary-type-assertion|no-non-null-asserted-optional-chain|no-non-null-asserted-nullish-coalescing|@typescript-eslint.*|@docusaurus.*|@react.*|boundaries.*|depend.*|deprecation.*|etc.*|ex.*|functional.*|import-x.*|import-zod.*|jsx-a11y.*|loadable-imports.*|math.*|n.*|neverthrow.*|no-constructor-bind.*|no-explicit-type-exports.*|no-function-declare-after-return.*|no-lookahead-lookbehind-regexp.*|no-secrets.*|no-unary-plus.*|no-unawaited-dot-catch-throw.*|no-unsanitized.*|no-use-extend-native.*|observers.*|prefer-arrow.*|perfectionist.*|prettier.*|promise.*|react.*|react-hooks.*|react-hooks-addons.*|redos.*|regexp.*|require-jsdoc.*|safe-jsx.*|security.*|sonarjs.*|sort-class-members.*|sort-destructure-keys.*|sort-keys-fix.*|sql-template.*|ssr-friendly.*|styled-components-a11y.*|switch-case.*|total-functions.*|tsdoc.*|unicorn.*|unused-imports.*|usememo-recommendations.*|validate-jsx-nesting.*|write-good-comments.*|xss.*|v8.*|c8.*|istanbul.*|nyc.*|codecov.*|coveralls.*|c8-coverage.*|codecov-coverage.*",
                },
            ],
            "class-methods-use-this": "off",
            complexity: "off",
            "consistent-return": "off",
            "dot-notation": "off",
            "func-style": "off",
            "id-length": "off",
            "import-x/extensions": "off",
            "import-x/no-commonjs": "off",
            "import-x/no-rename-default": "off",
            "init-declarations": "off",
            "jsdoc/require-description": "off",
            "jsdoc/require-param-description": "off",
            "jsdoc/require-returns-description": "off",
            "max-classes-per-file": "off",
            "max-lines": "off",
            "max-lines-per-function": "off",
            "max-params": "off",
            "max-statements": "off",
            "module-interop/no-import-cjs": "off",
            "n/no-extraneous-import": "off",
            "n/no-mixed-requires": "off",
            "n/no-sync": "off",
            "n/no-unsupported-features/node-builtins": "off",
            "new-cap": "off",
            "no-console": "off",
            "no-continue": "off",
            "no-inline-comments": "off",
            "no-magic-numbers": "off",
            "no-plusplus": "off",
            "no-ternary": "off",
            "no-undef-init": "off",
            "no-undefined": "off",
            "no-underscore-dangle": "off",
            "no-use-before-define": "off",
            "no-void": "off",
            "object-shorthand": "off",
            "one-var": "off",
            "prefer-arrow-callback": [
                "warn",
                { allowNamedFunctions: true, allowUnboundThis: true },
            ],
            "prefer-destructuring": "off",
            "regexp/require-unicode-regexp": "off",
            "regexp/require-unicode-sets-regexp": "off",
            "require-await": "off",
            "require-unicode-regexp": "off",
            "security/detect-non-literal-fs-filename": "off",
            "security/detect-object-injection": "off",
            "sonarjs/cognitive-complexity": "off",
            "sonarjs/different-types-comparison": "off",
            "sonarjs/no-commented-code": "off",
            "sonarjs/no-nested-conditional": "off",
            "sort-imports": "off",
            "sort-keys": "off",
            "sort-vars": "off",
            "unicorn/consistent-destructuring": "off",
            "unicorn/consistent-function-scoping": "off",
            "unicorn/import-style": "off",
            "unicorn/no-nested-ternary": "off",
            "unicorn/no-null": "off",
            "unicorn/prefer-import-meta-properties": "off",
            "unicorn/prevent-abbreviations": "off",
        },
    },
    // #endregion
    // #region 🧪 Internal Tooling
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: 🧪 Internal Tooling
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: ["tests/**/*.{test,spec}.{ts,tsx}", "tests/**/*.{ts,tsx}"],
        name: "ESLint Plugin Tests - internal tooling",
        rules: {
            "@typescript-eslint/array-type": "off",
            "@typescript-eslint/no-floating-promises": "off",
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            canonical: "off",
            "canonical/id-match": "off",
            eqeqeq: "off",
            "filenames/no-relative-paths": "off",
            "func-style": "off",
            "max-statements": "off",
            "n/no-missing-import": "off",
            "n/no-sync": "off",
            "n/no-unpublished-import": "off",
            "no-magic-numbers": "off",
            "no-ternary": "off",
            "no-undefined": "off",
            "no-underscore-dangle": "off",
            "no-use-before-define": "off",
            "one-var": "off",
            "sort-imports": "off",
            "unicorn/import-style": "off",
            "unicorn/no-array-callback-reference": "off",
            "unicorn/no-null": "off",
            "unicorn/prefer-at": "off",
            "unicorn/prefer-spread": "off",
            "unicorn/prevent-abbreviations": "off",
        },
    },
    {
        files: ["tests/_internal/ruleTester.ts"],
        name: "ESLint Plugin Tests - internal helper filename",
        rules: {
            "unicorn/filename-case": "off",
        },
    },
    // #endregion
    // #region 🧪 Tests
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: 🧪 Tests
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: [
            "tests/**/*.{ts,tsx,mts,cts,mjs,js,jsx,cjs}",
            "benchmarks/**/*.{ts,tsx,mts,cts,mjs,js,jsx,cjs}",
        ],
        languageOptions: {
            globals: {
                ...globals.node,
                ...vitest.environments.env.globals,
                afterAll: "readonly",
                afterEach: "readonly",
                beforeAll: "readonly",
                beforeEach: "readonly",
                createTypedRuleSelectorAwarePassThrough: "readonly",
                describe: "readonly",
                expect: "readonly",
                it: "readonly",
                NodeJS: "readonly",
                test: "readonly",
                vi: "readonly",
            },
            parser: tseslintParser,
            parserOptions: {
                ecmaFeatures: {
                    impliedStrict: true,
                },
                ecmaVersion: "latest",
                jsDocParsingMode: "all",
                project: "./tsconfig.eslint.json",
                sourceType: "module",
                tsconfigRootDir: path.resolve(import.meta.dirname),
                warnOnUnsupportedTypeScriptVersion: true,
            },
        },
        name: "Tests tests/**/*.{spec,test}.*.{TS,TSX,MTS,CTS,MJS,JS,JSX,CJS}",
        plugins: {
            "@typescript-eslint": tseslint,
            "import-x": importX,
            n: nodePlugin,
            "no-only-tests": pluginNoOnly,
            "testing-library": pluginTestingLibrary,
            unicorn: eslintPluginUnicorn,
            "unused-imports": pluginUnusedImports,
            vitest: vitest,
        },
        rules: {
            ...js.configs.all.rules,
            ...tseslint.configs.recommendedTypeChecked,
            ...tseslint.configs.recommended?.rules,
            ...tseslint.configs.strictTypeChecked,
            ...tseslint.configs.strict?.rules,
            ...tseslint.configs.stylisticTypeChecked,
            ...tseslint.configs.stylistic?.rules,
            ...vitest.configs.all.rules,
            ...eslintPluginUnicorn.configs.all.rules,
            ...pluginTestingLibrary.configs["flat/react"].rules,
            "@jcoreio/implicit-dependencies/no-implicit": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-empty-function": "off", // Empty mocks/stubs are common
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-inferrable-types": "warn", // Allow explicit types for React components
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-restricted-types": "off", // Tests may need generic Function types
            "@typescript-eslint/no-shadow": "off",
            "@typescript-eslint/no-unsafe-function-type": "off", // Tests may use generic handlers
            "@typescript-eslint/no-unsafe-type-assertion": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-use-before-define": "off", // Allow use before define in tests
            "@typescript-eslint/no-useless-default-assignment": "warn",
            "@typescript-eslint/prefer-destructuring": "off",
            "@typescript-eslint/strict-void-return": "warn",
            "@typescript-eslint/unbound-method": "off",
            camelcase: "off",
            "capitalized-comments": [
                "error",
                "always",
                {
                    ignoreConsecutiveComments: true,
                    ignoreInlineComments: true,
                    ignorePattern:
                        "pragma|ignored|import|prettier|eslint|tslint|copyright|license|eslint-disable|@ts-.*|jsx-a11y.*|@eslint.*|global|jsx|jsdoc|prettier|istanbul|jcoreio|metamask|microsoft|no-unsafe-optional-chaining|no-unnecessary-type-assertion|no-non-null-asserted-optional-chain|no-non-null-asserted-nullish-coalescing|@typescript-eslint.*|@docusaurus.*|@react.*|boundaries.*|depend.*|deprecation.*|etc.*|ex.*|functional.*|import-x.*|import-zod.*|jsx-a11y.*|loadable-imports.*|math.*|n.*|neverthrow.*|no-constructor-bind.*|no-explicit-type-exports.*|no-function-declare-after-return.*|no-lookahead-lookbehind-regexp.*|no-secrets.*|no-unary-plus.*|no-unawaited-dot-catch-throw.*|no-unsanitized.*|no-use-extend-native.*|observers.*|prefer-arrow.*|perfectionist.*|prettier.*|promise.*|react.*|react-hooks.*|react-hooks-addons.*|redos.*|regexp.*|require-jsdoc.*|safe-jsx.*|security.*|sonarjs.*|sort-class-members.*|sort-destructure-keys.*|sort-keys-fix.*|sql-template.*|ssr-friendly.*|styled-components-a11y.*|switch-case.*|total-functions.*|tsdoc.*|unicorn.*|unused-imports.*|usememo-recommendations.*|validate-jsx-nesting.*|write-good-comments.*|xss.*|v8.*|c8.*|istanbul.*|nyc.*|codecov.*|coveralls.*|c8-coverage.*|codecov-coverage.*",
                },
            ],
            "class-methods-use-this": "off",
            complexity: "off",
            "default-case": "off",
            "dot-notation": "off",
            eqeqeq: "off", // Allow == and != in tests for flexibility
            "func-name-matching": "off", // Allow function names to not match variable names
            "func-names": "off",
            // Relaxed function rules for backend tests (explicit for clarity)
            "func-style": "off",
            "id-length": "off",
            "init-declarations": "off",
            "max-classes-per-file": "off",
            "max-depth": "off",
            "max-lines": "off",
            "max-lines-per-function": [
                "error",
                {
                    IIFEs: false,
                    max: 2000,
                    skipBlankLines: true,
                    skipComments: true,
                },
            ],
            "max-params": "off",
            "max-statements": "off",
            "module-interop/no-import-cjs": "off",
            "new-cap": "off", // Allow new-cap for class constructors
            "no-await-in-loop": "off", // Allow await in loops for sequential operations
            "no-barrel-files/no-barrel-files": "off", // Allow barrel files in tests for convenience
            "no-console": "off",
            "no-duplicate-imports": "off", // Allow duplicate imports for test setups
            "no-inline-comments": "off",
            "no-loop-func": "off", // Allow functions in loops for test setups
            "no-magic-numbers": "off",
            "no-new": "off", // Allow new for class constructors
            // No Only Tests
            "no-only-tests/no-only-tests": "error",
            "no-plusplus": "off",
            "no-promise-executor-return": "off", // Allow returning values from promise executors
            "no-redeclare": "off", // Allow redeclaring variables in tests
            "no-shadow": "off",
            "no-ternary": "off",
            "no-throw-literal": "off",
            "no-undef-init": "off",
            "no-undefined": "off",
            "no-underscore-dangle": "off",
            "no-use-before-define": "off", // Allow use before define in tests
            "no-useless-assignment": "off",
            "no-void": "off",
            "object-shorthand": "off",
            "one-var": "off",
            "prefer-arrow-callback": [
                "warn",
                { allowNamedFunctions: true, allowUnboundThis: true },
            ],
            "prefer-destructuring": "off",
            "require-await": "off",
            "require-unicode-regexp": "off",
            "sort-imports": "off",
            "sort-keys": "off",
            "testing-library/await-async-queries": "error",
            "testing-library/consistent-data-testid": [
                "warn",
                {
                    testIdAttribute: ["data-testid"],
                    testIdPattern:
                        "^[a-z]+([A-Z][a-z]+)*(-[a-z]+([A-Z][a-z]+)*)*$", // Kebab-case or camelCase
                },
            ],
            "testing-library/no-await-sync-queries": "error",
            "testing-library/no-debugging-utils": "off",
            "testing-library/no-node-access": "off",
            "testing-library/no-test-id-queries": "warn",
            "testing-library/prefer-explicit-assert": "warn",
            "testing-library/prefer-implicit-assert": "warn",
            "testing-library/prefer-query-matchers": "warn",
            "testing-library/prefer-screen-queries": "warn",
            "testing-library/prefer-user-event": "warn",
            "testing-library/prefer-user-event-setup": "warn",
            "unicorn/consistent-function-scoping": "off", // Tests often use different scoping
            "unicorn/filename-case": "off", // Allow test files to have any case
            "unicorn/import-style": [
                "error",
                {
                    styles: {
                        fs: { default: false, named: true, namespace: true },
                        // ─────────────────────────────────────────────────────────────
                        // crypto: disallow default imports, allow named + namespace
                        // (named is most common; namespace is sometimes handy)
                        // ─────────────────────────────────────────────────────────────
                        "node:crypto": {
                            default: false,
                            named: true,
                            namespace: true,
                        },
                        // ─────────────────────────────────────────────────────────────
                        // Filesystem: disallow default imports, but allow named + namespace
                        // (named is ergonomic; namespace is useful for vi.spyOn(fs, "..."))
                        // ─────────────────────────────────────────────────────────────
                        "node:fs": {
                            default: false,
                            named: true,
                            namespace: true,
                        },
                        "node:fs/promises": {
                            default: false,
                            named: true,
                            namespace: true,
                        },
                        // ─────────────────────────────────────────────────────────────
                        // Node “path-like” modules: allow ONLY namespace imports
                        // (prevents `import path from "node:path"` which relies on default interop)
                        // ─────────────────────────────────────────────────────────────
                        "node:path": { default: false, namespace: true },
                        "node:path/posix": { default: false, namespace: true },
                        "node:path/win32": { default: false, namespace: true },
                        // ─────────────────────────────────────────────────────────────
                        // timers/promises: named is the common usage
                        // ─────────────────────────────────────────────────────────────
                        "node:timers/promises": { named: true },
                        // ─────────────────────────────────────────────────────────────
                        // util: keep unicorn’s intent (named only)
                        // ─────────────────────────────────────────────────────────────
                        "node:util": { named: true },
                        path: { default: false, namespace: true }, // Just in case any non-node: path remains
                        util: { named: true },
                    },
                },
            ],
            "unicorn/no-await-expression-member": "off", // Allow await in test expressions
            "unicorn/no-keyword-prefix": [
                "error",
                {
                    checkProperties: false,
                    disallowedPrefixes: [
                        "interface",
                        "type",
                        "enum",
                    ],
                },
            ], // Allow "class" prefix for className and other legitimate uses
            "unicorn/no-null": "off", // Null is common in test setups
            "unicorn/no-unused-properties": "off", // Allow unused properties in test setups
            "unicorn/no-useless-undefined": "off", // Allow undefined in test setups
            "unicorn/prefer-global-this": "off", // Allow globalThis for test setups
            "unicorn/prefer-optional-catch-binding": "off", // Allow optional catch binding for test flexibility
            "unicorn/prevent-abbreviations": "off", // Too many false positives in tests
            "vitest/max-expects": "off",
            // Needs update to not use deprecated alias methods like
            // Replace toThrow() with its canonical name oThrowError()
            "vitest/no-alias-methods": "off",
            "vitest/no-commented-out-tests": "warn",
            "vitest/no-conditional-expect": "warn",
            "vitest/no-disabled-tests": "warn",
            "vitest/no-focused-tests": "warn",
            "vitest/no-identical-title": "warn",
            "vitest/no-import-node-test": "warn",
            "vitest/no-interpolation-in-snapshots": "warn",
            "vitest/no-standalone-expect": "warn",
            "vitest/no-test-prefixes": "warn",
            "vitest/prefer-called-exactly-once-with": "warn",
            "vitest/prefer-called-once": "warn",
            // Conflicts with `prefer-called-once` for `.toHaveBeenCalledTimes(1)`.
            // Keep the more specific once-only rule enabled.
            "vitest/prefer-called-times": "off",
            "vitest/prefer-called-with": "warn",
            "vitest/prefer-comparison-matcher": "warn",
            "vitest/prefer-describe-function-title": "warn",
            "vitest/prefer-expect-assertions": "warn",
            "vitest/prefer-expect-resolves": "warn",
            // Vitest's autofix currently rewrites to `expectTypeOf(...).toBeFunction()`
            // which does not typecheck with the current expect-type typings.
            "vitest/prefer-expect-type-of": "off",
            "vitest/prefer-mock-return-shorthand": "warn",
            "vitest/prefer-spy-on": "warn",
            "vitest/prefer-strict-boolean-matchers": "off",
            "vitest/prefer-strict-equal": "warn",
            "vitest/prefer-to-be": "warn",
            "vitest/prefer-to-be-falsy": "warn",
            "vitest/prefer-to-be-object": "warn",
            "vitest/prefer-to-be-truthy": "warn",
            "vitest/prefer-to-contain": "warn",
            "vitest/prefer-to-have-length": "warn",
            "vitest/prefer-todo": "warn",
            "vitest/prefer-vi-mocked": "warn",
            "vitest/require-hook": "off",
            "vitest/require-mock-type-parameters": "warn",
            "vitest/require-test-timeout": "off",
            "vitest/valid-expect": "warn",
            "vitest/valid-title": "warn",
            "vitest/warn-todo": "warn",
        },
        settings: {
            "import-x/resolver": {
                node: true,
                project: ["./tsconfig.eslint.json"],
                // You will also need to install and configure the TypeScript resolver
                // See also https://github.com/import-js/eslint-import-resolver-typescript#configuration
                typescript: true,
            },
            "import/resolver": {
                // You will also need to install and configure the TypeScript resolver
                // See also https://github.com/import-js/eslint-import-resolver-typescript#configuration
                typescript: {
                    alwaysTryTypes: true, // Always try to resolve types under `<root>@types` directory even if it doesn't contain any source code, like `@types/unist`
                    project: ["./tsconfig.eslint.json"],
                },
            },
            n: {
                allowModules: [
                    "electron",
                    "node",
                    "electron-devtools-installer",
                ],
            },
            vitest: {
                typecheck: true,
            },
        },
    },
    // #endregion
    // #region 📦 Package.json Linting
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: Package.json Linting
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: ["**/package.json"],
        languageOptions: {
            parser: jsoncEslintParser,
            parserOptions: { jsonSyntax: "JSON" },
        },
        name: "Package - **/Package.json",
        plugins: {
            json: json,
            "node-dependencies": nodeDependencies,
            "package-json": packageJson,
        },
        rules: {
            ...json.configs.recommended.rules,
            // NOTE: Keeping node-dependencies scoped to package.json avoids perf + parser issues.
            "node-dependencies/absolute-version": [
                "error",
                "never", // Or always
            ],
            // Can be noisy depending on how transitive deps declare engines.
            "node-dependencies/compat-engines": "off",
            "node-dependencies/no-deprecated": [
                "error",
                {
                    allows: ["prettier-plugin-packagejson"],
                    devDependencies: true,
                },
            ],
            "node-dependencies/no-dupe-deps": "error",
            "node-dependencies/no-restricted-deps": "off",
            "node-dependencies/prefer-caret-range-version": "error",
            "node-dependencies/prefer-tilde-range-version": "off",
            // This rule is currently not viable for most ecosystems (many packages
            // do not publish provenance metadata consistently).
            "node-dependencies/require-provenance-deps": "off",
            "node-dependencies/valid-semver": "error",
            // Package.json Plugin Rules (package-json/*)
            "package-json/bin-name-casing": "warn",
            "package-json/exports-subpaths-style": "warn",
            "package-json/no-empty-fields": "warn",
            "package-json/no-redundant-files": "warn",
            "package-json/no-redundant-publishConfig": "warn",
            "package-json/order-properties": "warn",
            "package-json/repository-shorthand": "warn",
            "package-json/require-attribution": "warn",
            "package-json/require-author": "warn",
            // Not a CLI package.
            "package-json/require-bin": "off",
            "package-json/require-bugs": "warn",
            "package-json/require-bundleDependencies": "off",
            // Optional metadata for this repository.
            "package-json/require-contributors": "warn",
            "package-json/require-cpu": "off",
            "package-json/require-dependencies": "warn",
            "package-json/require-description": "warn",
            "package-json/require-devDependencies": "warn",
            // Optional and currently uncommon metadata field.
            "package-json/require-devEngines": "warn",
            // Legacy npm field, not needed for this plugin package.
            "package-json/require-directories": "off",
            "package-json/require-engines": "warn",
            "package-json/require-exports": [
                "error",
                {
                    ignorePrivate: true,
                },
            ],
            "package-json/require-files": "warn",
            // Optional for this project.
            "package-json/require-funding": "off",
            "package-json/require-homepage": "warn",
            "package-json/require-keywords": "warn",
            "package-json/require-license": "warn",
            "package-json/require-main": "warn",
            // Not a manpage-distributed package.
            "package-json/require-man": "off",
            "package-json/require-module": "off",
            "package-json/require-name": "warn",
            "package-json/require-optionalDependencies": "off",
            "package-json/require-os": "off",
            "package-json/require-packageManager": "warn",
            "package-json/require-peerDependencies": "warn",
            "package-json/require-private": "warn",
            "package-json/require-publishConfig": "warn",
            "package-json/require-repository": "error",
            "package-json/require-scripts": "warn",
            "package-json/require-sideEffects": "warn",
            "package-json/require-type": [
                "error",
                {
                    ignorePrivate: true,
                },
            ],
            "package-json/require-types": [
                "error",
                {
                    ignorePrivate: true,
                },
            ],
            "package-json/require-version": "warn",
            "package-json/restrict-dependency-ranges": "warn",
            "package-json/restrict-private-properties": "warn",
            // This repo intentionally uses stable camelCase script names.
            "package-json/scripts-name-casing": "warn",
            "package-json/sort-collections": [
                "warn",
                [
                    "config",
                    "dependencies",
                    "devDependencies",
                    "exports",
                    "optionalDependencies",
                    // "overrides",
                    "peerDependencies",
                    "peerDependenciesMeta",
                    "scripts",
                ],
            ],
            "package-json/specify-peers-locally": "warn",
            "package-json/unique-dependencies": "warn",
            "package-json/valid-author": "warn",
            "package-json/valid-bin": "warn",
            "package-json/valid-bugs": "warn",
            "package-json/valid-bundleDependencies": "warn",
            "package-json/valid-config": "warn",
            "package-json/valid-contributors": "warn",
            "package-json/valid-cpu": "warn",
            "package-json/valid-dependencies": "warn",
            "package-json/valid-description": "warn",
            "package-json/valid-devDependencies": "warn",
            "package-json/valid-devEngines": "warn",
            "package-json/valid-directories": "warn",
            "package-json/valid-engines": "warn",
            "package-json/valid-exports": "warn",
            "package-json/valid-files": "warn",
            "package-json/valid-funding": "warn",
            "package-json/valid-homepage": "warn",
            "package-json/valid-keywords": "warn",
            "package-json/valid-license": "warn",
            "package-json/valid-main": "warn",
            "package-json/valid-man": "warn",
            "package-json/valid-module": "warn",
            "package-json/valid-name": "warn",
            "package-json/valid-optionalDependencies": "warn",
            "package-json/valid-os": "warn",
            // Deprecated upstream rule; retained as explicit off until removed.
            "package-json/valid-package-definition": "off",
            "package-json/valid-packageManager": "warn",
            "package-json/valid-peerDependencies": "warn",
            "package-json/valid-private": "warn",
            "package-json/valid-publishConfig": "warn",
            "package-json/valid-repository": "warn",
            "package-json/valid-repository-directory": "warn",
            "package-json/valid-scripts": "warn",
            "package-json/valid-sideEffects": "warn",
            "package-json/valid-type": "warn",
            "package-json/valid-version": "warn",
            "package-json/valid-workspaces": "warn",
        },
    },
    {
        files: ["docs/docusaurus/package.json"],
        name: "Package - docs docusaurus private override",
        rules: {
            "package-json/restrict-private-properties": "off",
        },
    },
    // #endregion
    // #region 📝 Markdown files (with Remark linting)
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: Markdown (md/*, markdown/*, markup/*, atom/*, rss/*)
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: ["**/*.{md,markup,atom,rss,markdown}"],
        ignores: [
            "**/docs/packages/**",
            "**/docs/TSDoc/**",
            "**/.github/agents/**",
        ],
        language: "markdown/gfm",
        name: "MD - **/*.{MD,MARKUP,ATOM,RSS,MARKDOWN} (with Remark)",
        plugins: {
            markdown: markdown,
        },
        rules: {
            "markdown/fenced-code-language": "warn",
            "markdown/fenced-code-meta": ["warn", "never"],
            "markdown/heading-increment": "warn",
            "markdown/no-bare-urls": "warn",
            "markdown/no-duplicate-definitions": "warn",
            "markdown/no-duplicate-headings": "warn",
            "markdown/no-empty-definitions": "warn",
            "markdown/no-empty-images": "warn",
            "markdown/no-empty-links": "warn",
            "markdown/no-html": "off",
            "markdown/no-invalid-label-refs": "warn",
            "markdown/no-missing-atx-heading-space": "warn",
            "markdown/no-missing-label-refs": "warn",
            "markdown/no-missing-link-fragments": "warn",
            "markdown/no-multiple-h1": "warn",
            "markdown/no-reference-like-urls": "warn",
            "markdown/no-reversed-media-syntax": "warn",
            "markdown/no-space-in-emphasis": "warn",
            "markdown/no-unused-definitions": "warn",
            "markdown/require-alt-text": "warn",
            "markdown/table-column-count": "warn",
        },
    },
    // #endregion
    // #region 🧾 YAML/YML files
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: YAML/YML files
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: ["**/*.{yaml,yml}"],
        ignores: [],
        language: "yml/yaml",
        languageOptions: {
            parser: yamlEslintParser,
            // Options used with yaml-eslint-parser.
            parserOptions: {
                defaultYAMLVersion: "1.2",
            },
        },
        name: "YAML/YML - **/*.{YAML,YML}",
        plugins: {
            ...jsonSchemaValidatorPlugins,
            yml: eslintPluginYml,
        },
        rules: {
            ...jsonSchemaValidatorRules,
            "yml/block-mapping": "warn",
            "yml/block-mapping-colon-indicator-newline": "error",
            "yml/block-mapping-question-indicator-newline": "error",
            "yml/block-sequence": "warn",
            "yml/block-sequence-hyphen-indicator-newline": "error",
            "yml/file-extension": "off",
            "yml/flow-mapping-curly-newline": "error",
            "yml/flow-mapping-curly-spacing": "error",
            "yml/flow-sequence-bracket-newline": "error",
            "yml/flow-sequence-bracket-spacing": "error",
            "yml/indent": "off",
            "yml/key-name-casing": "off",
            "yml/key-spacing": "error",
            "yml/no-empty-document": "error",
            "yml/no-empty-key": "error",
            "yml/no-empty-mapping-value": "error",
            "yml/no-empty-sequence-entry": "error",
            "yml/no-irregular-whitespace": "error",
            "yml/no-multiple-empty-lines": "error",
            "yml/no-tab-indent": "error",
            "yml/no-trailing-zeros": "error",
            "yml/plain-scalar": "off",
            "yml/quotes": "error",
            "yml/require-string-key": "error",
            // Re-enabled: eslint-plugin-yml v2.0.1 fixes the diff-sequences
            // import crash (TypeError: diff is not a function).
            "yml/sort-keys": "error",
            "yml/sort-sequence-values": "off",
            "yml/spaced-comment": "warn",
            "yml/vue-custom-block/no-parsing-error": "warn",
        },
    },
    // #endregion
    // #region 🌐 HTML files
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: HTML files
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: ["**/*.{html,htm,xhtml}"],
        ignores: ["report/**"],
        languageOptions: {
            parser: htmlParser,
        },
        name: "HTML - **/*.{HTML,HTM,XHTML}",
        plugins: {
            html: html,
        },
        rules: {
            ...html.configs.recommended.rules,
            "html/class-spacing": "warn",
            "html/css-no-empty-blocks": "warn",
            "html/head-order": "warn",
            "html/id-naming-convention": "warn",
            "html/indent": "error",
            "html/lowercase": "warn",
            "html/max-element-depth": "warn",
            "html/no-abstract-roles": "warn",
            "html/no-accesskey-attrs": "warn",
            "html/no-aria-hidden-body": "warn",
            "html/no-aria-hidden-on-focusable": "warn",
            "html/no-duplicate-class": "warn",
            "html/no-empty-headings": "warn",
            "html/no-extra-spacing-attrs": [
                "error",
                { enforceBeforeSelfClose: true },
            ],
            "html/no-extra-spacing-text": "warn",
            "html/no-heading-inside-button": "warn",
            "html/no-ineffective-attrs": "warn",
            // HTML Eslint Plugin Rules (html/*)
            "html/no-inline-styles": "warn",
            "html/no-invalid-attr-value": "warn",
            "html/no-invalid-entity": "warn",
            "html/no-invalid-role": "warn",
            "html/no-multiple-empty-lines": "warn",
            "html/no-nested-interactive": "warn",
            "html/no-non-scalable-viewport": "warn",
            "html/no-positive-tabindex": "warn",
            "html/no-redundant-role": "warn",
            "html/no-restricted-attr-values": "warn",
            "html/no-restricted-attrs": "warn",
            "html/no-restricted-tags": "warn",
            "html/no-script-style-type": "warn",
            "html/no-skip-heading-levels": "warn",
            "html/no-target-blank": "warn",
            "html/no-trailing-spaces": "warn",
            "html/no-whitespace-only-children": "warn",
            "html/prefer-https": "warn",
            "html/require-attrs": "warn",
            "html/require-button-type": "warn",
            "html/require-closing-tags": "off",
            "html/require-content": "warn",
            "html/require-details-summary": "warn",
            "html/require-explicit-size": "warn",
            "html/require-form-method": "warn",
            "html/require-frame-title": "warn",
            "html/require-input-label": "warn",
            "html/require-meta-charset": "warn",
            "html/require-meta-description": "warn",
            "html/require-meta-viewport": "warn",
            "html/require-open-graph-protocol": "warn",
            "html/sort-attrs": "warn",
            "html/svg-require-viewbox": "warn",
        },
    },
    // #endregion
    // #region 🧾 JSONC/JSON files
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: JSONC (jsonc/*)
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: ["**/*.jsonc", ".vscode/*.json"],
        ignores: [],
        name: "JSONC - **/*.JSONC",
        // ═══════════════════════════════════════════════════════════════════════════════
        // Plugin Config for eslint-plugin-jsonc to enable Prettier formatting
        // ═══════════════════════════════════════════════════════════════════════════════
        ...eslintPluginJsonc.configs["flat/prettier"][0],
        language: "json/jsonc",
        languageOptions: {
            parser: jsoncEslintParser,
            parserOptions: { jsonSyntax: "JSON" },
        },
        plugins: {
            json: json,
            jsonc: eslintPluginJsonc,
            ...jsonSchemaValidatorPlugins,
            "no-secrets": noSecrets,
        },
        rules: {
            ...json.configs.recommended.rules,
            "jsonc/array-bracket-newline": "warn",
            "jsonc/array-bracket-spacing": "warn",
            "jsonc/array-element-newline": "off", // Handled by Prettier
            "jsonc/auto": "warn",
            "jsonc/comma-dangle": "warn",
            "jsonc/comma-style": "warn",
            "jsonc/indent": "off", // Handled by Prettier
            "jsonc/key-name-casing": "off",
            "jsonc/key-spacing": "warn",
            "jsonc/no-bigint-literals": "warn",
            "jsonc/no-binary-expression": "warn",
            "jsonc/no-binary-numeric-literals": "warn",
            "jsonc/no-comments": "warn",
            "jsonc/no-dupe-keys": "warn",
            "jsonc/no-escape-sequence-in-identifier": "warn",
            "jsonc/no-floating-decimal": "warn",
            "jsonc/no-hexadecimal-numeric-literals": "warn",
            "jsonc/no-infinity": "warn",
            "jsonc/no-irregular-whitespace": "warn",
            "jsonc/no-multi-str": "warn",
            "jsonc/no-nan": "warn",
            "jsonc/no-number-props": "warn",
            "jsonc/no-numeric-separators": "warn",
            "jsonc/no-octal": "warn",
            "jsonc/no-octal-escape": "warn",
            "jsonc/no-octal-numeric-literals": "warn",
            "jsonc/no-parenthesized": "warn",
            "jsonc/no-plus-sign": "warn",
            "jsonc/no-regexp-literals": "warn",
            "jsonc/no-sparse-arrays": "warn",
            "jsonc/no-template-literals": "warn",
            "jsonc/no-undefined-value": "warn",
            "jsonc/no-unicode-codepoint-escapes": "warn",
            "jsonc/no-useless-escape": "warn",
            "jsonc/object-curly-newline": "warn",
            "jsonc/object-curly-spacing": "warn",
            "jsonc/object-property-newline": "warn",
            "jsonc/quote-props": "warn",
            "jsonc/quotes": "warn",
            "jsonc/sort-array-values": [
                "error",
                {
                    order: { type: "asc" },
                    pathPattern: "^files$", // Hits the files property
                },
                {
                    order: [
                        "eslint",
                        "eslintplugin",
                        "eslint-plugin",
                        {
                            // Fallback order
                            order: { type: "asc" },
                        },
                    ],
                    pathPattern: "^keywords$", // Hits the keywords property
                },
            ],
            "jsonc/sort-keys": [
                "error",
                // For example, a definition for package.json
                {
                    order: [
                        "name",
                        "version",
                        "private",
                        "publishConfig",
                        // ...
                    ],
                    pathPattern: "^$", // Hits the root properties
                },
                {
                    order: { type: "asc" },
                    pathPattern:
                        "^(?:dev|peer|optional|bundled)?[Dd]ependencies$",
                },
                // ...
            ],
            "jsonc/space-unary-ops": "warn",
            "jsonc/valid-json-number": "warn",
            "jsonc/vue-custom-block/no-parsing-error": "warn",
            "no-secrets/no-pattern-match": "off",
            "no-secrets/no-secrets": [
                "error",
                {
                    tolerance: 5,
                },
            ],
        },
    },
    // #endregion
    // #region 🧾 JSON files
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: JSON (json/*)
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: ["**/*.json"],
        // Package.json has a dedicated config block above that uses jsonc-eslint-parser
        // (needed for some package.json-specific tooling rules).
        ignores: ["**/package.json"],
        language: "json/json",
        name: "JSON - **/*.JSON",
        plugins: {
            json: json,
            ...jsonSchemaValidatorPlugins,
            "no-secrets": noSecrets,
        },
        rules: {
            ...json.configs.recommended.rules,
            ...jsonSchemaValidatorRules,
            "json/sort-keys": ["warn"],
            "json/top-level-interop": "warn",
            "no-secrets/no-pattern-match": "off",
            "no-secrets/no-secrets": [
                "error",
                {
                    tolerance: 5,
                },
            ],
        },
    },
    // #endregion
    // #region 🧾 JSON5 files
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: JSON5 (json5/*)
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: ["**/*.json5"],
        language: "json/json5",
        name: "JSON5 - **/*.JSON5",
        plugins: {
            json: json,
            ...jsonSchemaValidatorPlugins,
            "no-secrets": noSecrets,
        },
        rules: {
            ...json.configs.recommended.rules,
            ...jsonSchemaValidatorRules,
            "no-secrets/no-pattern-match": "off",
            "no-secrets/no-secrets": [
                "error",
                {
                    tolerance: 5,
                },
            ],
        },
    },
    // #endregion
    // #region 🧾 TOML files
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: TOML (toml/*)
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: ["**/*.toml"],
        ignores: ["lychee.toml"],
        languageOptions: {
            parser: tomlEslintParser,
            parserOptions: { tomlVersion: "1.0.0" },
        },
        name: "TOML - **/*.TOML",
        plugins: { toml: eslintPluginToml },
        rules: {
            // TOML Eslint Plugin Rules (toml/*)
            "toml/array-bracket-newline": "warn",
            "toml/array-bracket-spacing": "warn",
            "toml/array-element-newline": "warn",
            "toml/comma-style": "warn",
            "toml/indent": "off",
            "toml/inline-table-curly-newline": "warn",
            "toml/inline-table-curly-spacing": "warn",
            "toml/inline-table-key-value-newline": "warn",
            "toml/key-spacing": "off",
            "toml/keys-order": "warn",
            "toml/no-mixed-type-in-array": "warn",
            "toml/no-non-decimal-integer": "warn",
            "toml/no-space-dots": "warn",
            "toml/no-unreadable-number-separator": "warn",
            "toml/padding-line-between-pairs": "warn",
            "toml/padding-line-between-tables": "warn",
            "toml/precision-of-fractional-seconds": "warn",
            "toml/precision-of-integer": "warn",
            "toml/quoted-keys": "warn",
            "toml/spaced-comment": "warn",
            "toml/table-bracket-spacing": "warn",
            "toml/tables-order": "warn",
            "toml/vue-custom-block/no-parsing-error": "warn",
        },
    },
    // #endregion
    // #region 📚 JS JsDoc
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: JS JsDoc
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: ["scripts/**/*.{js,cjs,mjs}"],
        languageOptions: {
            globals: {
                ...globals.node,
                __dirname: "readonly",
                __filename: "readonly",
                module: "readonly",
                process: "readonly",
                require: "readonly",
            },
        },
        name: "JS JSDoc - **/*.{JS,CJS,MJS}",
        plugins: {
            jsdoc: jsdocPlugin,
        },
        rules: {
            // Start from upstream defaults for JS so new recommended rules are
            // picked up automatically when eslint-plugin-jsdoc updates.
            ...jsdocPlugin.configs["flat/recommended"].rules,
            "jsdoc/check-access": "warn", // Recommended
            "jsdoc/check-alignment": "warn", // Recommended
            "jsdoc/check-indentation": "off",
            "jsdoc/check-line-alignment": "off",
            "jsdoc/check-param-names": "warn", // Recommended
            "jsdoc/check-property-names": "warn", // Recommended
            "jsdoc/check-syntax": "warn",
            "jsdoc/check-tag-names": "off", // Recommended
            "jsdoc/check-template-names": "warn",
            "jsdoc/check-types": "warn", // Recommended
            "jsdoc/check-values": "warn", // Recommended
            "jsdoc/convert-to-jsdoc-comments": "warn",
            "jsdoc/empty-tags": "warn", // Recommended
            "jsdoc/escape-inline-tags": "warn", // Recommended for TS configs
            "jsdoc/implements-on-classes": "warn", // Recommended
            "jsdoc/imports-as-dependencies": "warn",
            "jsdoc/informative-docs": "off",
            "jsdoc/lines-before-block": "warn",
            "jsdoc/match-description": "off",
            "jsdoc/match-name": "off",
            "jsdoc/multiline-blocks": "warn", // Recommended
            "jsdoc/no-bad-blocks": "warn",
            "jsdoc/no-blank-block-descriptions": "warn",
            "jsdoc/no-blank-blocks": "off",
            "jsdoc/no-defaults": "warn", // Recommended
            "jsdoc/no-missing-syntax": "off",
            "jsdoc/no-multi-asterisks": "warn", // Recommended
            "jsdoc/no-restricted-syntax": "off",
            "jsdoc/no-types": "off", // Recommended for TS configs
            "jsdoc/no-undefined-types": "off", // Too noisy for tooling scripts
            "jsdoc/prefer-import-tag": "off",
            "jsdoc/reject-any-type": "off",
            "jsdoc/reject-function-type": "off",
            "jsdoc/require-asterisk-prefix": "warn",
            "jsdoc/require-description": "off",
            "jsdoc/require-description-complete-sentence": "off",
            "jsdoc/require-example": "off",
            "jsdoc/require-file-overview": "off",
            "jsdoc/require-hyphen-before-param-description": "warn",
            "jsdoc/require-jsdoc": "warn", // Recommended
            "jsdoc/require-next-description": "warn",
            "jsdoc/require-next-type": "warn", // Recommended
            "jsdoc/require-param": "off", // Too noisy for tooling scripts
            "jsdoc/require-param-description": "off", // Too noisy for tooling scripts
            "jsdoc/require-param-name": "warn", // Recommended
            "jsdoc/require-param-type": "off",
            "jsdoc/require-property": "warn", // Recommended
            "jsdoc/require-property-description": "warn", // Recommended
            "jsdoc/require-property-name": "warn", // Recommended
            "jsdoc/require-property-type": "warn", // Recommended in non-TS configs
            "jsdoc/require-rejects": "off", // Too noisy for tooling scripts
            "jsdoc/require-returns": "off", // Too noisy for tooling scripts
            "jsdoc/require-returns-check": "warn", // Recommended
            "jsdoc/require-returns-description": "off", // Too noisy for tooling scripts
            "jsdoc/require-returns-type": "off",
            "jsdoc/require-tags": "off",
            "jsdoc/require-template": "warn",
            "jsdoc/require-template-description": "warn",
            "jsdoc/require-throws": "off",
            "jsdoc/require-throws-description": "warn",
            "jsdoc/require-throws-type": "off",
            "jsdoc/require-yields": "warn", // Recommended
            "jsdoc/require-yields-check": "warn", // Recommended
            "jsdoc/require-yields-description": "warn",
            "jsdoc/require-yields-type": "warn", // Recommended
            "jsdoc/sort-tags": "off",
            "jsdoc/tag-lines": "off", // Recommended
            "jsdoc/text-escaping": [
                "warn",
                {
                    escapeHTML: true,
                },
            ],
            "jsdoc/ts-method-signature-style": "warn",
            "jsdoc/ts-no-empty-object-type": "warn",
            "jsdoc/ts-no-unnecessary-template-expression": "warn",
            "jsdoc/ts-prefer-function-type": "warn",
            "jsdoc/type-formatting": [
                "off",
                {
                    enableFixer: false,
                    objectFieldIndent: "  ",
                },
            ],
            "jsdoc/valid-types": "off", // Tooling scripts frequently use TS-style imports/types
            // "jsdoc/check-examples": "warn", // Deprecated and not for ESLint >= 8
            // "jsdoc/rejct-any-type": "warn", // broken
        },
        settings: {
            jsdoc: {
                // JS files in this repo use classic JSDoc.
                mode: "jsdoc",
            },
        },
    },
    // #endregion
    // #region 🧾 JS/MJS Configuration files
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: JS/MJS Configuration files
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: [
            "**/*.config.{js,mjs,cts,cjs}",
            "**/*.config.**.*.{js,mjs,cts,cjs}",
        ],
        languageOptions: {
            globals: {
                ...globals.node,
                __dirname: "readonly",
                __filename: "readonly",
                module: "readonly",
                process: "readonly",
                require: "readonly",
            },
        },
        name: "JS/MJS Config - **/*.config.{JS,MJS,CTS,CJS}",
        plugins: {
            "@typescript-eslint": tseslint,
            // Css: css,
            depend: depend,
            "import-x": importX,
            js: js,
            math: eslintPluginMath,
            n: nodePlugin,
            "no-unsanitized": nounsanitized,
            perfectionist: perfectionist,
            prettier: pluginPrettier,
            promise: pluginPromise,
            redos: pluginRedos,
            regexp: pluginRegexp,
            security: pluginSecurity,
            sonarjs: sonarjs,
            unicorn: eslintPluginUnicorn,
            "unused-imports": pluginUnusedImports,
        },
        rules: {
            ...js.configs.all.rules,
            ...pluginRegexp.configs.all.rules,
            ...importX.flatConfigs.recommended.rules,
            ...importX.flatConfigs.electron.rules,
            ...importX.flatConfigs.typescript.rules,
            ...pluginPromise.configs["flat/recommended"].rules,
            ...eslintPluginUnicorn.configs.all.rules,
            ...sonarjsConfigs.recommended.rules,
            ...perfectionist.configs["recommended-natural"].rules,
            ...pluginRedos.configs.recommended?.rules,
            ...pluginSecurity.configs.recommended.rules,
            ...nodePlugin.configs["flat/recommended"].rules,
            ...eslintPluginMath.configs.recommended.rules,

            camelcase: "off",
            "capitalized-comments": [
                "error",
                "always",
                {
                    ignoreConsecutiveComments: true,
                    ignoreInlineComments: true,
                    ignorePattern:
                        "pragma|ignored|import|prettier|eslint|tslint|copyright|license|eslint-disable|@ts-.*|jsx-a11y.*|@eslint.*|global|jsx|jsdoc|prettier|istanbul|jcoreio|metamask|microsoft|no-unsafe-optional-chaining|no-unnecessary-type-assertion|no-non-null-asserted-optional-chain|no-non-null-asserted-nullish-coalescing|@typescript-eslint.*|@docusaurus.*|@react.*|boundaries.*|depend.*|deprecation.*|etc.*|ex.*|functional.*|import-x.*|import-zod.*|jsx-a11y.*|loadable-imports.*|math.*|n.*|neverthrow.*|no-constructor-bind.*|no-explicit-type-exports.*|no-function-declare-after-return.*|no-lookahead-lookbehind-regexp.*|no-secrets.*|no-unary-plus.*|no-unawaited-dot-catch-throw.*|no-unsanitized.*|no-use-extend-native.*|observers.*|prefer-arrow.*|perfectionist.*|prettier.*|promise.*|react.*|react-hooks.*|react-hooks-addons.*|redos.*|regexp.*|require-jsdoc.*|safe-jsx.*|security.*|sonarjs.*|sort-class-members.*|sort-destructure-keys.*|sort-keys-fix.*|sql-template.*|ssr-friendly.*|styled-components-a11y.*|switch-case.*|total-functions.*|tsdoc.*|unicorn.*|unused-imports.*|usememo-recommendations.*|validate-jsx-nesting.*|write-good-comments.*|xss.*|v8.*|c8.*|istanbul.*|nyc.*|codecov.*|coveralls.*|c8-coverage.*|codecov-coverage.*",
                },
            ],
            "class-methods-use-this": "off",
            "dot-notation": "off",
            "func-style": "off",
            "id-length": "off",
            "max-classes-per-file": "off",
            "max-lines": "off",
            // Sonar quality helpers
            "max-lines-per-function": [
                "error",
                {
                    IIFEs: false,
                    max: 1000,
                    skipBlankLines: true,
                    skipComments: true,
                },
            ],
            "max-params": "off",
            "max-statements": "off",
            "no-console": "off",
            "no-inline-comments": "off",
            "no-magic-numbers": "off",
            "no-plusplus": "off",
            "no-ternary": "off",
            "no-undef-init": "off",
            "no-undefined": "off",
            "no-void": "off",
            "object-shorthand": "off",
            "one-var": "off",
            "perfectionist/sort-arrays": [
                "off",
                {
                    customGroups: [],
                    fallbackSort: { type: "unsorted" },
                    groups: ["literal"],
                    ignoreCase: true,
                    newlinesBetween: "ignore",
                    newlinesInside: "ignore",
                    order: "asc",
                    partitionByNewLine: false,
                    specialCharacters: "keep",
                    type: "natural",
                    useConfigurationIf: {
                        matchesAstSelector: "TSAsExpression > ArrayExpression",
                    },
                },
            ],
            "prefer-arrow-callback": [
                "warn",
                { allowNamedFunctions: true, allowUnboundThis: true },
            ],
            "require-await": "off",
            "require-unicode-regexp": "off",
            "sonarjs/arguments-usage": "warn",
            "sonarjs/array-constructor": "warn",
            "sonarjs/aws-iam-all-resources-accessible": "warn",
            "sonarjs/cognitive-complexity": ["warn", 30],
            "sonarjs/comment-regex": "warn",
            "sonarjs/declarations-in-global-scope": "off",
            "sonarjs/elseif-without-else": "off",
            "sonarjs/for-in": "warn",
            "sonarjs/nested-control-flow": "off",
            "sonarjs/no-built-in-override": "warn",
            "sonarjs/no-collapsible-if": "warn",
            "sonarjs/no-duplicate-string": "off",
            "sonarjs/no-for-in-iterable": "warn",
            "sonarjs/no-function-declaration-in-block": "warn",
            "sonarjs/no-implicit-dependencies": "warn",
            "sonarjs/no-inconsistent-returns": "warn",
            "sonarjs/no-incorrect-string-concat": "warn",
            "sonarjs/no-nested-incdec": "warn",
            "sonarjs/no-nested-switch": "warn",
            "sonarjs/no-reference-error": "warn",
            "sonarjs/no-require-or-define": "warn",
            "sonarjs/no-return-type-any": "warn",
            "sonarjs/no-sonar-comments": "error",
            "sonarjs/no-undefined-assignment": "off",
            "sonarjs/no-unused-function-argument": "warn",
            "sonarjs/non-number-in-arithmetic-expression": "warn",
            "sonarjs/operation-returning-nan": "warn",
            "sonarjs/prefer-immediate-return": "warn",
            "sonarjs/shorthand-property-grouping": "off",
            "sonarjs/strings-comparison": "warn",
            "sonarjs/too-many-break-or-continue-in-loop": "warn",
            "sort-imports": "off",
            "sort-keys": "off",
            "unicorn/consistent-function-scoping": "off", // Configs often use different scoping
            "unicorn/filename-case": "off", // Allow config files to have any case
            "unicorn/import-style": [
                "error",
                {
                    styles: {
                        fs: { default: false, named: true, namespace: true },
                        // ─────────────────────────────────────────────────────────────
                        // crypto: disallow default imports, allow named + namespace
                        // (named is most common; namespace is sometimes handy)
                        // ─────────────────────────────────────────────────────────────
                        "node:crypto": {
                            default: false,
                            named: true,
                            namespace: true,
                        },
                        // ─────────────────────────────────────────────────────────────
                        // Filesystem: disallow default imports, but allow named + namespace
                        // (named is ergonomic; namespace is useful for vi.spyOn(fs, "..."))
                        // ─────────────────────────────────────────────────────────────
                        "node:fs": {
                            default: false,
                            named: true,
                            namespace: true,
                        },
                        "node:fs/promises": {
                            default: false,
                            named: true,
                            namespace: true,
                        },
                        // ─────────────────────────────────────────────────────────────
                        // Node “path-like” modules: allow ONLY namespace imports
                        // (prevents `import path from "node:path"` which relies on default interop)
                        // ─────────────────────────────────────────────────────────────
                        "node:path": { default: false, namespace: true },
                        "node:path/posix": { default: false, namespace: true },
                        "node:path/win32": { default: false, namespace: true },
                        // ─────────────────────────────────────────────────────────────
                        // timers/promises: named is the common usage
                        // ─────────────────────────────────────────────────────────────
                        "node:timers/promises": { named: true },
                        // ─────────────────────────────────────────────────────────────
                        // util: keep unicorn’s intent (named only)
                        // ─────────────────────────────────────────────────────────────
                        "node:util": { named: true },
                        path: { default: false, namespace: true }, // Just in case any non-node: path remains
                        util: { named: true },
                    },
                },
            ],
            "unicorn/no-await-expression-member": "off", // Allow await in config expressions
            "unicorn/no-keyword-prefix": [
                "error",
                {
                    checkProperties: false,
                    disallowedPrefixes: [
                        "interface",
                        "type",
                        "enum",
                    ],
                },
            ], // Allow "class" prefix for className and other legitimate uses
            "unicorn/no-null": "off", // Null is common in config setups
            "unicorn/no-unused-properties": "off", // Allow unused properties in config setups
            "unicorn/no-useless-undefined": "off", // Allow undefined in config setups
            "unicorn/prevent-abbreviations": "off", // Too many false positives in configs
            "unused-imports/no-unused-imports": "error",
            "unused-imports/no-unused-vars": "error",
        },
        settings: {
            "import-x/resolver": {
                node: true,
            },
            n: {
                allowModules: [
                    "electron",
                    "node",
                    "electron-devtools-installer",
                ],
            },
        },
    },
    // #endregion
    // #region 🤖 GitHub Workflows YAML/YML
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: Github Workflows YAML/YML
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: [
            "**/.github/workflows/**/*.{yaml,yml}",
            "config/tools/flatpak-build.yml",
            "**/dependabot.yml",
            "**/.spellcheck.yml",
            "**/.pre-commit-config.yaml",
        ],
        name: "YAML/YML GitHub Workflows - Disables",
        rules: {
            "yml/block-mapping-colon-indicator-newline": "off",
            "yml/no-empty-key": "off",
            "yml/no-empty-mapping-value": "off",
            "yml/sort-keys": "off",
        },
    },
    // #endregion
    // #region 📴 Disables
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: Disables
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: ["**/package.json", "**/package-lock.json"],
        name: "JSON: Files - Disables",
        rules: {
            "json/sort-keys": "off",
        },
    },
    {
        files: ["**/.vscode/**"],
        name: "VS Code Files - Disables",
        rules: {
            "jsonc/array-bracket-newline": "off",
        },
    },
    // #endregion
    // #region 📐 @Stylistic Overrides
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: @Stylistic Overrides
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: ["**/**"],
        name: "Global: Stylistic Overrides",
        plugins: {
            "@stylistic": stylistic,
        },
        rules: {
            "@stylistic/curly-newline": "off",
            "@stylistic/exp-jsx-props-style": "off",
            "@stylistic/exp-list-style": "off",
            "@stylistic/jsx-curly-brace-presence": "off",
            "@stylistic/jsx-function-call-newline": "off",
            "@stylistic/jsx-pascal-case": "off",
            "@stylistic/jsx-self-closing-comp": "off",
            "@stylistic/line-comment-position": "off",
            "@stylistic/lines-between-class-members": "off",
            "@stylistic/multiline-comment-style": "off",
            "@stylistic/padding-line-between-statements": "off",
            "@stylistic/spaced-comment": [
                "error",
                "always",
                {
                    exceptions: ["-", "+"],
                },
            ],
        },
    },
    // #endregion
    // #region 🛠️ Global Overrides
    // ═══════════════════════════════════════════════════════════════════════════════
    // SECTION: Global Overrides
    // ═══════════════════════════════════════════════════════════════════════════════
    {
        files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,cts,mts}"],
        name: "Global: Globals",
        plugins: {
            canonical: pluginCanonical,
            "no-secrets": noSecrets,
            "no-unsanitized": nounsanitized,
        },
        rules: {
            "callback-return": "off",
            camelcase: "off",
            "canonical/destructuring-property-newline": "off",
            "canonical/export-specifier-newline": "off",
            "canonical/import-specifier-newline": "off",
            "capitalized-comments": [
                "error",
                "always",
                {
                    ignoreConsecutiveComments: true,
                    ignoreInlineComments: true,
                    ignorePattern:
                        "pragma|ignored|import|prettier|eslint|tslint|copyright|license|eslint-disable|@ts-.*|jsx-a11y.*|@eslint.*|global|jsx|jsdoc|prettier|istanbul|jcoreio|metamask|microsoft|no-unsafe-optional-chaining|no-unnecessary-type-assertion|no-non-null-asserted-optional-chain|no-non-null-asserted-nullish-coalescing|@typescript-eslint.*|@docusaurus.*|@react.*|boundaries.*|depend.*|deprecation.*|etc.*|ex.*|functional.*|import-x.*|import-zod.*|jsx-a11y.*|loadable-imports.*|math.*|n.*|neverthrow.*|no-constructor-bind.*|no-explicit-type-exports.*|no-function-declare-after-return.*|no-lookahead-lookbehind-regexp.*|no-secrets.*|no-unary-plus.*|no-unawaited-dot-catch-throw.*|no-unsanitized.*|no-use-extend-native.*|observers.*|prefer-arrow.*|perfectionist.*|prettier.*|promise.*|react.*|react-hooks.*|react-hooks-addons.*|redos.*|regexp.*|require-jsdoc.*|safe-jsx.*|security.*|sonarjs.*|sort-class-members.*|sort-destructure-keys.*|sort-keys-fix.*|sql-template.*|ssr-friendly.*|styled-components-a11y.*|switch-case.*|total-functions.*|tsdoc.*|unicorn.*|unused-imports.*|usememo-recommendations.*|validate-jsx-nesting.*|write-good-comments.*|xss.*|v8.*|c8.*|istanbul.*|nyc.*|codecov.*|coveralls.*|c8-coverage.*|codecov-coverage.*",
                },
            ],
            "class-methods-use-this": "off",
            "depend/ban-dependencies": "off",
            "dot-notation": "off",
            "github-actions/no-top-level-permissions": "off",
            // Deprecated rules - to be removed in future
            "id-length": "off",
            "max-classes-per-file": "off",
            "max-lines": "off",
            // Sonar quality helpers
            "max-lines-per-function": [
                "error",
                {
                    IIFEs: false,
                    max: 1000,
                    skipBlankLines: true,
                    skipComments: true,
                },
            ],
            "max-params": "off",
            "no-console": "off",
            "no-debugger": "error",
            "no-duplicate-imports": [
                "error",
                {
                    allowSeparateTypeImports: true,
                },
            ],
            "no-empty-character-class": "error",
            "no-inline-comments": "off",
            "no-invalid-regexp": "error",
            "no-magic-numbers": "off",
            "no-plusplus": "off",
            "no-secrets/no-pattern-match": "off",
            "no-secrets/no-secrets": [
                "error",
                {
                    tolerance: 5,
                },
            ],
            "no-ternary": "off",
            "no-undef-init": "off",
            "no-undefined": "off",
            "no-unexpected-multiline": "error",
            "no-unsanitized/method": "error",
            "no-unsanitized/property": "error",
            "no-useless-backreference": "error",
            "no-void": "off",
            "object-shorthand": "off",
            "one-var": "off",
            "prefer-arrow-callback": [
                "warn",
                { allowNamedFunctions: true, allowUnboundThis: true },
            ],
            "prettier/prettier": "off", // Using in Prettier directly for less noise for AI
            "require-await": "off",
            "require-unicode-regexp": "off",
            "sonarjs/different-types-comparison": "off",
        },
    },
    {
        files: [
            "**/*.test.{ts,tsx}",
            "**/*.spec.{ts,tsx}",
            "src/tests/**/*.{ts,tsx}",
            "{tests,test}/**/*.{ts,tsx}",
        ],
        name: "Tests: relax strict void rules",
        rules: {
            // This rule is extremely noisy in tests (especially property-based
            // tests) where callback return values are often incidental.
            "@typescript-eslint/strict-void-return": "off",
            "typedoc/require-exported-doc-comment": "off", // Tests often have non-exported members where doc comments would be low-value and high-effort.
        },
    },
    {
        files: [
            "benchmarks/**/*.{ts,tsx}",
            "scripts/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}",
        ],
        name: "Benchmarks/Scripts: relax strict void rules",
        rules: {
            // Benchmarks frequently return measurement values from callbacks.
            // Scripts commonly use void/Promise-returning callbacks where the
            // return value is intentionally ignored.
            "@typescript-eslint/strict-void-return": "off",
            "typedoc/require-exported-doc-comment": "off", // Benchmarks and scripts often have non-exported members where doc comments would be low-value and high-effort.
        },
    },
    {
        files: ["plugin.mjs", "src/**/*.{ts,tsx,mts,cts,js,mjs,cjs}"],
        name: "Source runtime logging policy",
        rules: {
            // Runtime/library code should not emit console output.
            "no-console": "error",
            // Keep explicit in source scope even though this is also configured
            // globally for defense-in-depth.
            "no-debugger": "error",
        },
    },
    // #endregion
    // #region 🧹 Prettier Disable Config
    eslintConfigPrettier,
    // #endregion
]);
