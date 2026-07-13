import nickTwoBadFourU from "eslint-config-nick2bad4u";

/** @type {import("eslint").Linter.Config[]} */
const config = [
    ...nickTwoBadFourU.configs.all,

    // Exclude Jekyll template fragments from ESLint.
    // These HTML includes/layouts use Liquid syntax and HTML comments that
    // are incompatible with JS/TS linting rules (e.g. @stylistic/spaced-comment
    // crashes on <!-- --> HTML comment syntax).
    {
        ignores: ["_includes/**", "_layouts/**"],
    },

    // Use the TypeScript-aware rule for .ts files and keep variable/class checks.
    // Function declarations are intentionally hoisted in parser/printer internals.
    {
        files: ["**/*.ts"],
        rules: {
            "@typescript-eslint/no-use-before-define": [
                "error",
                {
                    classes: true,
                    functions: false,
                    typedefs: true,
                    variables: true,
                },
            ],
            "no-use-before-define": "off",
        },
    },

    // Parser public methods are grouped for the TypeScript member-ordering rule;
    // Unicorn's class-order rule conflicts with that ordering for this class.
    {
        files: ["src/parser.ts"],
        rules: {
            "unicorn/consistent-class-member-order": "off",
        },
    },

    // Property tests intentionally build deeply nested Fast-Check arbitraries,
    // parse integer environment knobs, and exercise edge runtime state.
    {
        files: [
            "tests/**/*.ts",
            "tests/property/**/*.ts",
            "vitest.config.ts",
        ],
        rules: {
            "n/no-process-env": "off",
            "unicorn/max-nested-calls": "off",
            "unicorn/prefer-number-coercion": "off",
            "unicorn/prefer-number-is-safe-integer": "off",
            "unicorn/try-complexity": "off",
        },
    },

    // The PowerShell validation helper owns a persistent child process and
    // module-level counters by design so property tests can amortize parser
    // startup cost.
    {
        files: ["tests/utils/powershell.ts"],
        rules: {
            // Error.isError is a standard static method in supported Node
            // versions; canonical currently misclassifies it as native
            // extension.
            "canonical/no-use-extend-native": "off",
            "unicorn/no-top-level-assignment-in-function": "off",
            "unicorn/no-top-level-side-effects": "off",
            "unicorn/prefer-top-level-await": "off",
        },
    },

    // Error.isError preserves cross-realm error detection in this network
    // helper; canonical currently misclassifies the standard static method.
    {
        files: ["tests/github-samples.property.test.ts"],
        rules: {
            "canonical/no-use-extend-native": "off",
        },
    },

    // Error tests deliberately probe Node's non-standard stack-capture API.
    {
        files: ["tests/errors.detailed.test.ts"],
        rules: {
            "unicorn/no-nonstandard-builtin-properties": "off",
        },
    },

    // The mock child process mirrors Node EventEmitter and stream state rather
    // than a production domain model, so production class-order preferences do
    // not improve readability here.
    {
        files: ["tests/utils/powershell-utils.test.ts"],
        rules: {
            "unicorn/consistent-class-member-order": "off",
        },
    },

    // Standalone benchmark/profile scripts are intentionally lightweight runtime
    // tooling; strict TS-only linting rules are noisy and not actionable here.
    {
        files: ["benchmark.mjs", "profile-*.mjs"],
        rules: {
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
        },
    },
];

export default config;
