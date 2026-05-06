import nick2bad4u from "eslint-config-nick2bad4u";

/** @type {import("eslint").Linter.Config[]} */
const config = [
    ...nick2bad4u.configs.all,

    // Exclude Jekyll template fragments from ESLint.
    // These HTML includes/layouts use Liquid syntax and HTML comments that
    // are incompatible with JS/TS linting rules (e.g. @stylistic/spaced-comment
    // crashes on <!-- --> HTML comment syntax).
    {
        ignores: ["_includes/**", "_layouts/**"],
    },

    // Parser/printer rely heavily on hoisted function declarations for readability.
    // Treat function declarations as safe while retaining checks for variables/classes.
    {
        files: ["src/parser.ts", "src/printer.ts"],
        rules: {
            "@typescript-eslint/no-use-before-define": [
                "warn",
                {
                    classes: true,
                    functions: false,
                    typedefs: true,
                    variables: true,
                },
            ],
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
